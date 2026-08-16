import Link from "next/link";

const SECTIONS = [
  {
    title: "Sous-titres et langues",
    items: [
      {
        q: "Activer ou désactiver les sous-titres",
        a: "Pendant la lecture, clique sur l'icône « Sous-titres » en bas du lecteur et choisis la langue, ou « Désactivés ». Le choix est gardé pour les prochaines vidéos.",
      },
      {
        q: "Changer la langue des sous-titres",
        a: "Avatar (en haut à droite) → Gérer les profils → Affichage des sous-titres. Chaque profil a ses propres réglages.",
      },
      {
        q: "Agrandir le texte des sous-titres",
        a: "Gérer les profils → Affichage des sous-titres → Taille du texte : Petit, Moyen ou Grand. L'aperçu te montre le rendu avant d'enregistrer.",
      },
      {
        q: "Changer la langue de l'application",
        a: "Gérer les profils → Langues → Langue de l'application. Tu peux aussi choisir ta langue audio préférée.",
      },
    ],
  },
  {
    title: "Mon profil",
    items: [
      {
        q: "Changer ma photo de profil",
        a: "Avatar → Gérer les profils → clique sur ton image → « Choisir une icône de profil ». Prends un personnage Streamora, une affiche du catalogue, ou « Importer ma propre photo » pour mettre la tienne.",
      },
      {
        q: "Changer mon nom de profil",
        a: "Avatar → Gérer les profils → Modifiez votre profil : tape le nouveau nom et enregistre.",
      },
      {
        q: "Créer un nouveau profil",
        a: "Sur l'écran « Qui regarde ? », clique sur le + « Ajouter un profil ». Jusqu'à 5 profils par compte, chacun avec sa liste et son historique.",
      },
      {
        q: "Protéger un profil par un code",
        a: "Gérer les profils → Verrouillage du profil → choisis un code à 4 chiffres. Il sera demandé à chaque ouverture de ce profil. Laisse le champ vide et enregistre pour retirer le code.",
      },
      {
        q: "Changer de profil",
        a: "Clique sur ton avatar en haut à droite : les autres profils du compte sont listés, un clic suffit.",
      },
      {
        q: "Supprimer un profil",
        a: "Gérer les profils → tout en bas, « Supprimer le profil ». Attention, l'historique de ce profil est perdu.",
      },
    ],
  },
  {
    title: "Regarder",
    items: [
      {
        q: "Reprendre un film où je l'avais arrêté",
        a: "Rouvre le titre : la lecture repart automatiquement au bon moment. La rangée « Reprendre » sur l'accueil te remet les derniers titres commencés.",
      },
      {
        q: "Enchaîner les épisodes automatiquement",
        a: "Gérer les profils → Paramètres de lecture → « Lire automatiquement l'épisode suivant ».",
      },
      {
        q: "Effacer mon historique de lecture",
        a: "Gérer les profils → Historique → « Tout masquer », ou « Masquer » sur une ligne précise.",
      },
      {
        q: "L'image saccade ou reste en chargement",
        a: "Mets la vidéo en pause 30 secondes pour la laisser se charger, ou passe en Wi-Fi. Sur une connexion lente, baisse la qualité dans le lecteur.",
      },
      {
        q: "Plein écran et raccourcis",
        a: "Espace : lecture/pause. F : plein écran. M : couper le son. Flèches gauche/droite : reculer ou avancer de 10 secondes.",
      },
    ],
  },
  {
    title: "Mon compte",
    items: [
      {
        q: "Installer Streamora sur mon téléphone",
        a: "Android : ouvre le site dans Chrome → menu ⋮ → « Installer l'application ». iPhone : Safari → Partager → « Sur l'écran d'accueil ».",
      },
      {
        q: "Changer mon mot de passe",
        a: "Avatar → Compte → Mot de passe. Si tu l'as oublié, utilise « Mot de passe oublié » sur la page de connexion.",
      },
      {
        q: "Ajouter un titre à ma liste",
        a: "Sur la fiche d'un film ou d'une série, clique sur « Ma liste ». Tu la retrouves depuis l'accueil.",
      },
    ],
  },
];

export default function AidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16">
      <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-white">Centre d&apos;aide</h1>
      <p className="mb-8 text-gray-400">Les réponses aux questions les plus courantes.</p>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.items.map((f) => (
                <details
                  key={f.q}
                  className="rounded-xl border border-white/10 bg-[#151515]/80 px-4 py-3.5"
                >
                  <summary className="cursor-pointer font-semibold text-white">{f.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-gray-500">
        <Link href="/profil" className="text-emerald-400 hover:underline">
          Gérer mon profil et mes préférences
        </Link>
      </p>
    </div>
  );
}
