# Cashra Backend

API + admin panel for the Cashra crypto-to-fiat off-ramp. Node/Express + PostgreSQL. Sensitive payout data is encrypted at rest; the admin panel is where orders are reviewed and manually processed.

> Nothing runs or stores data until this is deployed on your VPS. This is the scaffold, ready to `git pull` and start. Read `SECURITY.md` before going live.

## Stack
- **Node 18+ / Express** — REST API
- **PostgreSQL** — data store
- **argon2** password hashing, **JWT** sessions, **otplib** TOTP 2FA
- **AES-256-GCM** field encryption for payout secrets
- Static **admin panel** served at `/admin`

## Local / VPS setup

```bash
cd backend
npm install

# 1. Configure
cp .env.example .env
#   then edit .env:
#   - DATABASE_URL         (least-privilege Postgres user)
#   - JWT_SECRET / ADMIN_JWT_SECRET   -> openssl rand -hex 32
#   - DATA_ENCRYPTION_KEY  -> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   - FRONTEND_ORIGIN      (your public site origin)

# 2. Create the database, then apply the schema
createdb cashra           # or however your host provisions it
npm run migrate

# 3. Create your admin account (with 2FA)
node src/createAdmin.js you@email.com 'a-long-strong-password' --2fa
#   -> scan the printed secret into your authenticator app

# 4. Run
npm start                 # http://localhost:8080
```

Admin panel: `http://localhost:8080/admin`
Health check: `GET /health`

## API surface

Customer (Bearer token from signup/login):
- `POST /api/auth/signup` — { name, email, phone, password } → { token }
- `POST /api/auth/login` — { email, password } → { token }
- `POST /api/orders` — { asset, cryptoAmount } → locks a server-side rate, returns { ref, id, locked_rate, usd_total }
- `POST /api/orders/:id/payout` — encrypted card/bank details

Admin (httpOnly cookie, same-origin panel):
- `POST /api/admin/login` — { email, password, otp? }
- `GET /api/admin/stats` — dashboard figures
- `GET /api/admin/orders?status=` — order queue
- `GET /api/admin/orders/:id` — full record **with decrypted payout** (audited)
- `PATCH /api/admin/orders/:id/status` — advance an order
- `GET /api/admin/audit` — recent admin activity

## Production (nginx + systemd sketch)

- Run the app as a non-root user via a systemd unit (`npm start`, `NODE_ENV=production`).
- nginx terminates TLS (Let's Encrypt) and reverse-proxies `/` → `127.0.0.1:8080`.
- Bind Postgres to localhost; firewall everything except 443 and 22.
- See `SECURITY.md` for the full hardening checklist.

## Connecting the frontend

Set `window.CASHRA_API` in the site's `config.js` to this backend's URL (e.g. `https://api.your-domain.com`). While it's empty, the frontend runs in demo mode and stores nothing.
