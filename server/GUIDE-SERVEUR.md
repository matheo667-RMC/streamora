# Streamora — Faire de mon PC un serveur de films (Windows 11)

Ton **PC = serveur**, tes **clés USB (ou disques) = stockage**. Tu déposes un
fichier vidéo, le serveur te donne un **lien**, tu le colles sur Streamora, et le
film est accessible partout dans le monde.

> ⚠️ **Important — légal** : ne mets ici que des vidéos dont **tu as le droit**
> (tes propres fichiers, films libres de droits, etc.). Ne mets pas de films
> piratés : c'est illégal et tu risquerais gros.

---

## 1) Installer Python (une seule fois)
1. Va sur https://www.python.org/downloads/
2. Télécharge et lance l'installateur.
3. **COCHE la case « Add Python to PATH »** en bas, puis « Install Now ».

## 2) Brancher tes 2 clés USB
- Branche tes 2 clés. Windows leur donne une lettre, par exemple `E:` et `F:`.
- Range tes films dedans, par ex. :
  ```
  E:\Films\Mon film.mp4
  F:\Series\Ma serie\S01E01.mp4
  ```
- Formats conseillés : **.mp4** (le plus compatible). Les .mkv marchent aussi.

## 3) Lancer le serveur
1. Ouvre le dossier `server` de Streamora.
2. **Double-clique sur `serveur-streamora.bat`**.
3. Au 1er lancement, il te demande tes dossiers → tape par ex. `E:\` puis Entrée,
   puis `F:\` puis Entrée, puis Entrée seul pour finir.
   (Il télécharge aussi tout seul l'outil de lien public `cloudflared`, une fois.)
4. Une fenêtre affiche un **lien public** du genre :
   ```
   https://xxxx-yyyy.trycloudflare.com
   ```
   **Garde cette fenêtre OUVERTE** tant que tu veux que ton serveur marche.

## 4) Récupérer le lien de chaque film
1. Ouvre le lien public (ou `http://localhost:8090` sur ton PC) dans ton navigateur.
2. Tu vois la **liste de tous tes films** avec un bouton **« Copier le lien »**.
3. Clique « Copier le lien » sur le film voulu.

## 5) Mettre le film sur Streamora
1. Va sur ton site → **Admin** → **Ajouter un film**.
2. Dans **URL vidéo**, colle le lien copié.
3. Enregistre. Le film se lit directement depuis ton PC. ✅

---

## Bon à savoir
- **Garde la fenêtre noire ouverte** : si tu la fermes, les liens s'arrêtent.
- À chaque redémarrage, le lien `trycloudflare.com` **change** → il faudra
  recoller les nouveaux liens. (Pour un lien fixe, il faut un compte Cloudflare
  gratuit + un domaine — dis-le-moi et je te guide.)
- La **fluidité dépend du débit montant** de ta box (upload). Pour plusieurs
  spectateurs en même temps, un bon upload est nécessaire.
- Une clé USB s'use si on écrit beaucoup dessus ; pour du long terme, un **disque
  dur externe** est plus solide (le serveur marche pareil).

## Ça ne marche pas ?
- « Python n'est pas installé » → réinstalle Python en **cochant « Add to PATH »**.
- Le lien ne s'ouvre pas → vérifie que la fenêtre du serveur ET celle du tunnel
  sont ouvertes.
- Une vidéo ne se lance pas → convertis-la en **.mp4 (H.264)** (les .mkv/HEVC/4K
  ne passent pas partout).
