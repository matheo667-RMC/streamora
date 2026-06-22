export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response("Missing or invalid file ID", { status: 400 });
  }

  try {
    // Step 1: Get the UUID from Google Drive's confirmation page
    const confirmPageUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    const confirmRes = await fetch(confirmPageUrl, { redirect: "follow" });
    const html = await confirmRes.text();

    // Check if we got the file directly (small files don't need confirmation)
    const confirmContentType = confirmRes.headers.get("content-type") || "";
    if (confirmContentType.startsWith("video/") || confirmContentType.startsWith("application/octet")) {
      // Small file - already got the content, but we consumed it reading as text
      // Re-fetch it
      const directRes = await fetch(confirmPageUrl, { redirect: "follow" });
      return streamResponse(directRes, request.headers.get("range"));
    }

    // Extract UUID from confirmation form
    const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
    const uuid = uuidMatch ? uuidMatch[1] : null;

    // Build the actual download URL
    let downloadUrl: string;
    if (uuid) {
      downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}`;
    } else {
      // Try without UUID
      downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    }

    // Step 2: Fetch the actual video file
    const fetchHeaders: Record<string, string> = {};
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const videoRes = await fetch(downloadUrl, {
      headers: fetchHeaders,
      redirect: "follow",
    });

    // Check if we got HTML instead of video (means download failed)
    const videoContentType = videoRes.headers.get("content-type") || "";
    if (videoContentType.includes("text/html")) {
      // Fallback: try with export=view
      const fallbackUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: fetchHeaders,
        redirect: "follow",
      });
      const fallbackType = fallbackRes.headers.get("content-type") || "";
      if (fallbackType.includes("text/html")) {
        return new Response("Could not access video file. Make sure it is shared publicly.", { status: 403 });
      }
      return streamResponse(fallbackRes, rangeHeader);
    }

    return streamResponse(videoRes, rangeHeader);
  } catch (err) {
    return new Response(`Proxy error: ${err instanceof Error ? err.message : "unknown"}`, { status: 502 });
  }
}

function streamResponse(response: Response, rangeHeader: string | null): Response {
  const contentType = response.headers.get("content-type") || "video/mp4";
  const headers = new Headers();

  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Cache-Control", "public, max-age=3600, immutable");

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  const contentRange = response.headers.get("content-range");
  if (contentRange) {
    headers.set("Content-Range", contentRange);
  }

  // Use 206 for range requests, otherwise use original status
  const status = rangeHeader && response.status === 206 ? 206 : response.status;

  return new Response(response.body, { status, headers });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Max-Age": "86400",
    },
  });
}
