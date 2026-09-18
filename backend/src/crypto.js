import crypto from 'node:crypto';
import config from './config.js';

// Field-level encryption for sensitive payout data.
// AES-256-GCM with a random 96-bit IV per value. Stored format (base64):
//   [ 12-byte IV | 16-byte auth tag | ciphertext ]
//
// The master key (config.dataKey) lives only in the environment, never in the DB.
// UPGRADE PATH (documented in SECURITY.md): move to envelope encryption with
// per-record data keys wrapped by a KMS/HSM so the master key never sits on the box.

const ALGO = 'aes-256-gcm';

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, config.dataKey, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decrypt(blob) {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, config.dataKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

// Encrypt/decrypt a JS object as one blob.
export function encryptJSON(obj) { return encrypt(JSON.stringify(obj)); }
export function decryptJSON(blob) { return JSON.parse(decrypt(blob)); }

export function orderRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = 'ORD-';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) r += chars[bytes[i] % chars.length];
  return r;
}
