import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "matheofernandes5670@gmail.com";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Tous les champs sont requis" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const role = email === ADMIN_EMAIL ? "admin" : "user";

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  return NextResponse.json({ success: true });
}
