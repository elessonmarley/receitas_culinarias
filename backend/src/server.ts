import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './database/pool.js';
import { MySqlRepository } from './repository.js';

const app = createApp(new MySqlRepository(pool));
const server = app.listen(config.PORT, '0.0.0.0', () => console.log(`API: http://localhost:${config.PORT}/api · Swagger: /api/docs`));
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => { void pool.end().then(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
