import { NextRequest, NextResponse } from "next/server";
import { updateCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Weekly (Sunday) auto-updater: adds the newest TMDB films/series and refreshes
// existing ones. Because playback is keyed by tmdbId through the multi-source
// player, links stay working without manual maintenance.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await updateCatalog();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "update failed" },
      { status: 500 }
    );
  }
}
