import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const film = await prisma.film.findUnique({
    where: { id: params.id },
    include: { _count: { select: { downloads: true } } },
  });

  if (!film) {
    return NextResponse.json({ error: "Film non trouvé" }, { status: 404 });
  }

  return NextResponse.json(film);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const film = await prisma.film.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      posterUrl: body.posterUrl,
      videoUrl: body.videoUrl,
      trailerUrl: body.trailerUrl,
      year: body.year,
      duration: body.duration,
      featured: body.featured,
    },
  });

  return NextResponse.json(film);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.film.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
