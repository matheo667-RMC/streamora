import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = "matheofernandes5670@gmail.com";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    return NextResponse.json({ agentUrl: (settings?.iptvAgentUrl ?? "").replace(/\/+$/, "") });
  } catch {
    return NextResponse.json({ agentUrl: "" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const { agentUrl } = await req.json();
    const clean = String(agentUrl ?? "").trim().replace(/\/+$/, "");
    const settings = await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: { iptvAgentUrl: clean },
      create: { id: "main", iptvAgentUrl: clean },
    });
    return NextResponse.json({ agentUrl: settings.iptvAgentUrl });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
