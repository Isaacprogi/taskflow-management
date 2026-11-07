import 'dotenv/config';
import { z } from 'zod';

// Fail fast at startup with a clear message if config is missing.
export const env = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CORS_ORIGINS: z.string().default(''),
}).parse(process.env);
