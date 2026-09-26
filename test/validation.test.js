import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateThickness,
  validateAngle,
  validateVelocity,
  validateSoundPath,
  validateGeometryParams,
  normalizeConfigName,
} from '../src/validation.js';
import { ValidationError } from '../src/errors.js';

describe('非法参数拦截（在进入三角函数之前打回）', () => {
  test('板厚不为正一律拒绝并说明原因', () => {
    for (const bad of [0, -1, -0.001]) {
      assert.throws(() => validateThickness(bad), (e) =>
        e instanceof ValidationError && e.details[0].field === 'thickness');
    }
    for (const bad of [NaN, Infinity, '20', null, undefined]) {
      assert.throws(() => validateThickness(bad), ValidationError);
    }
    assert.equal(validateThickness(20), true);
  });

  test('折射角必须落在 (0, 90) 开区间，90 度贴板退化情形被挡', () => {
    for (const bad of [0, -15, 90, 91, 180, NaN, Infinity]) {
      assert.throws(() => validateAngle(bad), (e) =>
        e instanceof ValidationError && e.details[0].field === 'angleDeg',
        `角度 ${bad} 应被拒绝`);
    }
    // 90 度的错误信息必须点出声束贴板、走不出折线。
    try {
      validateAngle(90);
      assert.fail('90 度必须抛错');
    } catch (e) {
      assert.match(e.details[0].message, /贴|90/);
    }
    assert.equal(validateAngle(45), true);
    assert.equal(validateAngle(1e-9), true);
    assert.equal(validateAngle(89.999), true);
  });

  test('声速必须为正', () => {
    for (const bad of [0, -3200, NaN, undefined, '5900']) {
      assert.throws(() => validateVelocity(bad), (e) =>
        e instanceof ValidationError && e.details[0].field === 'velocity');
    }
    assert.equal(validateVelocity(5900), true);
  });

  test('回波声程为负被拒绝，零读数合法（探头入射点）', () => {
    assert.throws(() => validateSoundPath(-0.01), (e) =>
      e instanceof ValidationError && e.details[0].field === 'soundPath');
    assert.equal(validateSoundPath(0), true);
    assert.equal(validateSoundPath(12.5), true);
  });

  test('整体校验一次性收集全部问题，绝不走到除以余弦为零那一步', () => {
    try {
      validateGeometryParams({ thickness: 0, angleDeg: 90, velocity: -1 });
      assert.fail('应抛 ValidationError');
    } catch (e) {
      assert.ok(e instanceof ValidationError);
      const fields = e.details.map((d) => d.field).sort();
      assert.deepEqual(fields, ['angleDeg', 'thickness', 'velocity']);
    }
    assert.throws(
      () => validateGeometryParams({ thickness: 10, angleDeg: 90, velocity: 3200 }),
      (e) => e.details.some((d) => d.field === 'angleDeg')
    );
  });

  test('配置名规范化：去空白、拒绝空白名与超长名', () => {
    assert.equal(normalizeConfigName('  steel-20  '), 'steel-20');
    assert.throws(() => normalizeConfigName('   '), ValidationError);
    assert.throws(() => normalizeConfigName('x'.repeat(65)), ValidationError);
    assert.equal(normalizeConfigName('a'.repeat(64)).length, 64);
  });
});
