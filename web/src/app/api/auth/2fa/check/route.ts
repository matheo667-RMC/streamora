import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { twoFactorEnabled: true },
    });

    return NextResponse.json({
      twoFactorEnabled: user?.twoFactorEnabled || false,
    });
  } catch {
    return NextResponse.json({ twoFactorEnabled: false });
  }
}
