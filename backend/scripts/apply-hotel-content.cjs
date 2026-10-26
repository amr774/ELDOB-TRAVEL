'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const db = new PrismaClient({ log: [] });
async function main() {
  const target = new URL(process.env.DATABASE_URL);
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/eldob_travel') throw new Error('Local ELDOB database only');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'hotel-content.manifest.json'), 'utf8'));
  const hotels = await db.hotel.findMany();
  const entries = [];
  for (const item of manifest) {
    const matches = hotels.filter(h => h.name === item.name);
    if (matches.length !== 1) throw new Error(`Hotel match must be unique: ${item.name}`);
    const hotel = matches[0];
    if (hotel.description || hotel.image) throw new Error(`Hotel already has content; stopped: ${item.name}`);
    const url = new URL(item.image);
    if (url.protocol !== 'https:' || url.username || url.password || !item.description || item.description.length > 3000) throw new Error('Invalid content');
    entries.push({ hotel, item });
  }
  await Promise.all(entries.map(async ({ item }) => {
    const response = await fetch(item.image, { signal: AbortSignal.timeout(25000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image unavailable: ${item.name}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 1000) throw new Error(`Placeholder image rejected: ${item.name}`);
  }));
  if (!process.argv.includes('--apply')) { console.log(`Validated ${entries.length} hotels and exterior image URLs. Dry run only.`); return; }
  const backup = path.join(__dirname, '..', 'uploads', `hotel-content-before-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(hotels, null, 2), { flag: 'wx' });
  await db.$transaction(async tx => {
    for (const { hotel, item } of entries) {
      const result = await tx.hotel.updateMany({ where: { id: hotel.id, name: hotel.name, updatedAt: hotel.updatedAt, description: '', image: '' }, data: { description: item.description, image: item.image } });
      if (result.count !== 1) throw new Error('Concurrent edit detected; changes rolled back');
    }
    const after = await tx.hotel.findMany();
    for (const old of hotels) {
      const current = after.find(h => h.id === old.id);
      if (!current) throw new Error('Hotel record missing');
      for (const field of ['name', 'city', 'stars', 'pricePerNight', 'available']) {
        if (old[field] !== current[field]) throw new Error(`Unexpected change: ${field}`);
      }
    }
  });
  console.log(`PASS: ${entries.length} hotel descriptions and exterior image links saved. Other listing fields preserved. Backup: ${path.basename(backup)}`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
