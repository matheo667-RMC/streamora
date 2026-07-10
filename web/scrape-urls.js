const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE = "https://papystreaming.top";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function decodeHtml(s) {
  return s.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractVideoUrl(html) {
  // Look for iframe src in player
  const iframeMatch = html.match(/<iframe[^>]*id="seriePlayers"[^>]*src="([^"]+)"/);
  if (iframeMatch) return iframeMatch[1];
  
  // Fallback: look for data-url-default
  const dataMatch = html.match(/data-url-default="([^"]+)"/);
  if (dataMatch) return dataMatch[1];
  
  // Fallback: any embed iframe
  const embedMatch = html.match(/<iframe[^>]*src="(https?:\/\/[^"]*embed[^"]*)"/);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

function extractEpisodeUrls(html) {
  // Find all player options with versions for episodes
  const episodes = [];
  
  // Look for episode links/buttons
  const epRegex = /data-url[^=]*="(https?:\/\/[^"]+)"[^>]*>[^<]*(?:pisode|Ep\.?\s*\d|E\d)/gi;
  let m;
  while ((m = epRegex.exec(html)) !== null) {
    episodes.push(m[1]);
  }
  
  return episodes;
}

async function scrapeFilmUrls() {
  console.log("=== SCRAPING FILM VIDEO URLS ===\n");
  
  // Get all films from DB that don't have a video URL
  const films = await prisma.film.findMany({
    where: { videoUrl: "" },
    select: { id: true, title: true },
  });
  
  console.log(`Films without video URL: ${films.length}\n`);
  
  // Build a mapping of film titles to papystreaming URLs
  // First, scrape listing pages to get detail URLs
  const filmUrls = new Map();
  
  for (let page = 1; page <= 15; page++) {
    try {
      const url = page === 1 ? `${BASE}/film/` : `${BASE}/film/page/${page}/`;
      const html = await fetchPage(url);
      
      // Extract film links
      const regex = /<a[^>]*href="(\/film\/[^"]+\.html)"[^>]*>\s*<img[^>]*\/?>\s*([\s\S]*?)<\/a>/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        const path = m[1];
        const title = m[2].replace(/<[^>]+>/g, "").trim().replace(/&#39;/g, "'").replace(/&amp;/g, "&");
        filmUrls.set(title.toLowerCase(), `${BASE}${path}`);
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`  Page ${page} error: ${e.message}`);
    }
  }
  
  console.log(`Found ${filmUrls.size} film URLs from listings\n`);
  
  let updated = 0;
  for (const film of films) {
    const titleLower = film.title.toLowerCase();
    const detailUrl = filmUrls.get(titleLower);
    
    if (!detailUrl) continue;
    
    try {
      const html = await fetchPage(detailUrl);
      const videoUrl = extractVideoUrl(html);
      
      if (videoUrl) {
        await prisma.film.update({
          where: { id: film.id },
          data: { videoUrl },
        });
        updated++;
        console.log(`  + ${film.title} -> ${videoUrl.substring(0, 50)}...`);
      }
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      // skip
    }
  }
  
  console.log(`\nFilms updated with video URLs: ${updated}`);
}

async function scrapeSeriesUrls() {
  console.log("\n=== SCRAPING SERIES VIDEO URLS ===\n");
  
  // Get series with episodes that have no video URL
  const series = await prisma.series.findMany({
    include: {
      episodes: {
        where: { videoUrl: "" },
        orderBy: [{ season: "asc" }, { number: "asc" }],
      },
    },
  });
  
  const seriesWithEmptyEps = series.filter(s => s.episodes.length > 0);
  console.log(`Series with empty episode URLs: ${seriesWithEmptyEps.length}\n`);
  
  // Build series URL mapping from listing pages
  const seriesUrls = new Map();
  
  for (let page = 1; page <= 15; page++) {
    try {
      const url = page === 1 ? `${BASE}/serie/` : `${BASE}/serie/page/${page}/`;
      const html = await fetchPage(url);
      
      const regex = /<a[^>]*href="(\/serie\/[^"]+)"[^>]*>\s*<img[^>]*\/?>\s*([\s\S]*?)<\/a>/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        const path = m[1];
        const title = m[2].replace(/<[^>]+>/g, "").trim().replace(/&#39;/g, "'").replace(/&amp;/g, "&");
        seriesUrls.set(title.toLowerCase(), `${BASE}${path}`);
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`  Page ${page} error: ${e.message}`);
    }
  }
  
  // Also check film listing pages since they mix series
  for (let page = 1; page <= 10; page++) {
    try {
      const url = page === 1 ? `${BASE}/film/` : `${BASE}/film/page/${page}/`;
      const html = await fetchPage(url);
      
      const regex = /<a[^>]*href="(\/serie\/[^"]+)"[^>]*>\s*<img[^>]*\/?>\s*([\s\S]*?)<\/a>/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        const path = m[1];
        const title = m[2].replace(/<[^>]+>/g, "").trim().replace(/&#39;/g, "'").replace(/&amp;/g, "&");
        seriesUrls.set(title.toLowerCase(), `${BASE}${path}`);
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {}
  }
  
  console.log(`Found ${seriesUrls.size} series URLs from listings\n`);
  
  let updatedSeries = 0;
  let updatedEps = 0;
  
  for (const s of seriesWithEmptyEps) {
    const titleLower = s.title.toLowerCase();
    const detailUrl = seriesUrls.get(titleLower);
    
    if (!detailUrl) continue;
    
    try {
      const html = await fetchPage(detailUrl);
      
      // Get the main video URL (first episode typically)
      const mainUrl = extractVideoUrl(html);
      
      // Find all player option URLs for episodes
      const allUrls = [];
      const urlRegex = /data-url(?:-default)?="(https?:\/\/[^"]+)"/g;
      let m;
      while ((m = urlRegex.exec(html)) !== null) {
        if (!allUrls.includes(m[1])) allUrls.push(m[1]);
      }
      
      // Also check for episode-specific iframes
      const epIframeRegex = /data-url="(https?:\/\/[^"]+)"[^>]*>(?:[^<]*(?:pisode|Ep|E)\s*(\d+))?/gi;
      while ((m = epIframeRegex.exec(html)) !== null) {
        if (!allUrls.includes(m[1])) allUrls.push(m[1]);
      }
      
      if (mainUrl || allUrls.length > 0) {
        // Assign the first video URL to all episodes (they share the player page)
        const videoUrl = mainUrl || allUrls[0];
        
        if (videoUrl) {
          // Update first episode with the main URL
          for (const ep of s.episodes) {
            await prisma.episode.update({
              where: { id: ep.id },
              data: { videoUrl },
            });
            updatedEps++;
          }
          updatedSeries++;
          console.log(`  + ${s.title} (${s.episodes.length} eps) -> ${videoUrl.substring(0, 50)}...`);
        }
      }
      
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      // skip
    }
  }
  
  console.log(`\nSeries updated: ${updatedSeries}, Episodes updated: ${updatedEps}`);
}

async function main() {
  await scrapeFilmUrls();
  await scrapeSeriesUrls();
  
  // Final counts
  const filmsWithUrl = await prisma.film.count({ where: { NOT: { videoUrl: "" } } });
  const epsWithUrl = await prisma.episode.count({ where: { NOT: { videoUrl: "" } } });
  const totalFilms = await prisma.film.count();
  const totalEps = await prisma.episode.count();
  
  console.log(`\n=== FINAL ===`);
  console.log(`Films with video: ${filmsWithUrl}/${totalFilms}`);
  console.log(`Episodes with video: ${epsWithUrl}/${totalEps}`);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
