import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  halfSpan,
  legPath,
  skipPath,
  halfSkipPath,
  oneAndHalfSkipPath,
} from '../src/geometry/leg.js';

const SQRT2 = Math.SQRT2;
const approx = (actual, expected, tol = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `期望 ${expected}，实际 ${actual}，容差 ${tol}`);

describe('半跨与 skip 声程几何', () => {
  test('45 度基准算例：一个 skip 声程 = 两倍板厚 / 余弦（可手算核对）', () => {
    const T = 20; // mm
    const beta = 45;
    // 半跨斜边 = 20 / cos45 = 20√2
    approx(legPath(T, beta), 20 * SQRT2);
    approx(halfSkipPath(T, beta), 20 * SQRT2);
    // 一个 skip = 2 * 20 / cos45 = 40√2 ≈ 56.5685
    approx(skipPath(T, beta), 40 / Math.cos(Math.PI / 4));
    approx(skipPath(T, beta), 40 * SQRT2);
    approx(skipPath(T, beta), 56.568542495, 1e-6);
    // 一个半来回 = 三个半跨 = 60√2
    approx(oneAndHalfSkipPath(T, beta), 60 * SQRT2);
    // 半跨水平投影 = 20 * tan45 = 20
    approx(halfSpan(T, beta), 20);
  });

  test('几何关系①：板厚翻倍，一个 skip 的声程与地面距离都精确翻倍', () => {
    const beta = 35;
    const base = { path: skipPath(10, beta), ground: 2 * halfSpan(10, beta) };
    const doubled = { path: skipPath(20, beta), ground: 2 * halfSpan(20, beta) };
    approx(doubled.path, 2 * base.path, 1e-12);
    approx(doubled.ground, 2 * base.ground, 1e-12);

    // 再换 60 度抽查，保证不是角度带来的巧合。
    const b60 = { path: skipPath(12, 60), ground: 2 * halfSpan(12, 60) };
    const d60 = { path: skipPath(24, 60), ground: 2 * halfSpan(24, 60) };
    approx(d60.path, 2 * b60.path, 1e-12);
    approx(d60.ground, 2 * b60.ground, 1e-12);
  });

  test('几何关系②：板厚不变、折射角调大，地面距离与 skip 斜边声程都随之变长', () => {
    const T = 20;
    const angles = [15, 30, 45, 60, 75];
    for (let i = 1; i < angles.length; i++) {
      assert.ok(
        2 * halfSpan(T, angles[i]) > 2 * halfSpan(T, angles[i - 1]),
        `地面距离在 ${angles[i - 1]}° -> ${angles[i]}° 时应变大`
      );
      assert.ok(
        skipPath(T, angles[i]) > skipPath(T, angles[i - 1]),
        `skip 声程在 ${angles[i - 1]}° -> ${angles[i]}° 时应变长`
      );
    }
    // 定点抽查：30 度 ground = 40/√3 ≈ 23.09；60 度 ground = 40√3 ≈ 69.28
    approx(2 * halfSpan(T, 30), 40 / Math.sqrt(3), 1e-9);
    approx(2 * halfSpan(T, 60), 40 * Math.sqrt(3), 1e-9);
  });

  test('几何关系③：折射角趋于零时，一个 skip 声程收敛到两倍板厚（正入射极限）', () => {
    const T = 20;
    for (const angle of [1, 0.1, 0.01, 0.001, 0.0001]) {
      const p = skipPath(T, angle);
      assert.ok(p > 2 * T, '斜射时声程应严格大于垂直来回 2T');
      assert.ok(Math.abs(p - 2 * T) < 4 * T * (angle * Math.PI / 180) ** 2 + 1e-9,
        `${angle} 度时应收敛向 2T，实际 ${p}`);
    }
    // 极限值：极小角度下与 2T 的差在 1e-6 量级以内。
    approx(skipPath(T, 1e-6), 2 * T, 1e-6);
    // 换一块板再钉一次，证明极限是 2T 而非别的常数。
    approx(skipPath(37.5, 1e-6), 75, 1e-6);
  });
});
