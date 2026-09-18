// Create an admin account. Usage:
//   node src/createAdmin.js <email> <password> [--2fa]
// With --2fa it prints a TOTP secret + otpauth URL to add to your authenticator app.
import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { pool, query } from './db.js';

const [, , email, password, flag] = process.argv;

if (!email || !password) {
  console.error('Usage: node src/createAdmin.js <email> <password> [--2fa]');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Choose an admin password of at least 12 characters.');
  process.exit(1);
}

try {
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  let totp = null;
  if (flag === '--2fa') {
    totp = authenticator.generateSecret();
  }
  const { rows } = await query(
    `INSERT INTO admins (email, password_hash, role, totp_secret)
     VALUES ($1,$2,'owner',$3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, email`,
    [email.toLowerCase(), hash, totp]
  );
  console.log('Admin ready:', rows[0].email);
  if (totp) {
    console.log('\n2FA secret:', totp);
    console.log('Add to your authenticator app, or use this otpauth URL:');
    console.log(authenticator.keyuri(email, 'Cashra Admin', totp));
  }
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
