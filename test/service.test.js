import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigStore } from '../src/configStore.js';
import { skipReport, echoReport } from '../src/service.js';
import { ValidationError } from '../src/errors.js';

const approx = (actual, expected, tol = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `期望 ${expected}，实际 ${actual}，容差 ${tol}`);

const STEEL_V = 5_900_000; // 固定声速（mm/s），45 度基准算例

describe('服务编排：skip 报表', () => {
  const store = new ConfigStore();

  test('45 度基准：skip 声程 = 2T/cos45，地面距离 = 2T*tan45', () => {
    const r = skipReport({ thickness: 20, angleDeg: 45, velocity: STEEL_V });
    approx(r.stages.halfSkip.soundPath, 20 * Math.SQRT2);
    approx(r.stages.oneSkip.soundPath, 40 * Math.SQRT2);
    approx(r.stages.oneSkip.groundDistance, 40);
    approx(r.stages.oneAndHalfSkip.soundPath, 60 * Math.SQRT2);
    approx(r.stages.oneAndHalfSkip.groundDistance, 60);
    assert.equal(r.stages.oneSkip.reflections, 2);
    assert.equal(r.stages.oneAndHalfSkip.reflections, 3);
    // 飞行时间 = 声程 / 声速，单位与输入自洽（输出截 9 位小数）。
    approx(r.stages.oneSkip.timeOfFlight, (40 * Math.SQRT2) / STEEL_V, 1e-9);
  });

  test('配置驱动：两套配置各自独立核算', () => {
    store.put('thin', { thickness: 10, angleDeg: 45, velocity: STEEL_V });
    store.put('thick', { thickness: 20, angleDeg: 60, velocity: 3_200_000 });

    const thin = skipReport({ configName: 'thin' }, store);
    const thick = skipReport({ configName: 'thick' }, store);
    approx(thin.stages.oneSkip.soundPath, 20 * Math.SQRT2);
    approx(thick.stages.oneSkip.soundPath, 80); // 40/cos60
    approx(thick.stages.oneSkip.groundDistance, 40 * Math.sqrt(3));

    // 行内覆盖只对本次调用生效，配置本身不变。
    const override = skipReport({ configName: 'thin', angleDeg: 60 }, store);
    approx(override.stages.oneSkip.soundPath, 40);
    assert.equal(store.get('thin').angleDeg, 45);
  });

  test('非法输入在编排层被带原因拒绝', () => {
    assert.throws(
      () => skipReport({ thickness: -5, angleDeg: 45, velocity: STEEL_V }),
      ValidationError
    );
    assert.throws(
      () => skipReport({ thickness: 10, angleDeg: 90, velocity: STEEL_V }),
      ValidationError
    );
  });
});

describe('服务编排：回波反推', () => {
  const store = new ConfigStore();
  store.put('steel-20', { thickness: 20, angleDeg: 45, velocity: STEEL_V });
  const L = 20 * Math.SQRT2;

  test('半 skip 到一 skip 的读数走相似三角形返跨，埋深几何自洽', () => {
    const r = echoReport({ configName: 'steel-20', soundPath: 1.5 * L }, store);
    approx(r.echo.depth, 10, 1e-9);
    assert.equal(r.echo.reflections, 1);
    assert.equal(r.echo.similarTriangleReturnLeg, true);
    approx(r.echo.returnLegDepth, 10, 1e-9);
  });

  test('超过两个 skip 的读数：反射次数按折回计入，埋深不等于总声程', () => {
    const r = echoReport({ configName: 'steel-20', soundPath: 4.5 * L }, store);
    approx(r.echo.depth, 10, 1e-9);
    assert.equal(r.echo.reflections, 4);
    assert.equal(r.echo.completedSkips, 2);
    assert.match(r.echo.note, /折回/);
    assert.ok(r.echo.depth < r.echo.soundPath * 0.2);
  });

  test('回波声程为负带原因打回；缺声程字段同样打回', () => {
    assert.throws(
      () => echoReport({ configName: 'steel-20', soundPath: -1 }, store),
      (e) => e.details.some((d) => d.field === 'soundPath')
    );
    assert.throws(
      () => echoReport({ configName: 'steel-20' }, store),
      ValidationError
    );
  });

  test('零声程返回探头入射点：埋深 0、反射 0 次', () => {
    const r = echoReport({ configName: 'steel-20', soundPath: 0 }, store);
    assert.equal(r.echo.depth, 0);
    assert.equal(r.echo.reflections, 0);
  });
});
