import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { depthFromSoundPath, depthOnReturnLeg, locateDefect } from '../src/geometry/depth.js';
import { legPath, skipPath } from '../src/geometry/leg.js';

const approx = (actual, expected, tol = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `期望 ${expected}，实际 ${actual}，容差 ${tol}`);

describe('相似三角形反推埋深', () => {
  const T = 20;
  const beta = 45;
  const L = legPath(T, beta);   // 20√2
  const cos = Math.cos(Math.PI / 4);

  test('几何关系④：斜射回波反算埋深与几何自洽，不能算成正入射垂直深度', () => {
    const S = 0.5 * L;          // 第一跨走一半
    const depth = depthFromSoundPath(S, T, beta);
    approx(depth, T / 2, 1e-9); // 几何自洽：半跨中点埋深 = 板厚一半
    // 若误把声程直接当垂直深度会得到 S = 10√2 ≈ 14.14，必须判为错误。
    assert.ok(Math.abs(depth - S) > 4, '绝不能把回波声程直接读成垂直埋深');
    assert.ok(depth !== S);
  });

  test('半个 skip 到一个 skip 之间（首次返跨）按返跨相似公式反推', () => {
    // S = 1.5L：声束已触底一次、在返回顶面的跨中点，埋深仍为 T/2。
    approx(depthFromSoundPath(1.5 * L, T, beta), T / 2, 1e-9);
    // 返跨公式 (2L - S)cos 与通用折叠反推一致。
    approx(depthOnReturnLeg(1.5 * L, T, beta), (2 * L - 1.5 * L) * cos, 1e-12);
    approx(depthOnReturnLeg(1.5 * L, T, beta), T / 2, 1e-9);
    // 返跨上离底面越远（S 增大）埋深越浅。
    assert.ok(depthFromSoundPath(1.8 * L, T, beta) < T / 2);
  });

  test('跨端点：S=L 触底埋深为 T，S=2L 回到顶面埋深为 0', () => {
    approx(depthFromSoundPath(L, T, beta), T, 1e-9);
    approx(depthFromSoundPath(2 * L, T, beta), 0, 1e-9);
    approx(depthFromSoundPath(0, T, beta), 0, 1e-9);
  });

  test('超过两个 skip 仍按折回规则给出正确埋深与反射次数', () => {
    // 4.5L = 两个完整来回后第 5 跨中点，声束向下，埋深 T/2，反射 4 次。
    const r = locateDefect(4.5 * L, T, beta);
    approx(r.depth, T / 2, 1e-9);
    assert.equal(r.reflections, 4);
    assert.equal(r.legIndex, 5);
    assert.equal(r.completedSkips, 2);
    assert.equal(r.returnLeg, false);

    // 5.5L 时第 6 跨（返跨）中点，埋深同样 T/2，反射 5 次。
    const r2 = locateDefect(5.5 * L, T, beta);
    approx(r2.depth, T / 2, 1e-9);
    assert.equal(r2.reflections, 5);
    assert.equal(r2.returnLeg, true);
    // 两个读数的总声程都远大于板厚，埋深绝不可能等于声程本身。
    assert.ok(r2.depth < 4.5 * L * 0.2);
  });

  test('60 度非对称算例：埋深 = 等效第一跨声程 * cos60', () => {
    const T60 = 18;
    const L60 = legPath(T60, 60); // 36
    approx(L60, 36, 1e-12);
    // 第一跨走 2/3：竖直下沉 L60*(2/3)*0.5 = 12
    approx(depthFromSoundPath((2 / 3) * L60, T60, 60), 12, 1e-9);
    // 总声程读数（含两个来回折叠）反算埋深依旧正确。
    approx(depthFromSoundPath(2 * L60 + (2 / 3) * L60, T60, 60), 12, 1e-9);
    // skip 声程 = 2T/cos60 = 72
    approx(skipPath(T60, 60), 72, 1e-12);
  });

  test('locateDefect 标记半 skip ~ 一 skip 的相似三角形返跨区间', () => {
    assert.equal(locateDefect(0.5 * L, T, beta).similarTriangleReturnLeg, false);
    assert.equal(locateDefect(1.2 * L, T, beta).similarTriangleReturnLeg, true);
    assert.equal(locateDefect(2 * L, T, beta).similarTriangleReturnLeg, true);
    assert.equal(locateDefect(2.1 * L, T, beta).similarTriangleReturnLeg, false);
  });
});
