export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response("Missing or invalid file ID", { status: 400 });
  }

  const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

  const headers: Record<string, string> = {};
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  try {
    const response = await fetch(driveUrl, {
      headers,
      redirect: "follow",
    });

    if (!response.ok && response.status !== 206) {
      return new Response("Video not available", { status: response.status });
    }

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type") || "video/mp4";
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
