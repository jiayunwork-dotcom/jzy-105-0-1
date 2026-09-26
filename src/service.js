// 服务编排层：把折线几何、埋深反推、校验与配置存取组合成核算用例。
// HTTP 层只调用这里的方法，不接触具体三角公式。
import {
  halfSkipPath,
  skipPath,
  oneAndHalfSkipPath,
  legPath,
} from './geometry/leg.js';
import {
  halfSkipGround,
  skipGround,
  oneAndHalfSkipGround,
} from './geometry/ground.js';
import { locateDefect, depthOnReturnLeg } from './geometry/depth.js';
import { validateGeometryParams, validateSoundPath } from './validation.js';
import { ConfigNotFoundError } from './errors.js';

// 浮点输出统一截到 9 位小数，避免 28.284271247461902 这类噪声。
const round9 = (v) => Number(v.toFixed(9));

function resolveParams(input, store) {
  const { configName, thickness, angleDeg, velocity } = input ?? {};
  if (configName !== undefined && configName !== null) {
    const config = store.get(configName);
    return {
      thickness: pick(thickness, config.thickness),
      angleDeg: pick(angleDeg, config.angleDeg),
      velocity: pick(velocity, config.velocity),
      config: config.name,
    };
  }
  return { thickness, angleDeg, velocity, config: null };
}

// 行内显式给出的值覆盖配置中的同名项；未给出则沿用配置。
function pick(inline, fromConfig) {
  return inline === undefined || inline === null ? fromConfig : inline;
}

// 一个 skip 与一个半来回的完整几何报表。
export function skipReport(input, store) {
  const params = resolveParams(input, store);
  validateGeometryParams(params);

  const { thickness, angleDeg, velocity } = params;
  const L = legPath(thickness, angleDeg);

  const stages = {
    halfSkip: {
      label: '半个来回（一个半跨）',
      legs: 1,
      reflections: 1,
      soundPath: halfSkipPath(thickness, angleDeg),
      groundDistance: halfSkipGround(thickness, angleDeg),
      timeOfFlight: halfSkipPath(thickness, angleDeg) / velocity,
    },
    oneSkip: {
      label: '一个完整来回（1 skip）',
      legs: 2,
      reflections: 2,
      soundPath: skipPath(thickness, angleDeg),
      groundDistance: skipGround(thickness, angleDeg),
      timeOfFlight: skipPath(thickness, angleDeg) / velocity,
    },
    oneAndHalfSkip: {
      label: '一个半来回（1.5 skip）',
      legs: 3,
      reflections: 3,
      soundPath: oneAndHalfSkipPath(thickness, angleDeg),
      groundDistance: oneAndHalfSkipGround(thickness, angleDeg),
      timeOfFlight: oneAndHalfSkipPath(thickness, angleDeg) / velocity,
    },
  };

  return {
    input: {
      thickness,
      angleDeg,
      velocity,
      configName: params.config,
    },
    leg: {
      soundPath: round9(L),
      groundDistance: round9(halfSkipGround(thickness, angleDeg)),
    },
    stages: mapValues(stages, roundStage),
  };
}

// 由回波声程读数反推缺陷位置（反射次数按折回规则计入，绝不把总声程当垂直深度）。
export function echoReport(input, store) {
  const { soundPath } = input ?? {};
  const params = resolveParams(input, store);
  validateGeometryParams(params);
  validateSoundPath(soundPath);

  const { thickness, angleDeg, velocity } = params;
  const L = legPath(thickness, angleDeg);
  const located = locateDefect(soundPath, thickness, angleDeg);

  const returnLegDepth = located.similarTriangleReturnLeg
    ? depthOnReturnLeg(soundPath, thickness, angleDeg)
    : null;

  return {
    input: {
      soundPath,
      thickness,
      angleDeg,
      velocity,
      configName: params.config,
    },
    echo: {
      soundPath,
      legPath: round9(L),
      skipPath: round9(skipPath(thickness, angleDeg)),
      depth: round9(located.depth),
      groundDistance: round9(located.groundDistance),
      reflections: located.reflections,
      legIndex: located.legIndex,
      legFraction: round9(located.legFraction),
      completedSkips: located.completedSkips,
      firstLegEquivalentPath: round9(located.firstLegEquivalentPath),
      returnLeg: located.returnLeg,
      similarTriangleReturnLeg: located.similarTriangleReturnLeg,
      returnLegDepth: returnLegDepth === null ? null : round9(returnLegDepth),
      timeOfFlight: round9(soundPath / velocity),
      note: located.reflections > 2
        ? '读数超过两个 skip，反射次数已按折回规则计入；埋深由相似三角形折叠反推，非总声程垂直读数'
        : undefined,
    },
  };
}

function roundStage(stage) {
  return {
    ...stage,
    soundPath: round9(stage.soundPath),
    groundDistance: round9(stage.groundDistance),
    timeOfFlight: round9(stage.timeOfFlight),
  };
}

function mapValues(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}

export { ConfigNotFoundError };
