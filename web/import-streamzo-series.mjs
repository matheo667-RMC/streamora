import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE = 'https://streamzo.fr';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const START = parseInt(process.argv[2] || '1', 10);
const END = parseInt(process.argv[3] || '166', 10);

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
  return s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
}

const CAT_NAMES = {
  'action': 'Action', 'action-aventure': 'Action & Aventure', 'animation': 'Animation',
  'aventure': 'Aventure', 'comedie': 'Comédie', 'crime': 'Crime', 'documentaire': 'Documentaire',
  'drame': 'Drame', 'familial': 'Familial', 'fantastique': 'Fantastique', 'guerre': 'Guerre',
  'histoire': 'Histoire', 'horreur': 'Horreur', 'musique': 'Musique', 'mystere': 'Mystère',
  'policier': 'Policier', 'romance': 'Romance', 'science-fiction': 'Science-Fiction',
  'spectacle': 'Spectacle', 'telefilm': 'Téléfilm', 'thriller': 'Thriller', 'western': 'Western',
  'autres': 'Autre',
};

function parseSeries(html) {
  const titleM = html.match(/<h1[^>]*class="detail-title"[^>]*>\s*([^<]+)/i) || html.match(/<title>\s*(.+?)\s*—/i);
  const title = titleM ? decode(titleM[1]) : null;
  if (!title) return null;

  const posM = html.match(/og:image"\s+content="([^"]+)"/i);
  const posterUrl = posM ? posM[1] : '';
  const descM = html.match(/name="description"\s+content="([^"]+)"/i);
  const description = descM ? decode(descM[1]) : '';
  const cats = [...html.matchAll(/href="\/category\/([a-z0-9-]+)"/gi)].map((m) => m[1]).filter((c) => CAT_NAMES[c]);
  const category = cats.length ? CAT_NAMES[cats[0]] : 'Série';

  // Each episode button: class="sd-ep" data-season data-lang data-ep data-src
  const btns = [...html.matchAll(/<button[^>]*class="sd-ep"[^>]*>/gi)].map((m) => m[0]);
  // Group by season+ep, prefer VF
  const map = new Map(); // key `${s}-${e}` -> {season,number,videoUrl,lang}
  for (const b of btns) {
    const s = parseInt((b.match(/data-season="(\d+)"/) || [])[1] || '1', 10);
    const e = parseInt((b.match(/data-ep="(\d+)"/) || [])[1] || '0', 10);
    const lang = (b.match(/data-lang="([^"]+)"/) || [])[1] || '';
    const src = (b.match(/data-src="([^"]+)"/) || [])[1] || '';
    if (!e || !src) continue;
    const ref = src.replace(/^\/embed\//, '');
    const key = `${s}-${e}`;
    const cur = map.get(key);
    if (!cur || (lang === 'vf' && cur.lang !== 'vf')) {
      map.set(key, { season: s, number: e, videoUrl: `streamzo:${ref}`, lang });
    }
  }
  const episodes = [...map.values()].sort((a, b) => a.season - b.season || a.number - b.number);
  if (episodes.length === 0) return null;
  return { title, posterUrl, category, description, episodes };
}

let added = 0, updated = 0, epAdded = 0, failed = 0;

for (let page = START; page <= END; page++) {
  const list = await get(page === 1 ? `${BASE}/series` : `${BASE}/series?page=${page}`);
  if (!list) { console.log(`page ${page}: list failed`); continue; }
  const slugs = [...new Set([...list.matchAll(/href="\/series\/([a-z0-9-]+)"/gi)].map((m) => m[1]))];

  for (const slug of slugs) {
    const html = await get(`${BASE}/series/${slug}`);
    if (!html) { failed++; continue; }
    const s = parseSeries(html);
    if (!s) { failed++; continue; }
    const yearM = slug.match(/-(\d{4})$/);
    const year = yearM ? parseInt(yearM[1], 10) : 2024;

    let series = await prisma.series.findFirst({ where: { title: s.title } });
    if (!series) {
      series = await prisma.series.create({ data: { title: s.title, description: s.description, category: s.category, posterUrl: s.posterUrl, year, tmdbId: null } });
      added++;
    } else {
      updated++;
    }
    for (const ep of s.episodes) {
      const exists = await prisma.episode.findFirst({ where: { seriesId: series.id, season: ep.season, number: ep.number } });
      if (exists) {
        if (!exists.videoUrl.startsWith('streamzo:')) {
          await prisma.episode.update({ where: { id: exists.id }, data: { videoUrl: ep.videoUrl } });
        }
      } else {
        await prisma.episode.create({ data: { seriesId: series.id, season: ep.season, number: ep.number, title: `Episode ${ep.number}`, videoUrl: ep.videoUrl, duration: '' } });
        epAdded++;
      }
    }
    await sleep(500);
  }
  console.log(`[${START}] page ${page}/${END} | series+=${added} upd=${updated} eps+=${epAdded} fail=${failed}`);
}

console.log(`DONE streamzo series: added=${added} updated=${updated} eps=${epAdded} failed=${failed}`);
await prisma.$disconnect();
