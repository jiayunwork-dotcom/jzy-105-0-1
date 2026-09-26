// 探伤配置的存取（仅活在进程运行期间，不做持久化）。
// 每套配置按名字独立保存 { thickness, angleDeg, velocity }，
// 计算时按名取出各自的值，两套配置之间互不干扰。
import { normalizeConfigName } from './validation.js';
import { validateGeometryParams } from './validation.js';
import { ConfigNotFoundError } from './errors.js';

export class ConfigStore {
  #configs = new Map();

  // 新建或覆盖一套配置，返回保存后的副本（避免外部再改动内部状态）。
  put(name, params) {
    const key = normalizeConfigName(name);
    validateGeometryParams(params);
    const snapshot = {
      thickness: params.thickness,
      angleDeg: params.angleDeg,
      velocity: params.velocity,
    };
    this.#configs.set(key, snapshot);
    return { name: key, ...snapshot };
  }

  get(name) {
    const key = normalizeConfigName(name);
    const config = this.#configs.get(key);
    if (!config) {
      throw new ConfigNotFoundError(key);
    }
    return { name: key, ...config };
  }

  has(name) {
    const key = normalizeConfigName(name);
    return this.#configs.has(key);
  }

  list() {
    return [...this.#configs.entries()].map(([name, params]) => ({ name, ...params }));
  }

  delete(name) {
    const key = normalizeConfigName(name);
    if (!this.#configs.has(key)) {
      throw new ConfigNotFoundError(key);
    }
    this.#configs.delete(key);
    return { name: key, deleted: true };
  }

  clear() {
    this.#configs.clear();
  }
}
