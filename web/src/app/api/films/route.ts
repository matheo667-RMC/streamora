import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (category && category !== "Toutes") where.category = category;
  if (q) where.title = { contains: q };

  const films = await prisma.film.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { downloads: true } } },
  });

  return NextResponse.json(films);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const film = await prisma.film.create({
    data: {
      title: body.title,
      description: body.description ?? "",
      category: body.category ?? "Autre",
      posterUrl: body.posterUrl ?? "",
      videoUrl: body.videoUrl ?? "",
      trailerUrl: body.trailerUrl ?? "",
      year: body.year ?? new Date().getFullYear(),
      duration: body.duration ?? "",
      featured: body.featured ?? false,
    },
  });

  return NextResponse.json(film, { status: 201 });
}
