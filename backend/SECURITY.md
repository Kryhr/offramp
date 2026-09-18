# Cashra — Security Design

How customer data and admin accounts are protected, and what still needs doing before real money moves. Read this fully before going live.

## Data protection

**Encryption in transit.** All traffic runs over TLS (nginx + Let's Encrypt). `helmet` sets HSTS and other hardening headers. No plaintext HTTP in production.

**Encryption at rest (field level).** Every sensitive payout value (card number, expiry, CVV, routing, account) is encrypted with **AES-256-GCM** before it touches the database (`src/crypto.js`). Only a non-sensitive preview (`method`, `last4`) is stored in the clear so the admin queue is usable. The master key (`DATA_ENCRYPTION_KEY`) lives only in the server environment, never in the DB or the repo.

- GCM is authenticated: tampered ciphertext fails to decrypt rather than returning garbage.
- Each value uses a fresh random IV.
- **Upgrade path:** move to true envelope encryption — a KMS/HSM (AWS KMS, GCP KMS, or Vault Transit) holds the master key and wraps per-record data keys, so the raw key never sits on the VPS. Do this before scaling.

**Decryption is deliberate and logged.** Data is only decrypted when you open a specific order in the admin panel, and every decryption writes an `audit_log` row (which admin, which order, when, from what IP).

## Account security

**Passwords** are hashed with **argon2id** (memory-hard) — never stored or logged in plaintext.

**Admin sessions** use httpOnly + `SameSite=Strict` + `Secure` cookies with a dedicated JWT secret and short TTL, so tokens aren't reachable from JavaScript/XSS and don't ride along cross-site.

**Two-factor auth (TOTP)** for admins via `otplib`. Create an admin with `--2fa` and 2FA is enforced at login. Strongly recommended for every admin.

**Brute-force defense**, two layers: IP rate limiting on auth endpoints (`express-rate-limit`) plus per-account lockout after repeated failures (`login_attempts` table).

**Customer sessions** use short-lived Bearer JWTs issued at signup/login.

## Application hardening

- **Input validation** on every endpoint with `zod`; unexpected fields are rejected. JSON body capped at 32 KB.
- **CORS** locked to the exact frontend origin.
- **Security headers** via `helmet`; the admin panel avoids inline scripts/styles so a strict CSP holds.
- **Error handler** never leaks stack traces or internals to clients; 5xx details go only to server logs.
- **No sensitive data is ever logged** — not card numbers, not request bodies.

## Infrastructure hardening (VPS checklist)

- [ ] Firewall: expose only 443 (and 22 for SSH). Postgres bound to `localhost`, never the public internet.
- [ ] SSH: key-only auth, root login disabled, `fail2ban` on.
- [ ] Run the app as a **non-root** user (systemd service), behind nginx as reverse proxy.
- [ ] Dedicated **least-privilege Postgres role** (the app user can read/write its tables and nothing more — not a superuser).
- [ ] Secrets in a real secrets manager (or at minimum a `chmod 600` `.env` owned by the app user). Never in git.
- [ ] Automated **encrypted** database backups; store the backup encryption key and `DATA_ENCRYPTION_KEY` separately from the backups themselves.
- [ ] Keep the OS and dependencies patched; run `npm audit` in CI.
- [ ] Put Cloudflare (or similar) in front for DDoS protection + WAF.
- [ ] Restrict the admin panel further: IP allowlist and/or VPN, on top of login + 2FA.

## Data minimization & retention

Only collect what manual processing actually needs, and delete it when the order is complete and reconciled. The longer full card/bank data sits in the DB, the bigger the breach blast radius. Add a scheduled purge of `payout_details` for orders in a terminal state past your retention window.

## ⚠️ Compliance reality (read before launch)

- **CVV storage is prohibited** by PCI-DSS and card-network rules, even encrypted. It is collected and stored here per an explicit product decision for off-processor manual records — but it will disqualify you from obtaining a payment processor/merchant account and materially raises liability. Revisit before you take real card data at any scale.
- **Storing full card numbers (PANs)** puts the whole system in PCI-DSS scope (SAQ D). The compliant alternative is tokenization via a PCI-compliant provider so raw PANs never hit your server.
- **Operating a crypto-to-fiat exchange** is almost certainly a **money services business**: FinCEN registration, state money-transmitter licenses, and a real AML/KYC program. Get qualified legal counsel before processing real transactions.
- The Privacy Policy and Terms shipped with the site are **drafts** — have a lawyer review them.

None of the engineering above substitutes for that legal/compliance work. It reduces technical risk; it does not make the operation compliant on its own.
