import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { name, avatarUrl } = await req.json();

  const profile = await prisma.profile.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  return NextResponse.json(profile);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.profile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
