import { query } from './db.js';

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

// Per-identifier (email/ip) lockout on top of IP rate limiting.
export async function tooManyFailures(scope, identifier) {
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM login_attempts
      WHERE scope = $1 AND identifier = $2 AND success = false
        AND created_at > now() - ($3 || ' minutes')::interval`,
    [scope, identifier, WINDOW_MINUTES]
  );
  return rows[0].n >= MAX_FAILURES;
}

export async function recordAttempt(scope, identifier, success, ip) {
  await query(
    'INSERT INTO login_attempts (scope, identifier, success, ip) VALUES ($1,$2,$3,$4)',
    [scope, identifier, success, ip]
  );
}
