const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
require('dotenv').config({ quiet: true });
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/eldob_travel') throw new Error('Local ELDOB database required');
  const db = new PrismaClient();
  try {
    const applied = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    const pending = fs.readdirSync('prisma/migrations', { withFileTypes: true }).filter(x => x.isDirectory() && !applied.some(a => a.migration_name === x.name)).map(x => x.name);
    if (pending.some(x => x !== '20261022000100_hotel_catalog')) throw new Error('Unexpected pending migrations; stopped');
    const counts = () => Promise.all([db.user.count(), db.car.count(), db.booking.count(), db.serviceRequest.count(), db.payment.count()]);
    const before = await counts();
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Migration failed; inspect local Prisma status');
    const after = await counts();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Record counts changed; inspect before proceeding');
    console.log('PASS: additive hotel migration applied locally; all existing record counts unchanged.');
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
