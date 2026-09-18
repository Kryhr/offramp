import pg from 'pg';
import config, { isProd } from './config.js';

// Numeric columns come back as strings by default in node-postgres, which is
// what we want for money/crypto amounts (no float rounding). Leave as-is.

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
