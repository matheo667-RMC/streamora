"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const userRole = (session?.user as unknown as Record<string, unknown>)?.role;

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-black/95 backdrop-blur-sm shadow-lg shadow-purple-900/10" : "bg-gradient-to-b from-black/80 to-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6 md:gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Streamora"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Streamora
            </span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
              Accueil
            </Link>
            <Link href="/films" className="text-sm text-gray-300 hover:text-white transition-colors">
              Films
            </Link>
            <Link href="/series" className="text-sm text-gray-300 hover:text-white transition-colors">
              Séries
            </Link>
            {userRole === "admin" && (
              <Link href="/admin" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="hidden sm:block max-w-[120px] truncate">{session.user.name || session.user.email}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl p-2 shadow-xl">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-white/10 mb-1">
                    {session.user.email}
                  </div>
                  {/* Mobile nav links */}
                  <Link href="/films" className="block md:hidden rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    Films
                  </Link>
                  <Link href="/series" className="block md:hidden rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    Séries
                  </Link>
                  {userRole === "admin" && (
                    <Link href="/admin" className="block md:hidden rounded-lg px-3 py-2 text-sm text-purple-400 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <Link href="/account" className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    Mon compte
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
              Se connecter
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
