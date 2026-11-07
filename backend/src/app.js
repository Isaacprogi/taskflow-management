import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from './env.js';
import { auth, taskRoutes, HttpError } from './routes.js';

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Fly proxies
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

const allowed = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // No Origin header = curl / server-to-server: allow. Otherwise it must be on the list.
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new HttpError(403, `Origin not allowed: ${origin}`));
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), auth);
app.use('/api/tasks', taskRoutes);

app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
// Centralized error handler (Express 5 forwards async errors here automatically).
app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
    });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

export default app;
