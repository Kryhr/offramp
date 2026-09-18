import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { z } from 'zod';
import config, { isProd } from '../config.js';
import { query } from '../db.js';
import { wrap, requireAdmin, validate, audit, clientIp } from '../middleware.js';
import { tooManyFailures, recordAttempt } from '../throttle.js';
import { decryptJSON } from '../crypto.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  otp: z.string().trim().optional()
});

const statusSchema = z.object({
  status: z.enum(['pending', 'crypto_received', 'paid', 'cancelled'])
});

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
};

// POST /api/admin/login
router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const ip = clientIp(req);
  const email = req.data.email.toLowerCase();

  if (await tooManyFailures('admin', email)) {
    return res.status(429).json({ error: 'Too many attempts. Locked for 15 minutes.' });
  }

  const { rows } = await query('SELECT * FROM admins WHERE email = $1', [email]);
  const admin = rows[0];
  const passOk = admin && (await argon2.verify(admin.password_hash, req.data.password).catch(() => false));

  let otpOk = true;
  if (passOk && admin.totp_secret) {
    otpOk = !!req.data.otp && authenticator.verify({ token: req.data.otp, secret: admin.totp_secret });
  }

  const success = !!(passOk && otpOk);
  await recordAttempt('admin', email, success, ip);
  if (!passOk) return res.status(401).json({ error: 'Invalid credentials' });
  if (!otpOk) return res.status(401).json({ error: 'Invalid or missing 2FA code', need2fa: true });

  await query('UPDATE admins SET last_login = now() WHERE id = $1', [admin.id]);
  const token = jwt.sign({ sub: admin.id, role: admin.role }, config.adminJwtSecret,
    { audience: 'admin', expiresIn: config.adminTokenTtl });
  res.cookie('admin_token', token, cookieOpts);
  await audit({ adminId: admin.id, action: 'login', ip });
  res.json({ ok: true, email, role: admin.role });
}));

// POST /api/admin/logout
router.post('/logout', requireAdmin, (req, res) => {
  res.clearCookie('admin_token', { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/admin/me
router.get('/me', requireAdmin, wrap(async (req, res) => {
  const { rows } = await query('SELECT email, role FROM admins WHERE id = $1', [req.adminId]);
  res.json(rows[0] || {});
}));

// GET /api/admin/stats
router.get('/stats', requireAdmin, wrap(async (req, res) => {
  const [users, orders, byStatus, byAsset, volume, recent] = await Promise.all([
    query('SELECT count(*)::int AS n FROM users'),
    query('SELECT count(*)::int AS n FROM orders'),
    query('SELECT status, count(*)::int AS n FROM orders GROUP BY status'),
    query('SELECT asset, count(*)::int AS n, coalesce(sum(usd_total),0)::float AS usd FROM orders GROUP BY asset ORDER BY n DESC'),
    query("SELECT coalesce(sum(usd_total),0)::float AS paid FROM orders WHERE status = 'paid'"),
    query('SELECT ref, asset, usd_total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10')
  ]);
  res.json({
    users: users.rows[0].n,
    orders: orders.rows[0].n,
    paidVolume: volume.rows[0].paid,
    byStatus: byStatus.rows,
    topAssets: byAsset.rows,
    recent: recent.rows
  });
}));

// GET /api/admin/orders?status=
router.get('/orders', requireAdmin, wrap(async (req, res) => {
  const status = req.query.status;
  const params = [];
  let where = '';
  if (status && ['pending', 'crypto_received', 'paid', 'cancelled'].includes(status)) {
    params.push(status); where = 'WHERE o.status = $1';
  }
  const { rows } = await query(
    `SELECT o.id, o.ref, o.asset, o.crypto_amount, o.locked_rate, o.usd_total, o.status, o.created_at,
            u.name AS user_name, u.email AS user_email,
            p.method, p.last4
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN payout_details p ON p.order_id = o.id
       ${where}
       ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json(rows);
}));

// GET /api/admin/orders/:id  -> full record WITH decrypted payout (audited)
router.get('/orders/:id', requireAdmin, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
            p.method, p.secret_encrypted, p.created_at AS payout_at
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN payout_details p ON p.order_id = o.id
      WHERE o.id = $1`,
    [req.params.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Not found' });

  let payout = null;
  if (row.secret_encrypted) {
    payout = decryptJSON(row.secret_encrypted);
    await audit({ adminId: req.adminId, action: 'view_payout', orderId: row.id, ip: clientIp(req),
      detail: `${row.method} for ${row.ref}` });
  }
  delete row.secret_encrypted;
  res.json({ order: row, payout });
}));

// PATCH /api/admin/orders/:id  -> update status
router.patch('/:id/status', requireAdmin, validate(statusSchema), wrap(async (req, res) => {
  const { rows } = await query(
    'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, ref, status',
    [req.data.status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  await audit({ adminId: req.adminId, action: 'update_status', orderId: rows[0].id, ip: clientIp(req),
    detail: `-> ${req.data.status}` });
  res.json(rows[0]);
}));

// GET /api/admin/audit  -> recent audit log
router.get('/audit', requireAdmin, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT a.action, a.order_id, a.ip, a.detail, a.created_at, ad.email AS admin_email
       FROM audit_log a LEFT JOIN admins ad ON ad.id = a.admin_id
      ORDER BY a.created_at DESC LIMIT 100`
  );
  res.json(rows);
}));

export default router;
