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

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-menu]")) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const userRole = (session?.user as unknown as Record<string, unknown>)?.role;

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? "bg-black/95 backdrop-blur-md shadow-lg shadow-black/50" : "bg-gradient-to-b from-black/90 via-black/50 to-transparent"}`}>
      <div className="mx-auto flex h-14 sm:h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-5 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt="Streamora"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Streamora
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
              Accueil
            </Link>
            <Link href="/films" className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
              Films
            </Link>
            <Link href="/series" className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
              Séries
            </Link>
            {userRole === "admin" && (
              <Link href="/admin" className="rounded-md px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" data-menu>
          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold ring-2 ring-transparent hover:ring-purple-500/50 transition-all">
                  {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="hidden sm:block max-w-[100px] truncate text-sm">{session.user.name || session.user.email?.split("@")[0]}</span>
                <svg className={`h-3.5 w-3.5 text-gray-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-white/5 mb-1">
                    {session.user.email}
                  </div>
                  {/* Mobile nav links */}
                  <Link href="/" className="flex md:hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    Accueil
                  </Link>
                  <Link href="/films" className="flex md:hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    Films
                  </Link>
                  <Link href="/series" className="flex md:hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    Séries
                  </Link>
                  {userRole === "admin" && (
                    <Link href="/admin" className="flex md:hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10" onClick={() => setMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <div className="hidden md:block" />
                  <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Mon compte
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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
          {!session?.user && (
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
