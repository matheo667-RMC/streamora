export const runtime = "edge";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Resolves a streamzo embed reference (e.g. "vidzy.live/4150") to a fresh HLS
// playlist URL, then redirects to the HLS proxy so segments stream through us.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) return new Response("Missing ref", { status: 400 });

  const embedUrl = `https://streamzo.fr/embed/${ref.replace(/^\/+/, "")}`;
  let html: string;
  try {
    const res = await fetch(embedUrl, {
      headers: { "User-Agent": UA, Referer: "https://streamzo.fr/" },
    });
    if (!res.ok) return new Response("Embed not found", { status: 404 });
    html = await res.text();
  } catch {
    return new Response("Upstream failed", { status: 502 });
  }

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
