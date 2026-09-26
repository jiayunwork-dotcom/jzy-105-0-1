// 非法参数拦截：所有几何计算之前先过这一层，绝不允许把非法值送进三角函数。
import { ValidationError } from './errors.js';

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

const fail = (field, message) => {
  throw new ValidationError(`参数校验失败: ${field} ${message}`, [{ field, message }]);
};

export function validateThickness(thickness) {
  if (!isFiniteNumber(thickness)) {
    fail('thickness', '板厚必须是有限数值');
  }
  if (thickness <= 0) {
    fail('thickness', '板厚必须为正数');
  }
  return true;
}

export function validateAngle(angleDeg) {
  if (!isFiniteNumber(angleDeg)) {
    fail('angleDeg', '折射角必须是有限数值（单位：度）');
  }
  if (angleDeg <= 0) {
    fail('angleDeg', '折射角必须位于 (0, 90) 度开区间内，不能取 0 度（正入射不属于斜射）');
  }
  if (angleDeg >= 90) {
    fail('angleDeg', '折射角必须位于 (0, 90) 度开区间内，90 度时声束贴着板面走、无法形成上下表面间的折线路径');
  }
  return true;
}

export function validateVelocity(velocity) {
  if (!isFiniteNumber(velocity)) {
    fail('velocity', '材料声速必须是有限数值');
  }
  if (velocity <= 0) {
    fail('velocity', '材料声速必须为正数');
  }
  return true;
}

export function validateSoundPath(soundPath) {
  if (!isFiniteNumber(soundPath)) {
    fail('soundPath', '回波声程必须是有限数值');
  }
  if (soundPath < 0) {
    fail('soundPath', '回波声程不能为负');
  }
  return true;
}

// 斜射几何所需的全部材料/探头参数一起校验，收集所有问题一次打回。
export function validateGeometryParams({ thickness, angleDeg, velocity } = {}) {
  const details = [];
  if (!isFiniteNumber(thickness)) {
    details.push({ field: 'thickness', message: '板厚必须是有限数值' });
  } else if (thickness <= 0) {
    details.push({ field: 'thickness', message: '板厚必须为正数' });
  }
  if (!isFiniteNumber(angleDeg)) {
    details.push({ field: 'angleDeg', message: '折射角必须是有限数值（单位：度）' });
  } else if (angleDeg <= 0) {
    details.push({ field: 'angleDeg', message: '折射角必须位于 (0, 90) 度开区间内，不能取 0 度' });
  } else if (angleDeg >= 90) {
    details.push({ field: 'angleDeg', message: '折射角必须位于 (0, 90) 度开区间内，不能取 90 度（声束贴板，无折线路径）' });
  }
  if (!isFiniteNumber(velocity)) {
    details.push({ field: 'velocity', message: '材料声速必须是有限数值' });
  } else if (velocity <= 0) {
    details.push({ field: 'velocity', message: '材料声速必须为正数' });
  }
  if (details.length > 0) {
    throw new ValidationError('参数校验失败', details);
  }
  return true;
}

export function normalizeConfigName(name) {
  if (typeof name !== 'string') {
    fail('name', '配置名必须是字符串');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    fail('name', '配置名不能为空白');
  }
  if (trimmed.length > 64) {
    fail('name', '配置名长度不能超过 64 个字符');
  }
  return trimmed;
}
