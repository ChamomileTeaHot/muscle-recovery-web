import test from 'node:test';
import assert from 'node:assert/strict';
import { growthLms, growthZ, growthValue, youthGrowthScenario } from '../lib/youth-growth.ts';
import data from '../lib/growth-reference.json' with { type: 'json' };

const input = { years: 14, months: 3, height: 160, weight: 50, sex: 'male', horizon: 6 };
test('bundled official WHO tables cover every month without gaps', () => {
  for (const sex of ['male', 'female']) for (const indicator of ['height', 'bmi']) {
    const rows = data[sex][indicator];
    assert.equal(rows.length, 168);
    rows.forEach(([month, l, m, s], i) => { assert.equal(month, 61 + i); assert.ok([l,m,s].every(Number.isFinite)); assert.ok(m > 0 && s > 0); });
  }
});
test('matches WHO published worked BMI example: boy age 9, BMI 19, z approximately 1.47', () => {
  assert.deepEqual(growthLms('male', 'bmi', 108), { l: -1.6318, m: 16.049, s: 0.10038 });
  assert.ok(Math.abs(growthZ(19, growthLms('male', 'bmi', 108)) - 1.47) < 0.01);
});
test('median input follows each future median and exactly anchors measured weight', () => {
  for (const sex of ['male', 'female']) {
    const height = growthLms(sex, 'height', 144).m, bmi = growthLms(sex, 'bmi', 144).m;
    const weight = bmi * (height / 100) ** 2;
    const r = youthGrowthScenario({ ...input, years: 12, months: 0, height, weight, sex, horizon: 12 });
    assert.ok(Math.abs(r.points[0].weight - weight) < 1e-10);
    assert.equal(r.points[0].measured, weight);
    for (const p of r.points) {
      assert.ok(Math.abs(p.height - growthLms(sex, 'height', 144 + p.month).m) < 1e-10);
      assert.ok(Math.abs(p.weight - growthLms(sex, 'bmi', 144 + p.month).m * (p.height / 100) ** 2) < 1e-10);
      if (p.month) assert.equal(p.measured, null);
    }
  }
});
test('sex, age and duration affect the scenario; the data range includes last minor month', () => {
  const a = youthGrowthScenario(input), b = youthGrowthScenario({ ...input, sex: 'female' });
  assert.equal(a.points.length, 7);
  assert.notEqual(a.points.at(-1).weight, b.points.at(-1).weight);
  const h = growthLms('female', 'height', 215).m, w = growthLms('female', 'bmi', 215).m * (h/100)**2;
  assert.equal(youthGrowthScenario({ ...input, years:17, months:11, sex:'female', height:h, weight:w, horizon:12 }).points.length, 13);
});
test('rejects missing, invalid, adult, unsupported young ages and extremes instead of clamping', () => {
  for (const change of [{years:18}, {years:5,months:0}, {years:14.5}, {months:12}, {weight:NaN}, {height:0}, {sex:'unknown'}, {horizon:24}, {weight:300}]) {
    assert.throws(() => youthGrowthScenario({ ...input, ...change }));
  }
  assert.throws(() => growthLms('male', 'height', 229));
  assert.throws(() => growthLms('female', 'height', 60));
});
test('LMS round trip remains finite at supported z boundaries and L=0', () => {
  for (const sex of ['male','female']) for (const indicator of ['height','bmi']) for (const month of [61,144,228]) {
    const lms = growthLms(sex,indicator,month);
    for (const z of [-3,0,3]) assert.ok(Math.abs(growthZ(growthValue(z,lms),lms)-z)<1e-10);
  }
  const logLms = { l:0, m:20, s:0.1 };
  assert.ok(Math.abs(growthZ(growthValue(1,logLms),logLms)-1)<1e-10);
});
