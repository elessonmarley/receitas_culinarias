import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { testTimeout: 15000, hookTimeout: 30000, env: { NODE_ENV: 'test' } } });
