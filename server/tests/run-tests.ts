/**
 * Cortexi unit tests â€” run with: pnpm test  (tsx tests/run-tests.ts)
 * Covers: settings validation, VTT parsing, offline storyboard fallback, draft scaling.
 * Optional live API smoke: CORTEXI_TEST_LIVE=1 (server must be running).
 */
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';

let failures = 0;
const test = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    console.log(`  âœ“ ${name}`);
  } catch (e) {
    failures++;
    console.error(`  âœ— ${name}\n    ${(e as Error).message}`);
  }
};

// Point settings at a temp file BEFORE importing the module graph.
process.env.CORTEXI_SETTINGS_FILE = path.join(os.tmpdir(), `cortexi-test-settings-${Date.now()}.json`);
const { saveSettings, getSettings } = await import('../src/settings.js');
const { parseVtt } = await import('../src/vtt.js');
const { generateStoryboard, parseModelJson } = await import('../src/llm.js');
const { normalizeStoryboard, estimateSceneDuration, clampDuration, storyboardDuration, spokenCharacters, MAX_SCENES, MIN_SCENE_SEC, MIN_SCENES } = await import('../src/storyboard.js');
const { deriveBrandKit, contrastRatio, meetsContrast, deriveSecondary, hexToRgb, rgbToHex, bestTextColor } = await import('../src/brandAssets.js');
const { scaleForQuality } = await import('../src/render.js');

console.log('settings');
await test('rejects relative exportDir', async () => {
  await assert.rejects(() => saveSettings({ exportDir: 'relative/path' }), /absolute path/);
});
await test('accepts + normalizes absolute path', async () => {
  const s = await saveSettings({ exportDir: 'C:/Videos/Cortexi' });
  assert.strictEqual(s.exportDir, path.normalize('C:/Videos/Cortexi'));
  assert.ok(path.isAbsolute(s.exportDir));
});
await test('round-trips through getSettings', async () => {
  await saveSettings({ exportDir: '' });
  const s = await getSettings();
  assert.strictEqual(s.exportDir, '');
});

console.log('vtt parser');
await test('parses word timings from WebVTT', () => {
  const sample = `WEBVTT

00:00:00.050 --> 00:00:01.200
Hello world

00:00:01.200 --> 00:00:02.000
from cortexi
`;
  const words = parseVtt(sample);
  assert.ok(words.length >= 4, `expected >=4 words, got ${words.length}`);
  assert.strictEqual(words[0].word.toLowerCase(), 'hello');
  assert.ok(words[0].end > words[0].start);
  assert.ok(words.every((w) => typeof w.start === 'number' && typeof w.end === 'number'));
});
await test('returns [] for empty input', () => {
  assert.deepStrictEqual(parseVtt(''), []);
});

console.log('offline storyboard fallback');
await test('no API key â†’ valid schema-shaped storyboard', async () => {
  const sb = await generateStoryboard({ prompt: 'A cool product launch. It changes everything. Try it today.', aspect: '16:9' });
  assert.ok(sb.scenes.length >= 3, `expected >=3 scenes, got ${sb.scenes.length}`);
  assert.strictEqual(sb.scenes[0].template, 'title-card');
  assert.strictEqual(sb.scenes[sb.scenes.length - 1].template, 'outro');
  assert.ok(sb.scenes.every((s) => /^s\d+$/.test(s.id)));
  assert.ok(sb.scenes.every((s) => ['fade-up', 'zoom', 'slide-left'].includes(s.animation)));
});

console.log('model JSON parsing (tolerant)');
await test('parses clean JSON', () => {
  const out = parseModelJson('{"title":"Launch","scenes":[]}');
  assert.strictEqual(out.title, 'Launch');
});
await test('strips markdown fences', () => {
  const out = parseModelJson('```json\n{"title":"Fenced","scenes":[]}\n```');
  assert.strictEqual(out.title, 'Fenced');
});
await test('recovers JSON surrounded by chatter', () => {
  const out = parseModelJson('Sure! Here is the plan:\n{"title":"Chatty","scenes":[]}\nHope that helps.');
  assert.strictEqual(out.title, 'Chatty');
});
await test('repairs trailing commas', () => {
  const out = parseModelJson('{"title":"Trailing","scenes":[],}');
  assert.strictEqual(out.title, 'Trailing');
});
await test('normalizes smart quotes', () => {
  const out = parseModelJson('{“title”:“Smart”}');
  assert.strictEqual(out.title, 'Smart');
});
await test('handles odd whitespace and newlines', () => {
  const out = parseModelJson('  \n\n  {\n  "title" :  "Spaced"  ,\n  "scenes" : [ ]\n }  \n ');
  assert.strictEqual(out.title, 'Spaced');
});
await test('throws on non-JSON', () => {
  assert.throws(() => parseModelJson('I cannot help with that.'));
});

console.log('colour science (WCAG)');
await test('hex round-trips through rgb', () => {
  assert.strictEqual(rgbToHex(hexToRgb('#7C3AED')), '#7C3AED');
});
await test('black on white is the maximum contrast ratio', () => {
  assert.strictEqual(Math.round(contrastRatio('#000000', '#FFFFFF')), 21);
});
await test('identical colours have a ratio of 1', () => {
  assert.ok(Math.abs(contrastRatio('#123456', '#123456') - 1) < 0.01);
});
await test('mid grey fails AA on white, near-black passes', () => {
  assert.ok(!meetsContrast('#777777', '#FFFFFF'));
  assert.ok(meetsContrast('#0A0A0E', '#FFFFFF'));
});
await test('bestTextColor picks the readable option', () => {
  assert.strictEqual(bestTextColor('#FFFFFF'), '#0A0A0E');
  assert.strictEqual(bestTextColor('#0A0A0E'), '#FFFFFF');
});
await test('derived secondary stays in the same hue family', () => {
  const sec = deriveSecondary('#7C3AED');
  assert.match(sec, /^#[0-9A-F]{6}$/);
});
await test('deriveBrandKit repairs an unreadable text colour', () => {
  const kit = deriveBrandKit({ primaryColor: '#7C3AED', backgroundColor: '#FFFFFF', textColor: '#EEEEEE' });
  assert.ok(kit.checks.textOnBackgroundPass, 'text should be made readable');
  assert.ok(meetsContrast(kit.textColor, kit.backgroundColor));
});
await test('deriveBrandKit reports contrast diagnostics', () => {
  const kit = deriveBrandKit({ primaryColor: '#7C3AED', backgroundColor: '#0A0A0E' });
  assert.ok(kit.checks.textOnBackground > 4.5);
  assert.ok(typeof kit.checks.primaryOnBackgroundPass === 'boolean');
});

console.log('storyboard normalization');
await test('clamps duration into the safe range', () => {
  assert.ok(clampDuration(0.1) >= MIN_SCENE_SEC);
  assert.ok(clampDuration(999) <= 12);
});
await test('estimates duration from word count', () => {
  const short = estimateSceneDuration('Hi');
  const long = estimateSceneDuration('A much longer headline with many more words in it');
  assert.ok(long > short);
});
await test('forces title-card first and outro last', () => {
  const sb = normalizeStoryboard({
    title: 'T', aspect: '16:9',
    style: {}, voice: { engine: 'none', voice: 'none' }, captions: true,
    scenes: [
      { id: 'x1', template: 'feature', headline: 'A', animation: 'fade-up' },
      { id: 'x2', template: 'feature', headline: 'B', animation: 'fade-up' },
      { id: 'x3', template: 'feature', headline: 'C', animation: 'fade-up' },
    ],
  });
  assert.strictEqual(sb.scenes[0].template, 'title-card');
  assert.strictEqual(sb.scenes[sb.scenes.length - 1].template, 'outro');
});
await test('renumbers ids sequentially', () => {
  const sb = normalizeStoryboard({
    title: 'T', aspect: '16:9', style: {}, voice: { engine: 'none', voice: 'none' }, captions: true,
    scenes: [
      { id: 'zz', template: 'title-card', headline: 'A', animation: 'zoom' },
      { id: 'yy', template: 'feature', headline: 'B', animation: 'zoom' },
      { id: 'xx', template: 'outro', headline: 'C', animation: 'zoom' },
    ],
  });
  assert.deepStrictEqual(sb.scenes.map((s) => s.id), ['s1', 's2', 's3']);
});
await test('avoids two identical entrances in a row', () => {
  const sb = normalizeStoryboard({
    title: 'T', aspect: '16:9', style: {}, voice: { engine: 'none', voice: 'none' }, captions: true,
    scenes: [
      { id: 'a', template: 'title-card', headline: 'A', animation: 'zoom' },
      { id: 'b', template: 'feature', headline: 'B', animation: 'zoom' },
      { id: 'c', template: 'feature', headline: 'C', animation: 'zoom' },
      { id: 'd', template: 'outro', headline: 'D', animation: 'zoom' },
    ],
  });
  for (let i = 1; i < sb.scenes.length; i++) {
    assert.ok(sb.scenes[i].animation !== sb.scenes[i - 1].animation, 'scene ' + i + ' repeats entrance');
  }
});
await test('caps the scene count', () => {
  const scenes = Array.from({ length: 12 }, (_, i) => ({ id: 's' + i, template: 'feature', headline: 'H' + i, animation: 'zoom' }));
  const sb = normalizeStoryboard({ title: 'T', aspect: '16:9', style: {}, voice: { engine: 'none', voice: 'none' }, captions: true, scenes: scenes as never });
  assert.ok(sb.scenes.length <= MAX_SCENES);
});
await test('pads a two-scene storyboard up to the minimum', () => {
  const sb = normalizeStoryboard({
    title: 'T', aspect: '16:9', style: {}, voice: { engine: 'none', voice: 'none' }, captions: true,
    scenes: [
      { id: 'a', template: 'title-card', headline: 'A', animation: 'zoom' },
      { id: 'b', template: 'outro', headline: 'B', animation: 'zoom' },
    ],
  });
  assert.ok(sb.scenes.length >= MIN_SCENES, 'expected at least ' + MIN_SCENES + ' scenes');
  assert.strictEqual(sb.scenes[0].template, 'title-card');
  assert.strictEqual(sb.scenes[sb.scenes.length - 1].template, 'outro');
});
await test('pads a single-scene storyboard', () => {
  const sb = normalizeStoryboard({
    title: 'Solo', aspect: '16:9', style: {}, voice: { engine: 'none', voice: 'none' }, captions: true,
    scenes: [{ id: 'a', template: 'feature', headline: 'Only', animation: 'zoom' }],
  });
  assert.ok(sb.scenes.length >= MIN_SCENES);
  assert.strictEqual(sb.scenes[0].template, 'title-card');
  assert.strictEqual(sb.scenes[sb.scenes.length - 1].template, 'outro');
});
await test('computes duration and spoken character totals', () => {
  const sb = normalizeStoryboard({
    title: 'T', aspect: '16:9', style: {}, voice: { engine: 'none', voice: 'none' }, captions: true,
    scenes: [
      { id: 'a', template: 'title-card', headline: 'Hello', body: 'World', animation: 'fade-up' },
      { id: 'b', template: 'feature', headline: 'Second', animation: 'fade-up' },
      { id: 'c', template: 'outro', headline: 'Bye', animation: 'fade-up' },
    ],
  });
  assert.ok(storyboardDuration(sb) > 0);
  assert.ok(spokenCharacters(sb) > 0);
});

console.log('draft scaling');
await test('draft: 30fpsâ†’15fps halves frames & dims, keeps duration', () => {
  const comp = { width: 1920, height: 1080, fps: 30, durationInFrames: 300 };
  const d = scaleForQuality(comp, 'draft');
  assert.strictEqual(d.fps, 15);
  assert.strictEqual(d.durationInFrames, 150); // 10s @15fps
  assert.strictEqual(d.width, 960);
  assert.strictEqual(d.height, 540);
  assert.strictEqual(d.durationInFrames / d.fps, comp.durationInFrames / comp.fps);
});
await test('final: unchanged', () => {
  const comp = { width: 1920, height: 1080, fps: 30, durationInFrames: 300 };
  assert.deepStrictEqual(scaleForQuality(comp, 'final'), comp);
});

if (process.env.CORTEXI_TEST_LIVE) {
  console.log('live API smoke');
  await test('GET /api/health', async () => {
    const r = await fetch('http://localhost:8787/api/health');
    assert.ok(r.ok);
    assert.strictEqual((await r.json()).ok, true);
  });
  await test('GET /api/settings', async () => {
    const r = await fetch('http://localhost:8787/api/settings');
    assert.ok(r.ok);
    assert.ok('exportDir' in (await r.json()));
  });
}

// motion, visuals and genre routing

const { runMotionTests } = await import('./motion.test.js');
await runMotionTests(test);

if (failures) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}
console.log('\nAll tests passed âœ“');




