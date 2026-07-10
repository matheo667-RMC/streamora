import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE = 'https://streamzo.fr';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const START = parseInt(process.argv[2] || '0', 10);
const END = parseInt(process.argv[3] || '999999', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': BASE + '/' }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return await res.text();
      if (res.status === 429) { await sleep(15000 + i * 15000); continue; }
    } catch { clearTimeout(t); /* retry */ }
    await sleep(1000);
  }
  return null;
}

function decode(s) {
  return s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&eacute;/g, 'é').trim();
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

const CAT_NAMES = {
  'action': 'Action', 'action-aventure': 'Action & Aventure', 'animation': 'Animation',
  'aventure': 'Aventure', 'comedie': 'Comédie', 'crime': 'Crime', 'documentaire': 'Documentaire',
  'drame': 'Drame', 'familial': 'Familial', 'fantastique': 'Fantastique', 'guerre': 'Guerre',
  'histoire': 'Histoire', 'horreur': 'Horreur', 'musique': 'Musique', 'mystere': 'Mystère',
  'policier': 'Policier', 'romance': 'Romance', 'science-fiction': 'Science-Fiction',
  'spectacle': 'Spectacle', 'telefilm': 'Téléfilm', 'thriller': 'Thriller', 'western': 'Western',
  'autres': 'Autre',
};

function parseFilm(html) {
  const titleM = html.match(/<h1[^>]*class="detail-title"[^>]*>\s*([^<]+)/i) || html.match(/<title>\s*(.+?)\s*—/i);
  const title = titleM ? decode(titleM[1]) : null;
  if (!title) return null;

  const embM = html.match(/src="\/embed\/([^"]+)"/i);
  if (!embM) return null;
  const videoUrl = `streamzo:${embM[1]}`;

  const posM = html.match(/og:image"\s+content="([^"]+)"/i);
  const posterUrl = posM ? posM[1] : '';

  const descM = html.match(/name="description"\s+content="([^"]+)"/i);
  const description = descM ? decode(descM[1]) : '';

  const cats = [...html.matchAll(/href="\/category\/([a-z0-9-]+)"/gi)].map((m) => m[1])
    .filter((c) => CAT_NAMES[c]);
  const category = cats.length ? CAT_NAMES[cats[0]] : 'Autre';

  return { title, posterUrl, category, description, videoUrl };
}

// Load film slugs from sitemap
const sm = await get(`${BASE}/sitemap.xml`);
if (!sm) { console.log('sitemap fetch failed'); process.exit(1); }
const slugs = [...sm.matchAll(/<loc>\s*https?:\/\/streamzo\.fr\/([^<\/]+)\s*<\/loc>/gi)]
  .map((m) => m[1])
  .filter((p) => !p.includes('/') && p !== 'categories' && p !== 'series' && p.length > 0);
console.log(`sitemap: ${slugs.length} film slugs`);

let added = 0, updated = 0, skipped = 0, failed = 0;
const slice = slugs.slice(START, END);

for (let i = 0; i < slice.length; i++) {
  const slug = slice[i];
  const yearM = slug.match(/-(\d{4})$/);
  const year = yearM ? parseInt(yearM[1], 10) : 2024;
  const html = await get(`${BASE}/${slug}`);
  if (!html) { failed++; continue; }
  const f = parseFilm(html);
  if (!f) { failed++; continue; }

  const exists = await prisma.film.findFirst({ where: { title: f.title } });
  if (exists) {
    if (!exists.videoUrl.startsWith('streamzo:')) {
      await prisma.film.update({ where: { id: exists.id }, data: { videoUrl: f.videoUrl, posterUrl: f.posterUrl || exists.posterUrl } });
      updated++;
    } else { skipped++; }
  } else {
    await prisma.film.create({ data: { title: f.title, description: f.description, category: f.category, posterUrl: f.posterUrl, videoUrl: f.videoUrl, year, tmdbId: null } });
    added++;
  }
  await sleep(500);
  if ((i + 1) % 100 === 0) console.log(`[${START}] ${i + 1}/${slice.length} | added=${added} updated=${updated} skipped=${skipped} failed=${failed}`);
}

console.log(`DONE streamzo films: added=${added} updated=${updated} skipped=${skipped} failed=${failed}`);
await prisma.$disconnect();
