import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Vous devez être connecté" },
      { status: 401 }
    );
  }

  const film = await prisma.film.findUnique({
    where: { id: params.id },
  });

  if (!film) {
    return NextResponse.json({ error: "Film non trouvé" }, { status: 404 });
  }

  if (!film.videoUrl) {
    return NextResponse.json(
      { error: "Aucun fichier disponible" },
      { status: 400 }
    );
  }

  await prisma.download.create({
    data: {
      filmId: film.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ downloadUrl: film.videoUrl });
}
