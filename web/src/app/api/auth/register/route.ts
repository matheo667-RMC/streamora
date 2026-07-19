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

  // Anti-abuse: limit accounts per IP (founder exempt).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "";
  if (ip && email !== ADMIN_EMAIL) {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    const max = settings?.maxAccountsPerIp ?? 2;
    const fromIp = await prisma.user.count({ where: { signupIp: ip } });
    if (fromIp >= max) {
      return NextResponse.json(
        { error: "Trop de comptes créés depuis ce réseau. Contacte le support." },
        { status: 429 }
      );
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const role = email === ADMIN_EMAIL ? "admin" : "user";

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      signupIp: ip || null,
    },
  });

  return NextResponse.json({ success: true });
}
