// HTTP 层：只负责收发与编排，核心折线几何、埋深反推全部在 service/geometry 中。
import express from 'express';
import { ConfigStore } from './configStore.js';
import { skipReport, echoReport } from './service.js';
import { ValidationError, ConfigNotFoundError } from './errors.js';

export function createApp(store = new ConfigStore()) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'skip-geometry' });
  });

  // 折线声程几何：半跨 / 一个 skip / 一个半来回的声程、地面距离、反射次数。
  app.post('/geometry/skip', (req, res, next) => {
    try {
      res.json(skipReport(req.body, store));
    } catch (err) {
      next(err);
    }
  });

  // 回波反推：给声程读数，返回缺陷埋深、地面投影与折回反射次数。
  app.post('/geometry/echo', (req, res, next) => {
    try {
      res.json(echoReport(req.body, store));
    } catch (err) {
      next(err);
    }
  });

  // 探伤配置存取（进程内）。
  app.put('/configs/:name', (req, res, next) => {
    try {
      const saved = store.put(req.params.name, req.body ?? {});
      res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  });

  app.get('/configs/:name', (req, res, next) => {
    try {
      res.json(store.get(req.params.name));
    } catch (err) {
      next(err);
    }
  });

  app.get('/configs', (_req, res) => {
    res.json({ configs: store.list() });
  });

  app.delete('/configs/:name', (req, res, next) => {
    try {
      res.json(store.delete(req.params.name));
    } catch (err) {
      next(err);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
  });

  // 统一错误翻译：非法参数 400（带逐条原因），配置缺失 404。
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details },
      });
    }
    if (err instanceof ConfigNotFoundError) {
      return res.status(404).json({
        error: { code: 'CONFIG_NOT_FOUND', message: err.message, configName: err.configName },
      });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '请求体不是合法 JSON' },
      });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '几何核算服务内部错误' },
    });
  });

  return app;
}
