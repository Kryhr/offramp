import jwt from 'jsonwebtoken';
import config from './config.js';
import { query } from './db.js';

// Wrap async route handlers so thrown errors hit the error middleware.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Customer auth (Bearer token) ----
export function requireUser(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, config.jwtSecret, { audience: 'user' });
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// ---- Admin auth (httpOnly cookie, same-origin admin panel) ----
export function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: 'Admin login required' });
  try {
    const payload = jwt.verify(token, config.adminJwtSecret, { audience: 'admin' });
    req.adminId = payload.sub;
    req.adminRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Admin session expired' });
  }
}

// ---- Zod body validation ----
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.flatten().fieldErrors });
  }
  req.data = result.data;
  next();
};

// ---- Audit logging ----
export async function audit({ adminId = null, action, orderId = null, ip = null, detail = null }) {
  try {
    await query(
      'INSERT INTO audit_log (admin_id, action, order_id, ip, detail) VALUES ($1,$2,$3,$4,$5)',
      [adminId, action, orderId, ip, detail]
    );
  } catch {
    // Never let audit failure break the request, but do surface to server logs.
    console.error('[audit] failed to write log entry:', action);
  }
}

export function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null;
}
