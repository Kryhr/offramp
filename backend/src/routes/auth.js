import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../config.js';
import { query } from '../db.js';
import { wrap, validate, clientIp } from '../middleware.js';
import { tooManyFailures, recordAttempt } from '../throttle.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  password: z.string().min(8).max(200)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200)
});

function issueToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { audience: 'user', expiresIn: config.tokenTtl });
}

// POST /api/auth/signup
router.post('/signup', validate(signupSchema), wrap(async (req, res) => {
  const { name, email, phone, password } = req.data;
  const emailLc = email.toLowerCase();

  const exists = await query('SELECT 1 FROM users WHERE email = $1', [emailLc]);
  if (exists.rowCount) return res.status(409).json({ error: 'An account with that email already exists' });

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const { rows } = await query(
    'INSERT INTO users (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id',
    [name, emailLc, phone, hash]
  );
  const token = issueToken(rows[0].id);
  res.status(201).json({ token, user: { name, email: emailLc } });
}));

// POST /api/auth/login
router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const ip = clientIp(req);
  const email = req.data.email.toLowerCase();

  if (await tooManyFailures('user', email)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const { rows } = await query('SELECT id, password_hash, name FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = user && (await argon2.verify(user.password_hash, req.data.password).catch(() => false));

  await recordAttempt('user', email, !!ok, ip);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ token: issueToken(user.id), user: { name: user.name, email } });
}));

export default router;
