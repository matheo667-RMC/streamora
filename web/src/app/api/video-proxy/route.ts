export const runtime = "edge";

async function getDirectDownloadUrl(fileId: string): Promise<string> {
  // Step 1: Hit the download page to get the confirmation UUID
  const pageUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const pageRes = await fetch(pageUrl, { redirect: "follow" });
  const html = await pageRes.text();

  // Extract UUID from the confirmation form
  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
  const uuid = uuidMatch ? uuidMatch[1] : null;

  if (uuid) {
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}`;
  }

  // Fallback: try direct with confirm=t
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response("Missing or invalid file ID", { status: 400 });
  }

  try {
    const directUrl = await getDirectDownloadUrl(fileId);

    const headers: Record<string, string> = {};
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const response = await fetch(directUrl, {
      headers,
      redirect: "follow",
    });

    if (!response.ok && response.status !== 206) {
      return new Response("Video not available", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "video/mp4";

    // If we got HTML instead of video, the download isn't working
    if (contentType.includes("text/html")) {
      return new Response("Video requires manual download confirmation", { status: 502 });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Failed to fetch video", { status: 502 });
  }
}
