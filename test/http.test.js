import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const STEEL_V = 5_900_000;
let base;
let server;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = (path) => fetch(`${base}${path}`);
const put = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const approx = (actual, expected, tol = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `期望 ${expected}，实际 ${actual}，容差 ${tol}`);

describe('HTTP 接口', () => {
  test('GET /health 应答', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).status, 'ok');
  });

  test('POST /geometry/skip：45 度基准钉住 skip 声程手算值', async () => {
    const res = await post('/geometry/skip', {
      thickness: 20, angleDeg: 45, velocity: STEEL_V,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    approx(body.stages.oneSkip.soundPath, 40 * Math.SQRT2, 1e-6);
    approx(body.stages.oneSkip.groundDistance, 40, 1e-6);
    assert.equal(body.stages.oneSkip.reflections, 2);
  });

  test('POST /geometry/skip：板厚翻倍则声程翻倍（HTTP 端到端）', async () => {
    const r1 = await (await post('/geometry/skip', {
      thickness: 10, angleDeg: 38, velocity: STEEL_V,
    })).json();
    const r2 = await (await post('/geometry/skip', {
      thickness: 20, angleDeg: 38, velocity: STEEL_V,
    })).json();
    approx(r2.stages.oneSkip.soundPath, 2 * r1.stages.oneSkip.soundPath, 1e-9);
    approx(r2.stages.oneSkip.groundDistance, 2 * r1.stages.oneSkip.groundDistance, 1e-9);
  });

  test('POST /geometry/echo：半 skip~一 skip 相似三角形返跨反推', async () => {
    const L = 20 * Math.SQRT2;
    const res = await post('/geometry/echo', {
      thickness: 20, angleDeg: 45, velocity: STEEL_V, soundPath: 1.5 * L,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    approx(body.echo.depth, 10, 1e-6);
    assert.equal(body.echo.reflections, 1);
    assert.equal(body.echo.similarTriangleReturnLeg, true);
  });

  test('POST /geometry/echo：超过两个 skip 按折回规则计入反射次数', async () => {
    const L = 20 * Math.SQRT2;
    const res = await post('/geometry/echo', {
      thickness: 20, angleDeg: 45, velocity: STEEL_V, soundPath: 5.5 * L,
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.echo.reflections, 5);
    assert.equal(body.echo.completedSkips, 2);
    approx(body.echo.depth, 10, 1e-6);
  });

  test('非法输入：400 + 带字段原因；90 度在计算前被挡', async () => {
    const res = await post('/geometry/skip', {
      thickness: 0, angleDeg: 90, velocity: -5,
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    const fields = body.error.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ['angleDeg', 'thickness', 'velocity']);
    assert.match(body.error.details.find((d) => d.field === 'angleDeg').message, /90/);
  });

  test('回波声程为负：400 且原因指向 soundPath', async () => {
    const res = await post('/geometry/echo', {
      thickness: 20, angleDeg: 45, velocity: STEEL_V, soundPath: -3,
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.details.some((d) => d.field === 'soundPath'));
  });

  test('坏 JSON：400 而不是 500', async () => {
    const res = await fetch(`${base}/geometry/skip`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
  });

  test('配置存取：保存、按名取用、隔离、缺失 404', async () => {
    const a = await put('/configs/thin', { thickness: 10, angleDeg: 45, velocity: STEEL_V });
    assert.equal(a.status, 201);
    const b = await put('/configs/thick', { thickness: 40, angleDeg: 60, velocity: 3_200_000 });
    assert.equal(b.status, 201);

    const thin = await (await post('/geometry/skip', { configName: 'thin' })).json();
    const thick = await (await post('/geometry/skip', { configName: 'thick' })).json();
    approx(thin.stages.oneSkip.soundPath, 20 * Math.SQRT2, 1e-6);
    approx(thick.stages.oneSkip.soundPath, 160, 1e-6); // 80/cos60

    const got = await get('/configs/thin');
    assert.equal(got.status, 200);
    assert.equal((await got.json()).thickness, 10);

    const missing = await get('/configs/nope');
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'CONFIG_NOT_FOUND');

    const list = await (await get('/configs')).json();
    assert.equal(list.configs.length, 2);
  });

  test('保存非法配置：400 带原因', async () => {
    const res = await put('/configs/bad', { thickness: -1, angleDeg: 91, velocity: 0 });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('未知路由：404', async () => {
    const res = await get('/nonsense');
    assert.equal(res.status, 404);
  });
});
