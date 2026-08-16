import Link from "next/link";

const FAQ = [
  {
    q: "Comment ajouter mes films ?",
    a: "Copie tes vidéos dans E:\\Films, E:\\Series (ou F:) avec l'Explorateur Windows. Mr. Robot les repère et les publie tout seul avec l'affiche, l'année et le résumé.",
  },
  {
    q: "Pourquoi un film ne se lance pas ?",
    a: "Le serveur de ton PC doit tourner (la fenêtre noire ouverte). S'il est éteint, les vidéos de tes disques ne sont pas joignables.",
  },
  {
    q: "Créer ou supprimer un profil",
    a: "Clique sur ton avatar en haut à droite, puis « Gérer les profils ». Chaque profil a son nom, son icône et peut être protégé par un code à 4 chiffres.",
  },
  {
    q: "Installer Streamora sur mon téléphone",
    a: "Ouvre le site dans Chrome (Android) ou Safari (iPhone), puis « Ajouter à l'écran d'accueil ». L'application s'installe comme une vraie appli.",
  },
  {
    q: "Changer la langue ou les sous-titres",
    a: "Avatar → Gérer les profils → Langues / Affichage des sous-titres. Chaque profil garde ses propres réglages.",
  },
];

export default function AidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16">
      <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-white">Centre d&apos;aide</h1>
      <div className="space-y-4">
        {FAQ.map((f) => (
          <details
            key={f.q}
            className="rounded-xl border border-white/10 bg-[#151515]/80 px-4 py-3.5"
          >
            <summary className="cursor-pointer font-semibold text-white">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-500">
        Besoin d&apos;autre chose ?{" "}
        <Link href="/profil" className="text-emerald-400 hover:underline">
          Gérer mon profil
        </Link>
      </p>
    </div>
  );
}
