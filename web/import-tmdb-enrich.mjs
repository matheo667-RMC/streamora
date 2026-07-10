import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const KEY = '4e2f8bed54601f3f2b98de4dc0dc7aa9';
const IMG = 'https://image.tmdb.org/t/p/w500';
const START = parseInt(process.argv[2] || '0', 10);
const END = parseInt(process.argv[3] || '999999', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GENRES = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Familial', 14: 'Fantastique', 36: 'Histoire',
  27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction',
  10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
};

async function tmdb(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 429) { await sleep(2000); continue; }
      if (res.ok) return await res.json();
    } catch { clearTimeout(t); }
    await sleep(500);
  }
  return null;
}

const films = await prisma.film.findMany({
  where: { posterUrl: '' },
  select: { id: true, title: true, year: true },
  orderBy: { id: 'asc' },
});
console.log(`films needing posters: ${films.length}`);
const slice = films.slice(START, END);

let updated = 0, nomatch = 0, i = 0;
for (const f of slice) {
  i++;
  const q = encodeURIComponent(f.title);
  const data = await tmdb(`https://api.themoviedb.org/3/search/movie?api_key=${KEY}&language=fr-FR&include_adult=false&query=${q}${f.year ? `&year=${f.year}` : ''}`);
  const hit = data && data.results && data.results.find((r) => r.poster_path) || (data && data.results && data.results[0]);
  if (hit && hit.poster_path) {
    const cat = (hit.genre_ids || []).map((g) => GENRES[g]).find(Boolean) || 'Film';
    const year = hit.release_date ? parseInt(hit.release_date.slice(0, 4), 10) : f.year;
    await prisma.film.update({
      where: { id: f.id },
      data: {
        title: hit.title || f.title,
        posterUrl: IMG + hit.poster_path,
        description: hit.overview || '',
        category: cat,
        year: year || f.year,
      },
    });
    updated++;
  } else {
    nomatch++;
  }
  await sleep(110);
  if (i % 200 === 0) console.log(`[${START}] ${i}/${slice.length} updated=${updated} nomatch=${nomatch}`);
}
console.log(`DONE tmdb enrich [${START}]: updated=${updated} nomatch=${nomatch}`);
await prisma.$disconnect();
