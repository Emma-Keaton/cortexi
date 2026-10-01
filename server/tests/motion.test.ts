import assert from 'node:assert';
import { ease, spring, sample, SPRINGS, staggerFor, mixHex, parseHex, luminance, beatTimeline } from '../../shared/motion.js';
import { formatValue, visualKinds, iconNames, ICON_ROTATION } from '../../shared/visuals.js';
import { classifyGenre, motionBrief, ICON_SET } from '../src/motionBrief.js';

type Test = (name: string, fn: () => Promise<void> | void) => Promise<void>;

/** Uses the same harness and failure counter as run-tests. */
export async function runMotionTests(test: Test): Promise<void> {
  console.log('motion');
  await test('ease() is anchored at 0 and 1 for every curve', () => {
    for (const name of ['enter', 'exit', 'move', 'playful', 'soft', 'snap']) {
      assert.ok(Math.abs(ease(name)(0)) < 1e-6, `${name} must start at 0`);
      assert.ok(Math.abs(ease(name)(1) - 1) < 1e-6, `${name} must end at 1`);
    }
  });
  await test('ease() is monotonic for non-overshooting curves', () => {
    for (const name of ['enter', 'exit', 'move', 'soft', 'snap']) {
      const f = ease(name);
      for (let x = 0.05; x < 1; x += 0.05) {
        assert.ok(f(x) >= f(x - 0.05) - 1e-9, `${name} dipped at ${x}`);
      }
    }
  });
  await test('playful overshoots past 1, the others do not', () => {
    let peak = 0;
    for (let x = 0; x <= 1; x += 0.01) peak = Math.max(peak, ease('playful')(x));
    assert.ok(peak > 1.02, 'playful should overshoot, got ' + peak);
    assert.ok(ease('enter')(0.6) <= 1, 'enter must not overshoot');
  });
  await test('spring overshoots only when underdamped', () => {
    // Sample the first peak, not t=5s: by then the spring has long settled, so
    // testing late would pass even for a solver with no overshoot at all.
    const peakOver = (cfg: SPRINGS[string] extends never ? never : Parameters<typeof spring>[1]) => {
      let peak = 0;
      for (let t = 0; t <= 1.2; t += 0.005) peak = Math.max(peak, spring(t, cfg));
      return peak;
    };
    assert.ok(peakOver(SPRINGS.pop) > 1.02, 'pop should overshoot');
    assert.ok(peakOver(SPRINGS.enter) > 1.01, 'enter should overshoot slightly');
    assert.ok(peakOver(SPRINGS.settle) < 1.001, 'settle must not overshoot');
    assert.equal(spring(0, SPRINGS.pop), 0);
    assert.equal(spring(-1, SPRINGS.pop), 0, 'negative time clamps to 0');
  });
  await test('spring is order-independent: same input, same output', () => {
    // The property an integrator would fail. This is why the solver is
    // closed-form rather than stepped: reproducibility depends on it.
    const times = [0.1, 0.5, 0.9, 1.4];
    const forward = times.map((t) => spring(t, SPRINGS.enter));
    const backward = times.slice().reverse().map((t) => spring(t, SPRINGS.enter)).reverse();
    for (let i = 0; i < times.length; i++) assert.equal(forward[i], backward[i], 'drifted at ' + times[i]);
  });
  await test('sample() holds at the endpoints and interpolates between', () => {
    const spec = { duration: 400, ease: 'enter' as const };
    assert.equal(sample(spec, 0), 0);
    assert.equal(sample(spec, 400), 1);
    assert.equal(sample(spec, 800), 1, 'past the end it stays at the target');
    assert.ok(sample(spec, 200) > 0 && sample(spec, 200) < 1);
  });
  await test('sample() honours delay', () => {
    const spec = { duration: 200, delay: 100, ease: 'linear' as const };
    assert.equal(sample(spec, 50), 0);
    assert.ok(Math.abs(sample(spec, 200) - 0.5) < 1e-9);
  });
  await test('stagger shrinks as items multiply, and is zero for one', () => {
    assert.equal(staggerFor(1, 30), 0);
    assert.ok(staggerFor(3, 30) > staggerFor(12, 30), 'dense groups need a smaller offset');
    assert.ok(staggerFor(3, 30) / (1000 / 30) <= 9, 'stagger must stay under ~9 frames');
  });
  await test('beatTimeline sequences beats without overlapping', () => {
    const beats = beatTimeline(4, 2000, 30);
    assert.equal(beats.length, 4);
    for (let i = 1; i < beats.length; i++) {
      const prevEnd = (beats[i - 1].delay ?? 0) + beats[i - 1].duration;
      assert.ok(beats[i].delay >= prevEnd - 1e-6, 'beat ' + i + ' starts before the last ended');
    }
  });
  await test('colour helpers round-trip and mix', () => {
    assert.deepEqual(parseHex('#fff'), { r: 255, g: 255, b: 255 });
    assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
    assert.ok(luminance('#ffffff') > luminance('#808080'));
    assert.ok(luminance('#000000') < luminance('#ffffff'));
  });
  await visualTests(test);
}

async function visualTests(test: Test): Promise<void> {
  console.log('visuals');
  await test('formatValue rounds before formatting', () => {
    assert.equal(formatValue(1287.4), '1,287');
    assert.equal(formatValue(0.421, 'percent'), '42%');
    assert.equal(formatValue(42, 'percent'), '42%');
    assert.equal(formatValue(12840, 'compact'), '13k', 'five figures round to keep the label short');
    assert.equal(formatValue(120000, 'compact'), '120k');
    assert.equal(formatValue(12500, 'currency'), '$12,500');
    assert.equal(formatValue(0.5, 'percent', '', ' of teams'), '50% of teams');
  });
  await test('every visual kind has a drawer', () => {
    const kinds = visualKinds();
    for (const k of ['stat-counter', 'bar-chart', 'line-chart', 'donut', 'step-flow', 'ui-frame']) {
      assert.ok(kinds.includes(k), 'missing visual: ' + k);
    }
  });
  await test('every icon referenced anywhere actually exists', () => {
    for (const i of ICON_ROTATION) assert.ok(iconNames().includes(i), 'unknown rotation icon: ' + i);
    for (const i of ICON_SET) assert.ok(iconNames().includes(i), 'brief advertises unknown icon: ' + i);
  });
  await test('prompts route to the right genre', () => {
    assert.equal(classifyGenre('our revenue growth and retention stats'), 'data');
    assert.equal(classifyGenre('launch video for a new analytics dashboard app'), 'product');
    assert.equal(classifyGenre('how to connect slack in three steps'), 'tutorial');
    assert.equal(classifyGenre('announcing the new release, now live'), 'launch');
    assert.equal(classifyGenre('the story behind our founder'), 'brand');
    assert.equal(classifyGenre('make me something nice'), 'general');
  });
  await test('the brief documents every visual and forbids invented data', () => {
    const brief = motionBrief('data');
    for (const k of visualKinds()) assert.ok(brief.includes(k), 'brief omits visual: ' + k);
    for (const i of ICON_SET) assert.ok(brief.includes(i), 'brief omits icon: ' + i);
    assert.ok(brief.includes('NEVER invent data'), 'the honesty rule must be stated');
    assert.ok(brief.includes('Lucide'), 'the icon package must be named');
  });
}