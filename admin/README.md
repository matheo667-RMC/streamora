# Streamora Admin - Application Desktop

Application de bureau pour gérer les films et séries de ton site Streamora.

## Installation

### 1. Installer Python
Télécharge Python 3.10+ sur [python.org](https://www.python.org/downloads/)

### 2. Installer les dépendances
```bash
cd admin
pip install -r requirements.txt
```

### 3. Lancer l'application
```bash
python streamora_admin.py
```

## Utilisation

1. **Connexion** — Colle l'URL de ta base de données Neon (la même que dans Vercel)
2. **Dashboard** — Voir les stats (films, séries, téléchargements, profils)
3. **Films** — Ajouter, modifier, supprimer des films
4. **Séries** — Ajouter, modifier, supprimer des séries et leurs épisodes
5. **Profils** — Voir et gérer les profils des utilisateurs

## L'URL de connexion

C'est la même URL que tu as dans Vercel (`DATABASE_URL`). Elle ressemble à :
```
postgresql://neondb_owner:xxxx@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

L'URL est sauvegardée localement dans `config.json` pour ne pas avoir à la retaper.
