// src/db.js
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no esta configurada. Define una conexion PostgreSQL en .env para este entorno.');
}

const poolConfig = { connectionString: process.env.DATABASE_URL };

const dbSslEnv = (process.env.DB_SSL || '').toLowerCase();
if (dbSslEnv === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
} else if (dbSslEnv === 'false') {
  poolConfig.ssl = false;
} else {
  const localHosts = ['localhost', '127.0.0.1', '@db', '@alumco-db'];
  const isLocal = localHosts.some((h) => process.env.DATABASE_URL.includes(h));
  poolConfig.ssl = isLocal ? false : { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.connect()
  .then((client) => {
    console.log('✅ Conectado a PostgreSQL');
    client.release();
  })
  .catch((err) => console.error('❌ Error conectando a PostgreSQL:', err.message));

module.exports = pool;
