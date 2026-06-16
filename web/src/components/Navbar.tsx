"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
  const router = useRouter();
  const [profileName, setProfileName] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const name = document.cookie
      .split("; ")
      .find((c) => c.startsWith("streamora-profile-name="))
      ?.split("=")[1];
    if (name) setProfileName(decodeURIComponent(name));

    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function switchProfile() {
    document.cookie = "streamora-profile=;path=/;max-age=0";
    document.cookie = "streamora-profile-name=;path=/;max-age=0";
    router.push("/profiles");
    router.refresh();
  }

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-black/95 backdrop-blur-sm shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
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
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profileName && (
            <button
              onClick={switchProfile}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold">
                {profileName[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block">{profileName}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
