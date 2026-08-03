import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { FOUNDER_EMAIL } from "@/lib/subscription";

// Authorizes large (multi-GB) direct-to-Blob uploads from the admin video uploader.
// The file is streamed from the browser straight to Vercel Blob (no 4.5MB limit).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        const isAdmin =
          session?.user?.email === FOUNDER_EMAIL ||
          (session?.user as { role?: string })?.role === "admin";
        if (!isAdmin) {
          throw new Error("Non autorisé");
        }
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-matroska",
            "video/x-msvideo",
            "video/x-m4v",
            "application/octet-stream",
          ],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client receives the public URL directly.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
