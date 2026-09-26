import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  halfSkipGround,
  skipGround,
  oneAndHalfSkipGround,
  reflectionCount,
  locateEcho,
  foldToFirstLeg,
} from '../src/geometry/ground.js';
import { legPath } from '../src/geometry/leg.js';

const approx = (actual, expected, tol = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `期望 ${expected}，实际 ${actual}，容差 ${tol}`);

describe('地面距离', () => {
  test('45 度基准：半跨/skip/一个半来回的地面距离分别为 T、2T、3T', () => {
    approx(halfSkipGround(20, 45), 20);
    approx(skipGround(20, 45), 40);
    approx(oneAndHalfSkipGround(20, 45), 60);
  });

  test('任意回波声程的地面投影恒等于声程乘正弦（水平方向不回头）', () => {
    const T = 20;
    const beta = 55;
    const sin = Math.sin((beta * Math.PI) / 180);
    const L = legPath(T, beta);
    for (const s of [0.2 * L, 1.3 * L, 2.7 * L, 4.5 * L]) {
      approx(locateEcho(s, T, beta).groundDistance, s * sin, 1e-9);
    }
  });
});

describe('反射次数（折回规则）', () => {
  const T = 20;
  const beta = 45;
  const L = legPath(T, beta); // 20√2

  test('每走过一个完整半跨计一次反射，表面读数计入当次反射', () => {
    assert.equal(reflectionCount(0, T, beta), 0);
    assert.equal(reflectionCount(0.5 * L, T, beta), 0);
    assert.equal(reflectionCount(L, T, beta), 1);       // 第一次打到底面
    assert.equal(reflectionCount(1.5 * L, T, beta), 1);
    assert.equal(reflectionCount(2 * L, T, beta), 2);   // 走完一个 skip
    assert.equal(reflectionCount(2.3 * L, T, beta), 2);
    assert.equal(reflectionCount(3 * L, T, beta), 3);
  });

  test('读数超过两个 skip 时按折回规则计入反射次数，而非只数到 2', () => {
    assert.equal(reflectionCount(4.2 * L, T, beta), 4);
    assert.equal(reflectionCount(4 * L, T, beta), 4);
    assert.equal(reflectionCount(5.9 * L, T, beta), 5);
    assert.equal(reflectionCount(6 * L, T, beta), 6);
  });

  test('浮点误差不把恰好落在表面上的读数多算一次反射', () => {
    assert.equal(reflectionCount(2 * L + 1e-15, T, beta), 2);
  });

  test('locateEcho 给出当前半跨编号、跨内比例与完成 skip 数', () => {
    const mid = locateEcho(1.5 * L, T, beta);
    assert.equal(mid.legIndex, 2);
    assert.equal(mid.completedLegs, 1);
    assert.equal(mid.reflections, 1);
    approx(mid.legFraction, 0.5, 1e-12);
    approx(mid.groundDistance, 30, 1e-9);

    const atSurface = locateEcho(3 * L, T, beta);
    assert.equal(atSurface.legIndex, 4);
    assert.equal(atSurface.completedLegs, 3);
    approx(atSurface.legFraction, 0, 1e-12);
  });

  test('foldToFirstLeg 把奇数跨镜像折回、偶数跨直接折回', () => {
    approx(foldToFirstLeg(0.5 * L, T, beta), 0.5 * L, 1e-12);
    approx(foldToFirstLeg(1.5 * L, T, beta), 0.5 * L, 1e-12);
    approx(foldToFirstLeg(2.5 * L, T, beta), 0.5 * L, 1e-12);
    approx(foldToFirstLeg(3.5 * L, T, beta), 0.5 * L, 1e-12);
    approx(foldToFirstLeg(2 * L, T, beta), 0, 1e-9);
    approx(foldToFirstLeg(4 * L, T, beta), 0, 1e-9);
    // 折叠结果永远不超过一个半跨声程。
    assert.ok(foldToFirstLeg(7.9 * L, T, beta) <= L + 1e-9);
  });
});
