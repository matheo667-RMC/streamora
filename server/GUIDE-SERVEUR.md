# Streamora — Serveur vidéo (Windows)

Ton **PC = serveur**, tes **disques durs / clés USB = stockage**.
Un seul fichier à lancer : `streamora_server.py`.

> ⚠️ **Légal** : ne mets ici que des vidéos dont **tu as le droit** (tes propres
> fichiers, films libres de droits). Diffuser publiquement des films de studios
> est illégal.

---

## 1) Installer Python (une seule fois)
1. https://www.python.org/downloads/
2. Lance l'installateur, **coche « Add Python to PATH »**, puis « Install Now ».

## 2) Brancher tes disques
Branche tes disques durs / clés USB **avant** de lancer le serveur.
Le serveur détecte **tout seul** toutes les lettres de lecteur (sauf `C:`),
donc tu n'as rien à taper : 2 disques durs + 2 clés = les 4 sont pris.

## 3) Lancer
**Double-clique `streamora_server.py`.**

Au 1<sup>er</sup> lancement il demande ta **clé de synchro** : copie-la depuis
Streamora → **Admin → Adresse de mon serveur → Copier**, colle-la, Entrée.
À partir de là, le serveur **publie son adresse tout seul** à chaque démarrage :
tu n'as plus jamais de lien à recoller.

La fenêtre affiche :

```
   Disque 0 : D:\
   Disque 1 : E:\
   Sur ce PC : http://localhost:8090

   TON LIEN PUBLIC :
   https://xxxxxxxx.pinggy.link
[OK] Lien public verifie : il fonctionne.
[OK] Adresse envoyee a Streamora : tes films marchent tout de suite.
```

Les lignes `[OK]` confirment que tout marche vraiment. S'il y a `[!]`, relance.
Plusieurs services de lien public sont essayés automatiquement, dont un en
**port 443** : ça marche même si ta box bloque le port 22.
**Garde cette fenêtre ouverte** tant que vous regardez.

## 4) Récupérer le lien d'un film
1. Ouvre le lien public dans ton navigateur (si une page d'avertissement
   s'affiche, clique « Continue »).
2. Tu vois la liste de tes vidéos (avec recherche) → **« Copier le lien »**.
3. Streamora → **Admin** → le film/épisode → champ **URL Vidéo** → colle → Enregistrer.

## 5) Envoyer une vidéo sur ton disque depuis le site
**Admin → Uploader une vidéo → lien public** : la vidéo est enregistrée
dans le dossier `Streamora-Uploads` de ton premier disque et tu récupères
directement son lien.

---

## Bon à savoir
- Si tu fermes la fenêtre, les liens s'arrêtent (le PC est le serveur).
- Le lien public **change** à chaque relance, mais avec la clé de synchro le site
  se met à jour tout seul ; les liens `/media/...` de tes films restent valables.
- Le lien gratuit peut expirer au bout d'un moment : le serveur en rouvre un
  aussitôt et le republie (une lecture en cours peut être coupée à ce moment-là).
- La fluidité dépend du **débit montant** de ta box.
- `.mkv` HEVC/4K peuvent ne pas se lire dans le navigateur → convertis en
  **.mp4 (H.264 + AAC)** avec `convertir-en-mp4.bat`.

## Ça ne marche pas ?
| Message | Solution |
|---|---|
| « Python n'est pas installé » | Réinstalle Python en cochant « Add to PATH » |
| « client OpenSSH absent » | Paramètres > Applications > Fonctionnalités facultatives > Ajouter > Client OpenSSH |
| « port déjà utilisé » | Une autre fenêtre du serveur est ouverte : ferme-la |
| Un disque n'apparaît pas | Branche-le puis relance ; supprime `config.json` s'il existe |
| « Cle de synchro refusee » | Recopie la clé depuis l'Admin, supprime `config.json`, relance |
| La vidéo ne se lit pas | Convertis-la en .mp4 (H.264/AAC) |
