import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FOUNDER_EMAIL } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function normalize(url: string): string {
  const u = (url || "").trim().replace(/\/+$/, "");
  return u;
}

export async function GET() {
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    return NextResponse.json({ serverBaseUrl: s?.serverBaseUrl ?? "" });
  } catch {
    return NextResponse.json({ serverBaseUrl: "" });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const isAdmin =
    session?.user?.email === FOUNDER_EMAIL ||
    (session?.user as { role?: string })?.role === "admin";
  if (!isAdmin) {
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
