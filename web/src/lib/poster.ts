const TMDB_KEY = "4e2f8bed54601f3f2b98de4dc0dc7aa9";

type Kind = "movie" | "tv";

async function json(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Affiche d'un titre TMDB connu, toutes langues confondues : la fiche
 *  francaise est parfois vide alors que l'affiche existe en anglais. */
async function tmdbImages(tmdbId: number, kind: Kind): Promise<string> {
  const data = await json(
    `https://api.themoviedb.org/3/${kind}/${tmdbId}/images?include_image_language=fr,en,null&api_key=${TMDB_KEY}`
  );
  const posters = (data?.posters as { file_path?: string }[] | undefined) || [];
  const path = posters.find((p) => p.file_path)?.file_path;
  return path ? `https://image.tmdb.org/t/p/w780${path}` : "";
}

async function tmdbSearch(title: string, kind: Kind, lang: string): Promise<string> {
  const data = await json(
    `https://api.themoviedb.org/3/search/${kind}?query=${encodeURIComponent(title)}` +
      `&language=${lang}&page=1&api_key=${TMDB_KEY}`
  );
  const hit = (data?.results as { poster_path?: string }[] | undefined)?.[0];
  return hit?.poster_path ? `https://image.tmdb.org/t/p/w780${hit.poster_path}` : "";
}

/** Boutique iTunes : gratuite, sans cle, et couvre beaucoup de films que TMDB
 *  n'illustre pas. */
async function itunes(title: string, kind: Kind): Promise<string> {
  const media = kind === "tv" ? "tvShow" : "movie";
  const data = await json(
    `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=${media}&limit=1&country=FR`
  );
  const art = (data?.results as { artworkUrl100?: string }[] | undefined)?.[0]?.artworkUrl100;
  return art ? art.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg") : "";
}

/** Derniere chance : l'image de l'article Wikipedia du titre. */
async function wikipedia(title: string): Promise<string> {
  for (const lang of ["fr", "en"]) {
    const data = await json(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    const src = (data?.originalimage as { source?: string } | undefined)?.source
      || (data?.thumbnail as { source?: string } | undefined)?.source;
    if (src) return src;
  }
  return "";
}

/** Cherche une affiche partout jusqu'a en trouver une : aucun titre ne doit
 *  rester avec une case vide dans le catalogue. */
export async function findPoster(
  title: string,
  kind: Kind,
  tmdbId?: number | null
): Promise<string> {
  if (tmdbId) {
    const fromId = await tmdbImages(tmdbId, kind);
    if (fromId) return fromId;
  }
  for (const lang of ["fr-FR", "en-US"]) {
    const found = await tmdbSearch(title, kind, lang);
    if (found) return found;
  }
  const other = kind === "movie" ? "tv" : "movie";
  const crossed = await tmdbSearch(title, other as Kind, "fr-FR");
  if (crossed) return crossed;

  return (await itunes(title, kind)) || (await wikipedia(title));
}
