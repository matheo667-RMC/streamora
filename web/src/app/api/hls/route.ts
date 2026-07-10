export const runtime = "edge";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

function proxied(target: string): string {
  return `/api/hls?u=${encodeURIComponent(target)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get("u");
  if (!u) return new Response("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  const range = request.headers.get("range");
  const upstreamHeaders: Record<string, string> = {
    "User-Agent": UA,
    Referer: `${target.protocol}//${target.host}/`,
    Origin: `${target.protocol}//${target.host}`,
  };
  if (range) upstreamHeaders["Range"] = range;

  let res: Response;
  try {
    res = await fetch(target.toString(), { headers: upstreamHeaders, redirect: "follow" });
  } catch {
    return new Response("Upstream fetch failed", { status: 502, headers: CORS });
  }

  const contentType = res.headers.get("content-type") || "";
  const isPlaylist =
    contentType.includes("mpegurl") ||
    contentType.includes("vnd.apple") ||
    /\.m3u8($|\?)/i.test(target.pathname + target.search);

  if (isPlaylist) {
    const text = await res.text();
    if (!text.includes("#EXTM3U")) {
      // Not actually a playlist; pass through as bytes would require re-fetch. Return as-is.
      return new Response(text, {
        status: res.status,
        headers: { ...CORS, "Content-Type": contentType || "text/plain" },
      });
    }
    const base = res.url || target.toString();
    const rewritten = text
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return line;
        if (trimmed.startsWith("#")) {
          // Rewrite URI="..." occurrences (EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP)
          return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
            try {
              return `URI="${proxied(new URL(uri, base).toString())}"`;
            } catch {
              return `URI="${uri}"`;
            }
          });
        }
        // Segment or sub-playlist line
        try {
          return proxied(new URL(trimmed, base).toString());
        } catch {
          return line;
        }
      })
      .join("\n");

    return new Response(rewritten, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Binary passthrough (segments / keys)
  const headers = new Headers(CORS);
  const ct = res.headers.get("content-type");
  const cl = res.headers.get("content-length");
  const cr = res.headers.get("content-range");
  const ar = res.headers.get("accept-ranges");
  if (ct) headers.set("Content-Type", ct);
  if (cl) headers.set("Content-Length", cl);
  if (cr) headers.set("Content-Range", cr);
  if (ar) headers.set("Accept-Ranges", ar);

  return new Response(res.body, { status: res.status, headers });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
