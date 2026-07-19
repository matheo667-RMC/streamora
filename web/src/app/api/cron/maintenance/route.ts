import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Weekly Sunday maintenance window, driven by Vercel Cron.
// ?action=on enables maintenance, ?action=off disables it.
// Only acts when autoMaintenance is enabled in admin settings.
export async function GET(req: NextRequest) {
  // Optional protection: if CRON_SECRET is set, require it.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  if (!settings?.autoMaintenance) {
    return NextResponse.json({ skipped: true, reason: "autoMaintenance disabled" });
  }

  const action = req.nextUrl.searchParams.get("action") || "on";
  const on = action !== "off";

  await prisma.siteSettings.update({
    where: { id: "main" },
    data: {
      maintenanceMode: on,
      ...(on ? { lastMaintenanceAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ maintenanceMode: on });
}
