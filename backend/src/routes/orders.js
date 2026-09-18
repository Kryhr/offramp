import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { wrap, requireUser, validate } from '../middleware.js';
import { encryptJSON, orderRef } from '../crypto.js';

const router = Router();

const ASSETS = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC'];
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };
const MIN_PAYOUT = 10;

// Server-authoritative rate. Never trust a rate sent by the client.
async function fetchRate(asset) {
  if (asset === 'USDT' || asset === 'USDC') return 1;
  const pair = PAIRS[asset];
  const r = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${pair}`);
  if (!r.ok) throw Object.assign(new Error('rate unavailable'), { status: 503 });
  const data = await r.json();
  const price = parseFloat(data.price);
  if (!price || isNaN(price)) throw Object.assign(new Error('rate unavailable'), { status: 503 });
  return price;
}

const createSchema = z.object({
  asset: z.enum(ASSETS),
  cryptoAmount: z.coerce.number().positive().max(1e9)
});

const addr = z.object({
  street: z.string().trim().min(1).max(200),
  apt: z.string().trim().max(80).optional().default(''),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2),
  zip: z.string().trim().regex(/^\d{5}$/)
});

const payoutSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('debit'),
    name: z.string().trim().min(1).max(120),
    number: z.string().regex(/^\d{15,16}$/),
    expiry: z.string().trim().min(4).max(7),
    cvv: z.string().regex(/^\d{3,4}$/),
    billing: addr
  }),
  z.object({
    method: z.literal('bank'),
    holder: z.string().trim().min(1).max(120),
    bankName: z.string().trim().min(1).max(120),
    routing: z.string().regex(/^\d{9}$/),
    type: z.enum(['checking', 'savings']),
    account: z.string().regex(/^\d{4,17}$/),
    billing: addr
  })
]);

// POST /api/orders  -> lock a rate and open an order
router.post('/', requireUser, validate(createSchema), wrap(async (req, res) => {
  const { asset, cryptoAmount } = req.data;
  const rate = await fetchRate(asset);
  const usdTotal = Math.round(cryptoAmount * rate * 100) / 100;
  if (usdTotal < MIN_PAYOUT) return res.status(400).json({ error: `Minimum payout is $${MIN_PAYOUT}` });

  const ref = orderRef();
  // TODO(vps): generate a real per-asset deposit address here.
  const depositAddress = null;

  const { rows } = await query(
    `INSERT INTO orders (ref, user_id, asset, crypto_amount, locked_rate, usd_total, deposit_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, ref, locked_rate, usd_total, status`,
    [ref, req.userId, asset, cryptoAmount, rate, usdTotal, depositAddress]
  );
  res.status(201).json(rows[0]);
}));

// POST /api/orders/:id/payout  -> attach encrypted payout details
router.post('/:id/payout', requireUser, validate(payoutSchema), wrap(async (req, res) => {
  const { rows } = await query('SELECT id, user_id FROM orders WHERE id = $1', [req.params.id]);
  const order = rows[0];
  if (!order || order.user_id !== req.userId) return res.status(404).json({ error: 'Order not found' });

  const d = req.data;
  const last4 = d.method === 'debit' ? d.number.slice(-4) : d.account.slice(-4);
  const secret = encryptJSON(d);

  await query(
    'INSERT INTO payout_details (order_id, method, last4, secret_encrypted) VALUES ($1,$2,$3,$4)',
    [order.id, d.method, last4, secret]
  );
  res.status(201).json({ ok: true });
}));

export default router;
