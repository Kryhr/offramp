-- Cashra database schema
-- Run once against an empty database:  psql "$DATABASE_URL" -f db/schema.sql
-- (or `npm run migrate`)

CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid()

-- ---------- Customers ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  phone         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Orders ----------
-- status: pending -> crypto_received -> paid -> (cancelled)
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref             TEXT        NOT NULL UNIQUE,          -- ORD-XXXXXX shown to the user
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset           TEXT        NOT NULL,                 -- BTC / ETH / SOL / USDT / USDC
  crypto_amount   NUMERIC(38,18) NOT NULL,
  locked_rate     NUMERIC(20,2)  NOT NULL,
  usd_total       NUMERIC(20,2)  NOT NULL,
  deposit_address TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- ---------- Payout details ----------
-- All sensitive values live ONLY inside secret_encrypted (AES-256-GCM).
-- Only non-sensitive preview data (method, last4) is stored in the clear.
CREATE TABLE IF NOT EXISTS payout_details (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method           TEXT        NOT NULL,                -- debit | bank
  last4            TEXT,                                -- for admin queue preview only
  secret_encrypted TEXT        NOT NULL,                -- iv|tag|ciphertext (base64)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payout_order ON payout_details(order_id);

-- ---------- Admins ----------
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'admin',   -- admin | owner
  totp_secret   TEXT,                                   -- set = 2FA required
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login    TIMESTAMPTZ
);

-- ---------- Audit log ----------
-- Records every admin action, especially decryption of customer data.
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  admin_id   UUID REFERENCES admins(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,        -- e.g. view_payout, update_status, login
  order_id   UUID,
  ip         TEXT,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ---------- Login throttling ----------
CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGSERIAL PRIMARY KEY,
  scope      TEXT        NOT NULL,        -- 'admin' | 'user'
  identifier TEXT        NOT NULL,        -- email or ip
  success    BOOLEAN     NOT NULL,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_lookup ON login_attempts(scope, identifier, created_at);
