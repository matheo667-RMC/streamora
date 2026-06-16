import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_PROFILES = 5;

export async function GET() {
  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const count = await prisma.profile.count();
  if (count >= MAX_PROFILES) {
    return NextResponse.json(
      { error: "Maximum 5 profils atteint" },
      { status: 400 }
    );
  }

  const { name, avatarUrl } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Le nom est requis" },
      { status: 400 }
    );
  }

  const profile = await prisma.profile.create({
    data: { name: name.trim(), avatarUrl: avatarUrl || "" },
  });

  return NextResponse.json(profile);
}
