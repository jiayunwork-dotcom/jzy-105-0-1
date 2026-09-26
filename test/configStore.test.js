import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigStore } from '../src/configStore.js';
import { ConfigNotFoundError, ValidationError } from '../src/errors.js';

describe('探伤配置存取（进程内、互不干扰）', () => {
  let store;
  beforeEach(() => {
    store = new ConfigStore();
  });

  test('保存后可按名取回，值不被外部篡改', () => {
    const params = { thickness: 20, angleDeg: 45, velocity: 5900 };
    const saved = store.put('steel-20', params);
    assert.deepEqual(saved, { name: 'steel-20', ...params });

    params.thickness = 999; // 外部再改原对象
    const got = store.get('steel-20');
    assert.equal(got.thickness, 20);

    const listed = store.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].name, 'steel-20');
  });

  test('两套配置各自的板厚角度完全隔离，不会串到另一套头上', () => {
    store.put('thin', { thickness: 10, angleDeg: 45, velocity: 5900 });
    store.put('thick', { thickness: 40, angleDeg: 60, velocity: 3200 });

    const thin = store.get('thin');
    const thick = store.get('thick');
    assert.equal(thin.thickness, 10);
    assert.equal(thin.angleDeg, 45);
    assert.equal(thin.velocity, 5900);
    assert.equal(thick.thickness, 40);
    assert.equal(thick.angleDeg, 60);
    assert.equal(thick.velocity, 3200);

    // 覆盖 thin 不影响 thick。
    store.put('thin', { thickness: 12, angleDeg: 50, velocity: 5920 });
    assert.equal(store.get('thin').thickness, 12);
    assert.equal(store.get('thick').thickness, 40);
    assert.equal(store.get('thick').angleDeg, 60);
  });

  test('取不存在的配置报 404 语义错误，删除后同样查不到', () => {
    assert.throws(() => store.get('ghost'), ConfigNotFoundError);
    store.put('a', { thickness: 10, angleDeg: 45, velocity: 5900 });
    store.delete('a');
    assert.throws(() => store.get('a'), ConfigNotFoundError);
    assert.throws(() => store.delete('a'), ConfigNotFoundError);
  });

  test('存配置时非法参数照样被拦截', () => {
    assert.throws(
      () => store.put('bad', { thickness: -1, angleDeg: 90, velocity: 0 }),
      ValidationError
    );
    assert.equal(store.list().length, 0);
  });
});
