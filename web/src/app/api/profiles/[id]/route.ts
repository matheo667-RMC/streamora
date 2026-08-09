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
  const profile = await prisma.profile.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!profile || profile.userId !== user.id) return null;
  return profile;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ownProfile(params.id))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { name, avatarUrl } = await req.json();
  const profile = await prisma.profile.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  return NextResponse.json(profile);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ownProfile(params.id))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await prisma.profile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
