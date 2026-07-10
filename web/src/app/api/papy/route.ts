export const runtime = "edge";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Resolves a Papystreaming season page to the current (fresh) embed URL for a
// given episode index. Stored embed links expire quickly on file hosts, so we
// re-scrape the source page at click time and 302 to the live embed. The user's
// browser then loads that embed in the iframe.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageUrl = searchParams.get("u");
  const idx = parseInt(searchParams.get("i") || "0", 10);
  if (!pageUrl) return new Response("Missing u", { status: 400 });

  let html: string;
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": UA, Referer: "https://papystreaming.top/" },
    });
    if (!res.ok) return new Response("Source not found", { status: 404 });
    html = await res.text();
  } catch {
    return new Response("Source fetch failed", { status: 502 });
  }

  // Collect working-host embeds in document order (uqload / jetload), dedup.
  const seen = new Set<string>();
  const ordered: string[] = [];
  const re =
    /https?:\/\/(?:uqload\.net\/embed-[A-Za-z0-9]+(?:\.html)?|jetload\.net\/e\/[A-Za-z0-9]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let url = m[0];
    if (/uqload\.net\/embed-[A-Za-z0-9]+$/.test(url)) url += ".html";
    if (seen.has(url)) continue;
    seen.add(url);
    ordered.push(url);
  }

  const target = ordered[idx] || ordered[0];
  if (!target) return new Response("No embed", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" },
  });
}
