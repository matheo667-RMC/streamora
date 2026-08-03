import Link from "next/link";
import Image from "next/image";
import { InstallApp } from "./InstallApp";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0f0f23]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
          {/* Logo & tagline */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="Streamora" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Streamora
              </span>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              Vos films et séries préférés, disponibles en streaming HD. Gratuit et sans pub.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-12 sm:gap-16">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</h4>
              <div className="flex flex-col gap-2">
                <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">Accueil</Link>
                <Link href="/films" className="text-sm text-gray-500 hover:text-white transition-colors">Films</Link>
                <Link href="/series" className="text-sm text-gray-500 hover:text-white transition-colors">Séries</Link>
                <Link href="/tv" className="text-sm text-gray-500 hover:text-white transition-colors">TV en Direct</Link>

              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compte</h4>
              <div className="flex flex-col gap-2">
                <Link href="/login" className="text-sm text-gray-500 hover:text-white transition-colors">Se connecter</Link>
                <Link href="/register" className="text-sm text-gray-500 hover:text-white transition-colors">S&apos;inscrire</Link>
                <Link href="/account" className="text-sm text-gray-500 hover:text-white transition-colors">Mon compte</Link>
              </div>
            </div>
          </div>

          {/* Install App */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application</h4>
            <InstallApp />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Streamora. Tous droits réservés.</p>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>Créé avec</span>
            <span className="text-green-500">&#9829;</span>
            <span>par</span>
            <span className="font-semibold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Max</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
