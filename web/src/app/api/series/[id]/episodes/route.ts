import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const episode = await prisma.episode.create({
    data: {
      seriesId: params.id,
      season: body.season ?? 1,
      number: body.number ?? 1,
      title: body.title ?? "",
      videoUrl: body.videoUrl ?? "",
      duration: body.duration ?? "",
    },
  });

  return NextResponse.json(episode, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get("episodeId");

  if (!episodeId) {
    return NextResponse.json({ error: "episodeId requis" }, { status: 400 });
  }

  await prisma.episode.delete({ where: { id: episodeId } });
  return NextResponse.json({ success: true });
}
