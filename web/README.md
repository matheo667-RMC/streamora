# Streamora Web

Site de streaming de films avec authentification Google, panneau admin et téléchargements.

## Fonctionnalités

- **Authentification Google** — Connexion avec votre compte Google via NextAuth.js
- **Catalogue de films** — Parcourir, filtrer par catégorie et rechercher des films
- **Lecteur vidéo** — Regarder les films directement dans le navigateur
- **Téléchargement** — Télécharger les films avec suivi des téléchargements
- **Panneau Admin** — Ajouter/modifier/supprimer des films, voir les statistiques de téléchargement
- **Interface responsive** — Design moderne et adapté à tous les écrans

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Auth** : NextAuth.js v5 + Google OAuth
- **Base de données** : SQLite via Prisma ORM
- **Styles** : Tailwind CSS
- **Langage** : TypeScript

## Installation

1. Installez les dépendances :
   ```bash
   cd web
   npm install
   ```

2. Configurez les variables d'environnement :
   ```bash
   cp .env.example .env
   ```
   Remplissez les valeurs dans `.env` :
   - `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` — Créez un projet sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - `NEXTAUTH_SECRET` — Générez avec `openssl rand -base64 32`
   - `ADMIN_EMAIL` — Votre email Google qui aura les droits admin

3. Initialisez la base de données :
   ```bash
   npm run db:push
   ```

4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

5. Ouvrez http://localhost:3000

## Configuration Google OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un existant
3. Allez dans "APIs & Services" > "Credentials"
4. Créez un "OAuth 2.0 Client ID"
5. Type d'application : "Application Web"
6. Ajoutez `http://localhost:3000` dans les origines autorisées
7. Ajoutez `http://localhost:3000/api/auth/callback/google` dans les URIs de redirection
8. Copiez le Client ID et Client Secret dans votre `.env`

## Déploiement sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub
2. Cliquez "Add New Project" et importez le repo `streamora`
3. **Important** : Dans les paramètres du projet, configurez le **Root Directory** sur `web`
4. Ajoutez les variables d'environnement dans Vercel (Settings > Environment Variables) :
   - `DATABASE_URL` = `file:./dev.db`
   - `NEXTAUTH_URL` = `https://votre-domaine.vercel.app`
   - `NEXTAUTH_SECRET` = (générez avec `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` = votre Client ID Google
   - `GOOGLE_CLIENT_SECRET` = votre Client Secret Google
   - `ADMIN_EMAIL` = votre email admin
5. N'oubliez pas d'ajouter votre domaine Vercel dans les URIs de redirection Google OAuth :
   `https://votre-domaine.vercel.app/api/auth/callback/google`
6. Cliquez "Deploy"

> **Note** : Pour la production, il est recommandé d'utiliser une base de données hébergée (ex: [Turso](https://turso.tech/) pour SQLite, ou PostgreSQL sur [Neon](https://neon.tech/)) au lieu de SQLite local.

## Admin

Le premier utilisateur qui se connecte avec l'email défini dans `ADMIN_EMAIL` recevra automatiquement le rôle admin. L'admin peut :
- Ajouter des films (titre, description, catégorie, URL vidéo, poster, etc.)
- Modifier et supprimer des films
- Voir les statistiques (nombre de films, utilisateurs, téléchargements)
- Consulter l'historique des téléchargements
