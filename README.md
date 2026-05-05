# Spotify Playlist Generator (2026 Edition) 🎵

Générateur automatique de playlists Spotify à partir des albums sauvegardés dans votre bibliothèque. 

Cette application sélectionne aléatoirement 30 titres parmi tous vos albums pour créer ou mettre à jour une playlist dédiée nommée **"TITRES DE MES ALBUMS"**.

## ✨ Fonctionnalités
- **Authentification Sécurisée** : Utilise le flux OAuth 2.0 PKCE (pas besoin de Client Secret).
- **Algorithme Intelligent** : Parcourt vos albums sauvegardés et sélectionne des pistes variées.
- **Support API 2026** : Compatible avec les nouveaux endpoints Spotify (`/items`) et les restrictions de développement.
- **Interface Sombre** : Design moderne inspiré de l'esthétique Spotify.

## 🚀 Installation & Configuration

1. **Cloner le projet** :
   ```bash
   git clone <votre-url-de-repo>
   cd SPOTIFY
   npm install
   ```

2. **Configuration Spotify Developer** :
   - Allez sur le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   - Créez une application.
   - Ajoutez `http://127.0.0.1:8888/callback` comme **Redirect URI**.
   - Notez votre **Client ID**.

3. **Variables d'environnement** :
   - Copiez le fichier d'exemple : `cp .env.example .env`
   - Ouvrez `.env` et remplacez `votre_client_id_ici` par votre véritable Client ID.

4. **Lancer l'application** :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://127.0.0.1:8888`.

## 🛠️ Notes Techniques
- **Mode Développement** : Votre compte Spotify doit être ajouté dans la section "User Management" de votre application sur le dashboard Spotify.
- **Quota** : Suite aux changements de Spotify de février 2026, l'application réutilise une playlist existante nommée "TITRES DE MES ALBUMS" pour contourner les restrictions de création massive de playlists en mode dev.

## 📜 Licence
MIT
