export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new Response("Missing or invalid file ID", { status: 400 });
  }

  try {
    // Step 1: Fetch the Google Drive download page to get UUID
    const pageUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    const pageRes = await fetch(pageUrl, { redirect: "follow" });
    const html = await pageRes.text();

    // Extract UUID from confirmation form
    const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
    const uuid = uuidMatch ? uuidMatch[1] : null;

    // Build the direct download URL
    let directUrl: string;
    if (uuid) {
      directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}`;
    } else {
      // Small file - no confirmation needed, check if the page itself is the content
      const contentType = pageRes.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        // Already got the file content directly
        directUrl = pageUrl;
      } else {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      }
    }

    // Step 2: Redirect browser directly to Google Drive download
    return new Response(null, {
      status: 302,
      headers: {
        "Location": directUrl,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("Failed to resolve video URL", { status: 502 });
  }
}
