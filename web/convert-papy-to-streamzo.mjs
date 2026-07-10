import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE = 'https://streamzo.fr';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124';
const DELETE_UNMATCHED = process.argv[2] === 'delete';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const res = await fetch(`${BASE}/sitemap.xml`, { headers: { 'User-Agent': UA } });
const sm = await res.text();
const slugs = [...sm.matchAll(/<loc>\s*https?:\/\/streamzo\.fr\/([^<\/]+)\s*<\/loc>/gi)]
  .map((m) => m[1]).filter((p) => !p.includes('/') && p !== 'categories' && p !== 'series');
const map = new Map();
for (const slug of slugs) {
  const key = norm(slug.replace(/-(\d{4})$/, ''));
  if (!map.has(key)) map.set(key, slug);
}
console.log(`sitemap slugs: ${slugs.length}, unique keys: ${map.size}`);

const films = await prisma.film.findMany({
  where: { NOT: { videoUrl: { startsWith: 'streamzo:' } } },
  select: { id: true, title: true },
});
console.log(`non-streamzo films: ${films.length}`);

let converted = 0, deleted = 0, kept = 0;
for (const f of films) {
  const slug = map.get(norm(f.title));
  if (slug) {
    await prisma.film.update({ where: { id: f.id }, data: { videoUrl: `streamzo:slug:${slug}` } });
    converted++;
  } else if (DELETE_UNMATCHED) {
    await prisma.film.delete({ where: { id: f.id } });
    deleted++;
  } else {
    kept++;
  }
  if ((converted + deleted + kept) % 500 === 0) console.log(`converted=${converted} deleted=${deleted} kept=${kept}`);
}
console.log(`DONE: converted=${converted} deleted=${deleted} kept=${kept}`);
await prisma.$disconnect();
