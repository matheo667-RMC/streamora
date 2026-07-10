import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Cobra Kai vidoza URLs
const cobraKaiUrls = {
  'S1E1': 'https://vidoza.net/embed-hf6rfdxikzrq.html',
  'S1E2': 'https://vidoza.net/embed-tp34pgdh2e87.html',
  'S1E3': 'https://vidoza.net/embed-bk29fdln1dny.html',
  'S1E4': 'https://vidoza.net/embed-t5celt3wtcem.html',
  'S1E5': 'https://vidoza.net/embed-e37nhiwpvgix.html',
  'S1E6': 'https://vidoza.net/embed-m94hr5o3zrvi.html',
  'S1E7': 'https://vidoza.net/embed-28jym3yf3jiu.html',
  'S1E8': 'https://vidoza.net/embed-mgo86g66dv0f.html',
  'S1E9': 'https://vidoza.net/embed-7sboyz8t2vsr.html',
  'S1E10': 'https://vidoza.net/embed-84ckitkt5v8x.html',
  'S2E1': 'https://vidoza.net/embed-7oquxhx0f6pg.html',
  'S2E2': 'https://vidoza.net/embed-fk4c4k7dyrqg.html',
  'S2E3': 'https://vidoza.net/embed-lcpishr94xc5.html',
  'S2E4': 'https://vidoza.net/embed-2atjecasfc1y.html',
  'S2E5': 'https://vidoza.net/embed-2liy9uw1f2jg.html',
  'S2E6': 'https://vidoza.net/embed-a0lm6tugyw5o.html',
  'S2E7': 'https://vidoza.net/embed-x0udzalyrawp.html',
  'S2E8': 'https://vidoza.net/embed-6m0p544ztroh.html',
  'S2E9': 'https://vidoza.net/embed-tkr8fsi4f66t.html',
  'S2E10': 'https://vidoza.net/embed-jmvg1tbwdqq3.html',
  'S3E1': 'https://vidoza.net/embed-41byuzc5f69i.html',
  'S3E2': 'https://vidoza.net/embed-1mfjwu1u7u5f.html',
  'S3E3': 'https://vidoza.net/embed-220hch2vxxqq.html',
  'S3E4': 'https://vidoza.net/embed-yy1ghainneyc.html',
  'S3E5': 'https://vidoza.net/embed-3ks8yr208xw0.html',
  'S3E6': 'https://vidoza.net/embed-n061cfsjviqm.html',
  'S3E7': 'https://vidoza.net/embed-2u2oyxc0sbpa.html',
  'S3E8': 'https://vidoza.net/embed-byzo9bdsmxo7.html',
  'S3E9': 'https://vidoza.net/embed-ojmnsv61dkpx.html',
  'S3E10': 'https://vidoza.net/embed-7swl3b6en4z9.html',
  'S4E1': 'https://vidoza.net/embed-pz27q9fucbvf.html',
  'S4E2': 'https://vidoza.net/embed-olcxg4tlik4h.html',
  'S4E3': 'https://vidoza.net/embed-o3ojmo7i9ep7.html',
  'S4E4': 'https://vidoza.net/embed-07zr4ldyzifv.html',
  'S4E5': 'https://vidoza.net/embed-8jdyk94hozad.html',
  'S4E6': 'https://vidoza.net/embed-bw5kyvu95gqn.html',
  'S4E7': 'https://vidoza.net/embed-j8l4m852p9co.html',
  'S4E8': 'https://vidoza.net/embed-ly90ylok7wd9.html',
  'S4E9': 'https://vidoza.net/embed-4h7xqpjk0fur.html',
  'S4E10': 'https://vidoza.net/embed-64l8iudeqklj.html',
  'S5E1': 'https://vidoza.net/embed-gq6p2mkz2ysu.html',
  'S5E2': 'https://vidoza.net/embed-4g1mxe2s87c0.html',
  'S5E3': 'https://vidoza.net/embed-614gkzh20cwa.html',
  'S5E4': 'https://vidoza.net/embed-9bqthuujgtrm.html',
  'S5E5': 'https://vidoza.net/embed-n3q445tb3kin.html',
  'S5E6': 'https://vidoza.net/embed-lc0xpzp7gly8.html',
  'S5E7': 'https://vidoza.net/embed-pw0xb3it2z41.html',
  'S5E8': 'https://vidoza.net/embed-yococjioyyj4.html',
  'S5E9': 'https://vidoza.net/embed-qb97ov4ao1l5.html',
  'S5E10': 'https://vidoza.net/embed-vs72grnutcd3.html',
};

async function main() {
  // Find Cobra Kai series
  const cobraKai = await prisma.series.findFirst({ where: { title: { contains: 'Cobra Kai' } } });
  if (!cobraKai) {
    console.log('Cobra Kai not found');
    return;
  }
  console.log('Found Cobra Kai:', cobraKai.id);

  // Get all episodes
  const episodes = await prisma.episode.findMany({
    where: { seriesId: cobraKai.id },
    orderBy: [{ season: 'asc' }, { number: 'asc' }]
  });
  console.log('Total episodes:', episodes.length);

  let updated = 0;
  for (const ep of episodes) {
    const key = `S${ep.season}E${ep.number}`;
    const newUrl = cobraKaiUrls[key];
    if (newUrl) {
      await prisma.episode.update({
        where: { id: ep.id },
        data: { videoUrl: newUrl }
      });
      updated++;
      console.log(`Updated ${key}: ${newUrl}`);
    }
  }
  console.log(`Updated ${updated} episodes`);

  // Now add Napoleon film
  const napoleon = await prisma.film.findFirst({ where: { title: { contains: 'Napol' } } });
  if (napoleon) {
    console.log('Napoleon already exists, updating URL');
    await prisma.film.update({
      where: { id: napoleon.id },
      data: { videoUrl: 'https://vidoza.net/embed-6zgcmwih8lcz.html' }
    });
  } else {
    console.log('Adding Napoleon...');
    await prisma.film.create({
      data: {
        title: 'Napoléon',
        description: "Un regard personnel sur les origines de Napoléon Bonaparte et sa rapide et impitoyable ascension vers le titre d'empereur. Le film retrace la relation volatile de Napoléon avec sa femme et seul véritable amour, Joséphine, tout en montrant ses visionnaires stratégies militaires lors de certaines des batailles les plus dynamiques jamais filmées.",
        category: 'Drame,Historique,Action',
        year: 2023,
        posterUrl: 'https://image.tmdb.org/t/p/w500/vcZWJGvB5xydWuUO1oHFmEBsJxn.jpg',
        videoUrl: 'https://vidoza.net/embed-6zgcmwih8lcz.html',
        isHero: false,
      }
    });
    console.log('Napoleon added!');
  }

  // Also get all films that use nontongo.win and update them
  const nonongoFilms = await prisma.film.findMany({
    where: { videoUrl: { contains: 'nontongo' } }
  });
  console.log('Films with nontongo URLs:', nonongoFilms.length);
  for (const f of nonongoFilms) {
    console.log(`  - ${f.title}: ${f.videoUrl}`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
