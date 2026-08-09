import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FOUNDER_EMAIL } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function normalize(url: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

async function isAdmin() {
  const session = await auth();
  return (
    session?.user?.email === FOUNDER_EMAIL ||
    (session?.user as { role?: string })?.role === "admin"
  );
}

export async function GET() {
  try {
    const admin = await isAdmin();
    let s = await prisma.siteSettings.findUnique({ where: { id: "main" } });

    // The sync key is what lets the PC server publish its own address, so it is
    // only ever handed out to an admin.
    if (admin && !s?.serverSyncKey) {
      s = await prisma.siteSettings.upsert({
        where: { id: "main" },
        update: { serverSyncKey: randomBytes(16).toString("hex") },
        create: { id: "main", serverSyncKey: randomBytes(16).toString("hex") },
      });
    }

    return NextResponse.json({
      serverBaseUrl: s?.serverBaseUrl ?? "",
      ...(admin ? { serverSyncKey: s?.serverSyncKey ?? "" } : {}),
    });
  } catch {
    return NextResponse.json({ serverBaseUrl: "" });
  }
}

export async function POST(req: NextRequest) {
  const syncKey = req.headers.get("x-sync-key") || "";
  let allowed = await isAdmin();

  if (!allowed && syncKey) {
    const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    allowed = !!s?.serverSyncKey && s.serverSyncKey === syncKey;
  }
  if (!allowed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { serverBaseUrl } = await req.json();
  const value = normalize(serverBaseUrl ?? "");

  const s = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: { serverBaseUrl: value },
    create: { id: "main", serverBaseUrl: value },
  });

  return NextResponse.json({ serverBaseUrl: s.serverBaseUrl });
}
