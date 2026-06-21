import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: "Missing or invalid file ID" }, { status: 400 });
  }

  try {
    // Fetch the Google Drive download page to get UUID
    const pageUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    const pageRes = await fetch(pageUrl, { redirect: "follow" });
    const html = await pageRes.text();

    // Extract UUID from confirmation form
    const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
    const uuid = uuidMatch ? uuidMatch[1] : null;

    let directUrl: string;
    if (uuid) {
      directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}`;
    } else {
      directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    }

    return NextResponse.json(
      { url: directUrl },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to resolve video URL" }, { status: 502 });
  }
}
