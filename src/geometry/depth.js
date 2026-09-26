// 折线声程几何（三）：由回波声程按相似三角形反推缺陷埋深。
//
// 折线路径的每一段半跨都与第一跨呈镜像相似三角形：
//   半跨斜边声程 L = T / cos(beta)，对应竖直板厚 T；
//   因此半跨内任意一点的竖直坐标增量 = s * cos(beta)，其中 s 为该跨内走过的声程。
// 先按折回规则把总声程折叠到「等效第一跨声程」，再乘余弦即得埋深。
//
// 关键：埋深 = 等效声程 * cos(beta)，而不是把回波声程直接当垂直深度。

import { legPath, toRadians } from './leg.js';
import { foldToFirstLeg, locateEcho, reflectionCount } from './ground.js';

// 相似三角形反推：已知回波声程读数，返回从探头入射面量起的缺陷埋深。
// 适用于任意非负声程读数，内部按跨折回。
export function depthFromSoundPath(soundPath, thickness, angleDeg) {
  const equivalent = foldToFirstLeg(soundPath, thickness, angleDeg);
  return equivalent * Math.cos(toRadians(angleDeg));
}

// 专门覆盖「半个 skip 到一个 skip 之间」（即首次返跨，L <= S <= 2L）的情形：
// 该跨声束由底面返回顶面，缺陷埋深从入射面量起为
//   depth = (2L - S) * cos(beta) = 2T - S * cos(beta)
export function depthOnReturnLeg(soundPath, thickness, angleDeg) {
  const L = legPath(thickness, angleDeg);
  return (2 * L - soundPath) * Math.cos(toRadians(angleDeg));
}

// 完整回波定位：折回反射次数 + 相似三角形埋深 + 地面投影一起给出。
export function locateDefect(soundPath, thickness, angleDeg) {
  const location = locateEcho(soundPath, thickness, angleDeg);
  const depth = depthFromSoundPath(soundPath, thickness, angleDeg);
  const L = legPath(thickness, angleDeg);
  const firstLegEquivalent = foldToFirstLeg(soundPath, thickness, angleDeg);

  // 半个 skip 到一个 skip 之间 = 声束第一次从底面往回走，走相似三角形返跨公式。
  const onReturnLegBySimilarTriangles = soundPath >= L - 1e-9 * Math.max(L, 1) &&
    soundPath <= 2 * L + 1e-9 * Math.max(L, 1);

  return {
    depth,
    groundDistance: location.groundDistance,
    legIndex: location.legIndex,
    legFraction: location.legFraction,
    reflections: reflectionCount(soundPath, thickness, angleDeg),
    completedSkips: Math.floor(location.completedLegs / 2),
    firstLegEquivalentPath: firstLegEquivalent,
    // 已完成奇数个半跨 => 当前跨声束正从底面返回入射面（返跨）。
    returnLeg: location.completedLegs % 2 === 1,
    similarTriangleReturnLeg: onReturnLegBySimilarTriangles,
  };
}
