import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const server = createApp().listen(port, () => {
  console.log(`折线声程几何核算服务已启动，监听端口 ${port}`);
});

// 容器停止时给一个干净的退出。
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
