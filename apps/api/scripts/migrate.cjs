// Uses the same journal/table as drizzle-kit, without shipping the development CLI.
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

async function main() {
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be set explicitly');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(__dirname, '../drizzle') });
    console.log('Database migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error('Database migration failed; inspect the database and migration files privately.');
  process.exitCode = 1;
});
