# Streamora IPTV Agent — Guide (Windows)

Ce petit programme tourne sur **ton PC à la maison**. Comme ton abonnement IPTV
n'autorise que ta connexion maison, l'agent lit l'IPTV depuis chez toi, garde le
contenu **français**, et l'envoie à ton site Streamora via un lien sécurisé.

> Ton lien IPTV reste **uniquement sur ton PC** (fichier `config.json`). Il n'est
> jamais envoyé sur internet ni sur GitHub.

## Étapes

1. **Installe Python** (une seule fois) : https://www.python.org/downloads/
   - Pendant l'installation, **coche « Add Python to PATH »**.

2. **Double-clique sur `demarrer.bat`**.
   - Au 1er lancement, colle ton **lien IPTV complet** (celui avec `username=` et
     `password=`) puis appuie sur Entrée.
   - Le programme télécharge tout seul `ffmpeg` et `cloudflared` (~80 Mo, une fois).

3. Une **fenêtre noire** reste ouverte et affiche un lien du genre :
   ```
   https://xxxx-yyyy-zzzz.trycloudflare.com
   ```
   **Copie ce lien.**

4. Va sur ton site **Streamora → Admin → onglet IPTV**, colle le lien, clique
   **Enregistrer**. Si tout va bien : « Connecté ✓ ».

5. Ouvre la page **IPTV** du site : tes chaînes, films et séries FR apparaissent.
   Clique dessus pour lancer.

## Important
- **Garde la fenêtre noire ouverte** pendant que tu regardes. Si tu la fermes,
  le lien s'arrête.
- Ton abonnement = **1 seule connexion** : une personne à la fois.
- À chaque redémarrage du programme, le lien `trycloudflare.com` **change** →
  recolle le nouveau lien dans Admin → IPTV.
- La qualité dépend du **débit montant** de ta box internet.

## Ça ne marche pas ?
- « Python n'est pas installé » → réinstalle Python en cochant « Add to PATH ».
- La page IPTV dit « Impossible de contacter ton agent » → vérifie que la fenêtre
  noire est ouverte et que le lien collé dans Admin est le plus récent.
- Une vidéo ne se lance pas → certains fichiers sont en HEVC/4K ; essaie un autre
  titre, ou ajoute `?t=1` (l'agent le fait déjà en secours).
