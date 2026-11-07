import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './db/client.js';
import { users, tasks } from './db/schema.js';
import { env } from './env.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sign = (user) => jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = ({ id, name, email }) => ({ id, name, email });

// Authentication: proves WHO the caller is (valid JWT in the Authorization header).
export function requireAuth(req, _res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    req.userId = jwt.verify(token, env.JWT_SECRET).sub;
    next();
  } catch {
    next(new HttpError(401, 'Unauthorized'));
  }
}

// ---------- Auth ----------
export const auth = Router();

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

auth.post('/signup', async (req, res) => {
  const { name, email, password } = signupSchema.parse(req.body);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new HttpError(409, 'Email already registered');
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

auth.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Same message for unknown email and wrong password (no account enumeration).
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

auth.get('/me', requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId));
  if (!user) throw new HttpError(401, 'Unauthorized');
  res.json({ user: publicUser(user) });
});

// ---------- Tasks (every query is scoped to the logged-in user) ----------
export const taskRoutes = Router();
taskRoutes.use(requireAuth);

const idSchema = z.string().uuid();

taskRoutes.get('/', async (req, res) => {
  const rows = await db.select().from(tasks)
    .where(eq(tasks.userId, req.userId)).orderBy(desc(tasks.createdAt));
  res.json({ tasks: rows });
});

taskRoutes.post('/', async (req, res) => {
  const { title } = z.object({ title: z.string().trim().min(1).max(200) }).parse(req.body);
  const [task] = await db.insert(tasks).values({ title, userId: req.userId }).returning();
  res.status(201).json({ task });
});

taskRoutes.patch('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { done } = z.object({ done: z.boolean() }).parse(req.body);
  const [task] = await db.update(tasks).set({ done })
    .where(and(eq(tasks.id, id), eq(tasks.userId, req.userId))).returning();
  if (!task) throw new HttpError(404, 'Task not found');
  res.json({ task });
});

taskRoutes.delete('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const [task] = await db.delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, req.userId))).returning({ id: tasks.id });
  if (!task) throw new HttpError(404, 'Task not found');
  res.status(204).end();
});
