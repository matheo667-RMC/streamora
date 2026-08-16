import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ownProfile(id: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;
  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile || profile.userId !== user.id) return null;
  return profile;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await ownProfile(params.id);
  if (!profile) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { pin, ...rest } = profile;
  return NextResponse.json({ ...rest, locked: pin.length > 0 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const current = await ownProfile(params.id);
  if (!current) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    avatarUrl,
    pin,
    locale,
    audioLang,
    subtitleLang,
    subtitleSize,
    autoplayNext,
    autoplayPreview,
    maturity,
  } = body;

  if (pin !== undefined && pin !== "" && !/^\d{4}$/.test(String(pin))) {
    return NextResponse.json({ error: "Le code doit avoir 4 chiffres" }, { status: 400 });
  }

  const profile = await prisma.profile.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(pin !== undefined && { pin: String(pin) }),
      ...(locale !== undefined && { locale: String(locale) }),
      ...(audioLang !== undefined && { audioLang: String(audioLang) }),
      ...(subtitleLang !== undefined && { subtitleLang: String(subtitleLang) }),
      ...(subtitleSize !== undefined && { subtitleSize: String(subtitleSize) }),
      ...(autoplayNext !== undefined && { autoplayNext: Boolean(autoplayNext) }),
      ...(autoplayPreview !== undefined && { autoplayPreview: Boolean(autoplayPreview) }),
      ...(maturity !== undefined && { maturity: String(maturity) }),
    },
  });

  const { pin: saved, ...rest } = profile;
  return NextResponse.json({ ...rest, locked: saved.length > 0 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ownProfile(params.id))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await prisma.profile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
