import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE = 'https://streamzo.fr';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function prettify(slug) {
  const noYear = slug.replace(/-(\d{4})$/, '');
  return noYear
    .split('-')
    .filter(Boolean)
    .map((w) => (w.length <= 2 && /^(de|du|la|le|les|un|une|et|a|d|l|the)$/i.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim();
}

async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (res.ok) return await res.text();
  } catch { clearTimeout(t); }
  return null;
}

const sm = await get(`${BASE}/sitemap.xml`);
if (!sm) { console.log('sitemap failed'); process.exit(1); }
const slugs = [...sm.matchAll(/<loc>\s*https?:\/\/streamzo\.fr\/([^<\/]+)\s*<\/loc>/gi)]
  .map((m) => m[1])
  .filter((p) => !p.includes('/') && p !== 'categories' && p !== 'series' && p.length > 0);
console.log(`sitemap: ${slugs.length} film slugs`);

// Existing titles (lowercased) to dedup
const existing = new Set((await prisma.film.findMany({ select: { title: true } })).map((f) => f.title.toLowerCase()));
console.log(`existing films: ${existing.size}`);

let added = 0, skipped = 0;
let batch = [];
for (const slug of slugs) {
  const title = prettify(slug);
  if (!title || existing.has(title.toLowerCase())) { skipped++; continue; }
  existing.add(title.toLowerCase());
  const yearM = slug.match(/-(\d{4})$/);
  const year = yearM ? parseInt(yearM[1], 10) : 2024;
  batch.push({ title, description: '', category: 'Film', posterUrl: '', videoUrl: `streamzo:slug:${slug}`, year, tmdbId: null });
  if (batch.length >= 500) {
    await prisma.film.createMany({ data: batch, skipDuplicates: true });
    added += batch.length; batch = [];
    console.log(`added ~${added} skipped ${skipped}`);
  }
}
if (batch.length) { await prisma.film.createMany({ data: batch, skipDuplicates: true }); added += batch.length; }

console.log(`DONE sitemap import: added=${added} skipped=${skipped}`);
await prisma.$disconnect();
