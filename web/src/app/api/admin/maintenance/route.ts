import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = "matheofernandes5670@gmail.com";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    return NextResponse.json({
      maintenanceMode: settings?.maintenanceMode ?? false,
      maintenanceMsg: settings?.maintenanceMsg ?? "",
      maintenanceStyle: settings?.maintenanceStyle ?? "classic",
    });
  } catch {
    return NextResponse.json({ maintenanceMode: false, maintenanceMsg: "", maintenanceStyle: "classic" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { maintenanceMode, maintenanceMsg, maintenanceStyle } = await req.json();

    const settings = await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: {
        maintenanceMode: maintenanceMode ?? false,
        ...(maintenanceMsg !== undefined ? { maintenanceMsg } : {}),
        ...(maintenanceStyle !== undefined ? { maintenanceStyle } : {}),
      },
      create: {
        id: "main",
        maintenanceMode: maintenanceMode ?? false,
        maintenanceMsg: maintenanceMsg ?? "Streamora est en maintenance. Nous revenons bientôt !",
        maintenanceStyle: maintenanceStyle ?? "classic",
      },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
