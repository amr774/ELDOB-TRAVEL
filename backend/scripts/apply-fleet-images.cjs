'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});
const db = new PrismaClient({ log: [] });
async function main() {
  const connection = new URL(process.env.DATABASE_URL);
  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname) ||
    connection.pathname !== '/eldob_travel'
  )
    throw new Error('Local database only');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fleet-images.manifest.json'), 'utf8'),
  );
  const uploadDir =
    process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
  const records = [];
  for (const entry of manifest) {
    if (!/^[a-z0-9-]+$/.test(entry.slug)) throw new Error('Invalid asset name');
    const bytes = fs.readFileSync(entry.source);
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
      throw new Error('Invalid PNG');
    const car = await db.car.findUnique({
      where: { id: entry.id },
      select: { id: true, name: true, year: true, image: true, images: true },
    });
    if (!car || car.year !== entry.year)
      throw new Error('Fleet record changed');
    const filename = `fleet-illustrative-${entry.slug}.png`;
    records.push({
      ...entry,
      previous: car,
      filename,
      url: `/uploads/${filename}`,
      bytes,
      target: path.join(uploadDir, filename),
    });
  }
  console.log(`Verified ${records.length} assets and local fleet records.`);
  if (!process.argv.includes('--apply')) return;
  fs.mkdirSync(uploadDir, { recursive: true });
  const backup = path.join(uploadDir, `fleet-image-backup-${Date.now()}.json`);
  fs.writeFileSync(
    backup,
    JSON.stringify(
      records.map((r) => ({
        id: r.id,
        previous: r.previous,
        image: r.url,
        source: r.source,
      })),
      null,
      2,
    ),
    { flag: 'wx' },
  );
  for (const r of records) {
    if (fs.existsSync(r.target)) {
      const hash = (value) =>
        crypto.createHash('sha256').update(value).digest('hex');
      if (hash(fs.readFileSync(r.target)) !== hash(r.bytes))
        throw new Error('Asset already exists with different contents');
    } else fs.writeFileSync(r.target, r.bytes, { flag: 'wx' });
  }
  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const r of records) {
      const result = await tx.car.updateMany({
        where: { id: r.id, image: '', images: { equals: [] } },
        data: { image: r.url },
      });
      updated += result.count;
    }
  });
  console.log(
    `Linked ${updated} images. Existing non-empty galleries were preserved. Backup: ${path.basename(backup)}`,
  );
  const verified = await db.car.count({
    where: {
      id: { in: records.map((r) => r.id) },
      image: { in: records.map((r) => r.url) },
    },
  });
  console.log(`Verified ${verified} fleet image links.`);
}
main()
  .catch(() => {
    console.error(
      'Fleet image import stopped. No sensitive diagnostics printed. Review the manifest and local state before retrying.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
