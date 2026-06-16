import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const series = await prisma.series.findUnique({
    where: { id: params.id },
    include: {
      episodes: { orderBy: [{ season: "asc" }, { number: "asc" }] },
    },
  });

  if (!series) {
    return NextResponse.json({ error: "Série non trouvée" }, { status: 404 });
  }

  return NextResponse.json(series);
}

export async function PUT(
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
  const series = await prisma.series.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      posterUrl: body.posterUrl,
      year: body.year,
      featured: body.featured,
    },
  });

  return NextResponse.json(series);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.series.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
