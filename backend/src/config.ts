import 'dotenv/config';
import { z } from 'zod';

const env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/).default('teste_receitas_rg_sistemas'),
  DB_USER: z.string().default('receitas'),
  DB_PASSWORD: z.string().default('receitas_local_123'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
}).parse(process.env);

export const config = { ...env, secureCookie: env.COOKIE_SECURE === 'true' };
