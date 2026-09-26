// 折线声程几何（一）：半跨与 skip 的斜边声程。
//
// 约定：
//   T = 板厚，beta = 折射角（相对板面法线）
//   一个半跨（leg）：声束从一侧表面斜射到另一侧表面
//     - 水平投影（半跨）halfSpan = T * tan(beta)
//     - 斜边声程      legPath  = T / cos(beta)
//   一个完整来回（skip）= 两个半跨：
//     - 声程       skipPath = 2T / cos(beta)
//     - 地面距离   skipGround = 2 * T * tan(beta)
// 正入射极限 beta -> 0 时 cos(beta) -> 1，skipPath -> 2T。

const DEG2RAD = Math.PI / 180;

export function toRadians(angleDeg) {
  return angleDeg * DEG2RAD;
}

// 一个半跨的水平投影（地面距离）。
export function halfSpan(thickness, angleDeg) {
  return thickness * Math.tan(toRadians(angleDeg));
}

// 一个半跨的斜边声程。
export function legPath(thickness, angleDeg) {
  return thickness / Math.cos(toRadians(angleDeg));
}

// n 个半跨的累计斜边声程（n 可为 0.5、1、1.5…按 half-leg 计）。
export function pathOfLegs(thickness, angleDeg, legs) {
  return legs * legPath(thickness, angleDeg);
}

// 一个完整来回（1 skip）的斜边声程 = 两倍板厚 / 余弦。
export function skipPath(thickness, angleDeg) {
  return pathOfLegs(thickness, angleDeg, 2);
}

// 一个半来回（half skip，即一个半跨）的斜边声程。
export function halfSkipPath(thickness, angleDeg) {
  return pathOfLegs(thickness, angleDeg, 1);
}

// 一个半来回之后再走半跨（1.5 skip，三个半跨）的斜边声程。
export function oneAndHalfSkipPath(thickness, angleDeg) {
  return pathOfLegs(thickness, angleDeg, 3);
}
