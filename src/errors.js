// 领域错误：带 HTTP 状态码与原因明细，供 HTTP 层统一翻译为错误响应。
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

export class ConfigNotFoundError extends Error {
  constructor(name) {
    super(`探伤配置不存在: ${name}`);
    this.name = 'ConfigNotFoundError';
    this.status = 404;
    this.configName = name;
  }
}
