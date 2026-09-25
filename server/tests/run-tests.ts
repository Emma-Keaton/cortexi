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

if (failures) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}
console.log('\nAll tests passed âœ“');

