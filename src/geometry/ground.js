// 折线声程几何（二）：地面距离与反射次数。
//
// 声束在上下表面间全反射时，每走过一个半跨就触碰一次表面（发生一次反射），
// 水平方向始终朝同一方向推进，每个半跨的地面投影恒为 T * tan(beta)。
//
// 约定：半跨编号 legIndex 从 1 开始
//   第 1 个半跨：入射面（上表面）-> 下表面
//   第 2 个半跨：下表面 -> 上表面（即第 1 个完整来回）
//   第 3 个半跨：上表面 -> 下表面（一个半来回）

import { halfSpan, legPath, toRadians } from './leg.js';

// 一个半跨的地面投影。
export function legGround(thickness, angleDeg) {
  return halfSpan(thickness, angleDeg);
}

// 一个完整来回（1 skip）的地面距离 = 两个半跨。
export function skipGround(thickness, angleDeg) {
  return 2 * halfSpan(thickness, angleDeg);
}

// 半个来回（1 个半跨）的地面距离。
export function halfSkipGround(thickness, angleDeg) {
  return halfSpan(thickness, angleDeg);
}

// 一个半来回（3 个半跨）的地面距离。
export function oneAndHalfSkipGround(thickness, angleDeg) {
  return 3 * halfSpan(thickness, angleDeg);
}

// 声束已经走过的完整半跨数（每次换面就是一次反射）。
// 读数恰好落在表面上（n 倍半跨声程）按 n 次反射计，
// 用 1e-10 的相对容差吸收浮点误差，避免 2.0000000001 被多算一次。
export function reflectionCount(soundPath, thickness, angleDeg) {
  const L = legPath(thickness, angleDeg);
  const ratio = soundPath / L;
  const nearest = Math.round(ratio);
  if (nearest >= 0 && Math.abs(ratio - nearest) <= 1e-10) {
    return nearest;
  }
  return Math.floor(ratio);
}

// 给定回波声程，定位它落在折线路径的哪一段：
//   legIndex   当前所在半跨（1 = 入射跨，2 = 首次返跨，3 = 再入射跨…）
//   legFraction 在当前半跨内走过的比例 [0, 1)
//   groundDistance 探头入射点到缺陷的水平地面投影距离
//   completedLegs 已完成的完整半跨数（= 反射次数）
export function locateEcho(soundPath, thickness, angleDeg) {
  const L = legPath(thickness, angleDeg);
  const ratio = soundPath / L;

  let completedLegs = Math.floor(ratio);
  let fraction = ratio - completedLegs;

  // 恰好落在反射表面上时归到上一跨的终点，避免出现 fraction 约等于 1 的空跨。
  if (fraction >= 1 - 1e-10 / Math.max(L, 1)) {
    completedLegs += 1;
    fraction = 0;
  }

  return {
    legIndex: completedLegs + 1,
    completedLegs,
    legFraction: fraction,
    reflections: completedLegs,
    groundDistance: ratio * halfSpan(thickness, angleDeg),
  };
}

// 按折回规则把任意回波声程折算为「等效第一跨声程」（0, L]。
// 偶数跨向下、奇数跨向上，利用声束往返的镜像对称做折叠。
export function foldToFirstLeg(soundPath, thickness, angleDeg) {
  const L = legPath(thickness, angleDeg);
  const ratio = soundPath / L;
  const phase = ratio % 2;
  if (phase <= 1) {
    return phase * L;
  }
  return (2 - phase) * L;
}

export { toRadians };
