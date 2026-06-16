"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = (session?.user as Record<string, unknown>)?.role === "admin";

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Streamora"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="text-xl font-bold text-white">Streamora</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Accueil
          </Link>
          <Link
            href="/films"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Films
          </Link>
          <Link
            href="/series"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Séries
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-700 p-1 pr-3 hover:border-gray-500 transition-colors"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium">
                    {session.user.name?.[0] ?? "U"}
                  </div>
                )}
                <span className="hidden text-sm text-gray-300 sm:block">
                  {session.user.name}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
                  <div className="border-b border-gray-700 px-4 py-2">
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs text-gray-400">
                      {session.user.email}
                    </p>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 md:hidden"
                      onClick={() => setMenuOpen(false)}
                    >
                      Panneau Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary">
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
