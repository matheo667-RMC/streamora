export const runtime = "edge";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Resolves a streamzo embed reference (e.g. "vidzy.live/4150") to a fresh HLS
// playlist URL, then redirects to the HLS proxy so segments stream through us.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) return new Response("Missing ref", { status: 400 });

  async function fetchText(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Referer: "https://streamzo.fr/" },
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  // ref can be "slug:<film-slug>" (resolve the film page first to find the embed)
  // or a direct embed path like "vidzy.live/4150" or "vidzy.live/episode/21071".
  let embedPath = ref.replace(/^\/+/, "");
  if (embedPath.startsWith("slug:")) {
    const slug = embedPath.slice(5).replace(/^\/+/, "");
    const page = await fetchText(`https://streamzo.fr/${slug}`);
    if (!page) return new Response("Film not found", { status: 404 });
    const em = page.match(/src="\/embed\/([^"]+)"/i);
    if (!em) return new Response("No embed", { status: 404 });
    embedPath = em[1];
  }

  const embedUrl = `https://streamzo.fr/embed/${embedPath}`;
  const html = await fetchText(embedUrl);
  if (!html) return new Response("Embed not found", { status: 404 });

  const m =
    html.match(/https?:\/\/[^"'\s\\]+master\.m3u8[^"'\s\\]*/i) ||
    html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
  if (!m) return new Response("No stream", { status: 404 });

  const m3u8 = m[0].replace(/&amp;/g, "&");
  const proxied = `/api/hls?u=${encodeURIComponent(m3u8)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: proxied, "Cache-Control": "no-store" },
  });
}
