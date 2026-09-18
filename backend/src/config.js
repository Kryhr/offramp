import dotenv from 'dotenv';
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v || v.startsWith('CHANGE_ME')) {
    throw new Error(`Missing/placeholder env var: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return v;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:8090',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  adminJwtSecret: required('ADMIN_JWT_SECRET'),
  dataKey: Buffer.from(required('DATA_ENCRYPTION_KEY'), 'base64'),
  tokenTtl: process.env.TOKEN_TTL || '2h',
  adminTokenTtl: process.env.ADMIN_TOKEN_TTL || '8h'
};

if (config.dataKey.length !== 32) {
  throw new Error('DATA_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 of 32 random bytes).');
}

export default config;
export const isProd = config.env === 'production';
