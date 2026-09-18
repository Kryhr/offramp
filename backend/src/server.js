import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config, { isProd } from './config.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // behind nginx

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin, methods: ['GET', 'POST', 'PATCH'] }));
app.use(cookieParser());
app.use(express.json({ limit: '32kb' }));

// Global light rate limit
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Tighter limit on auth endpoints (brute-force defense, layered with per-account lockout)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/admin/login', authLimiter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Admin panel (same-origin static; API calls require the admin cookie)
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler — never leak internals to clients
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err.message);
  res.status(status).json({ error: status >= 500 ? 'Server error' : err.message });
});

app.listen(config.port, () => {
  console.log(`Cashra API listening on :${config.port} (${config.env})`);
});
