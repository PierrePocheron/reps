# 🏋️ Reps - Suivi Musculation

> Application Progressive Web App (PWA) ultime pour suivre vos entraînements de musculation, vous mesurer à vos amis et rester motivé.

[![Status](https://img.shields.io/badge/Status-Active-success)]() [![License](https://img.shields.io/badge/license-MIT-blue)]() [![CI/CD](https://github.com/PierrePocheron/reps/actions/workflows/ci.yml/badge.svg)](https://github.com/PierrePocheron/reps/actions/workflows/ci.yml) [![Vercel](https://vercel.com/button)](https://vercel.com/pierre-pocheron/reps)

## ✨ Fonctionnalités

### 🏋️ Suivi d'Entraînement Avancé
- **Carnet numérique** : Créez et enregistrez vos séances (poids du corps, lesté, salle).
- **Historique complet** : Retrouvez toutes vos performances passées.
- **Templates** : Créez vos propres routines ou utilisez celles par défaut (Tractions, Dips, Pompes...).
- **Chronomètre intégré** : Gestion automatique des temps de repos.

### 🤝 Social & Communauté
- **Système d'amis** : Ajoutez vos partenaires d'entraînement via recherche ou QR code (à venir).
- **Fil d'actualité** : Suivez les séances de vos amis en temps réel.
- **Leaderboard** : Classements interactifs (Jour, Semaine, Mois, Toujours) pour savoir qui est le plus fort.
- **Encouragements** : Notifications lors des records ou des nouvelles amitiés.

### 🏆 Gamification
- **Badges** : Débloquez des succès uniques (ex: "Lève-tôt", "Machine de guerre", "Social Butterfly").
- **Séries (Streaks)** : Maintenez votre flamme en vous entraînant régulièrement.
- **Niveaux** : Gagnez de l'expérience à chaque rep.

### 🎨 Design Premium & Personnalisation
- **Thèmes Dynamiques** : Choisissez votre couleur (Violet, Orange, Vert, Bleu, Rouge, Rose).
- **Mode Sombre/Clair** : S'adapte automatiquement à votre système.
- **Interface Fluide** : Animations soignées avec Framer Motion pour une expérience app-like.

## 📱 Aperçu

| Accueil | Session | Classement | Statistiques |
|:---:|:---:|:---:|:---:|
| ![Home](/screenshots/home.png) | ![Session](/screenshots/session.png) | ![Leaderboard](/screenshots/leaderboard.png) | ![Statistics](/screenshots/statistics.png) |
| *Votre tableau de bord* | *Suivi en temps réel* | *Défiez vos amis* | *Statistiques* |

## 🚀 Stack Technique

- **Frontend** : React 18, TypeScript, Vite
- **UI/UX** : TailwindCSS, Shadcn/ui, Framer Motion, Lucide Icons
- **State Management** : Zustand (léger et performant)
- **Backend & Data** : Firebase (Auth, Firestore, Hosting)
- **Mobile** : Capacitor (iOS/Android), PWA (Service Worker)

## 📋 Prérequis

- Node.js 18+ et npm/yarn/pnpm
- Compte Firebase avec projet créé
- (Optionnel) Xcode pour iOS / Android Studio pour Android

## 🛠️ Installation

1. **Cloner et installer les dépendances**

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

2. **Configurer Firebase**

Créez un fichier `.env` à la racine du projet avec vos variables Firebase :

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_APP_ENV=development
```

Pour obtenir ces valeurs :
- Allez sur [Firebase Console](https://console.firebase.google.com)
- Sélectionnez votre projet
- Project Settings > General > Your apps > Web app

3. **Lancer le serveur de développement**

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📦 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Build de production
- `npm run preview` - Prévisualise le build de production
- `npm run lint` - Vérifie le code avec ESLint
- `npm run format` - Formate le code avec Prettier
- `npm run type-check` - Vérifie les types TypeScript
- `npm run cap:sync` - Synchronise avec Capacitor
- `npm run cap:add:ios` - Ajoute la plateforme iOS
- `npm run cap:add:android` - Ajoute la plateforme Android
- `npm run cap:open:ios` - Ouvre le projet iOS dans Xcode
- `npm run cap:open:android` - Ouvre le projet Android dans Android Studio

## 🏗️ Structure du projet

```
/src
  /components       # Composants UI réutilisables
  /pages            # Pages principales (Home, Session, Profile, Settings)
  /store            # Stores Zustand (user, session, settings)
  /firebase         # Configuration Firebase + helpers
  /hooks            # Hooks personnalisés (useAuth, useSession, useTheme)
  /utils            # Utilitaires (formatters, constants, storage)
  /assets           # Icons, images, emojis
  /styles           # Styles globaux et configuration Tailwind
```

## 🔥 Configuration Firebase

### Firestore Collections

L'application utilise les collections suivantes :

- `users/{uid}` - Profils utilisateurs
- `sessions/{uid}/{sessionId}` - Sessions d'entraînement
- `exercises/{exerciseId}` - Exercices personnalisés
- `notifications/` - Notifications push
- `phrases/` - Phrases motivantes pour notifications

### Règles de sécurité Firestore

Configurez vos règles de sécurité dans Firebase Console :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Sessions
    match /sessions/{userId}/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Exercises
    match /exercises/{exerciseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }

    // Phrases
    match /phrases/{phraseId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 📱 Déploiement

### Firebase Hosting

1. **Installer Firebase CLI**

```bash
npm install -g firebase-tools
```

2. **Se connecter**

```bash
firebase login
```

3. **Initialiser Firebase Hosting**

```bash
firebase init hosting
```

4. **Déployer**

```bash
npm run build
firebase deploy
```

### Export mobile (Capacitor)

1. **Build de production**

```bash
npm run build
```

2. **Synchroniser avec Capacitor**

```bash
npm run cap:sync
```

3. **Ajouter une plateforme (si pas déjà fait)**

```bash
npm run cap:add:ios
# ou
npm run cap:add:android
```

4. **Ouvrir dans l'IDE natif**

```bash
npm run cap:open:ios
# ou
npm run cap:open:android
```

## 🎨 Personnalisation

L'application supporte :
- Mode clair/sombre automatique
- Choix de couleur dominante (violet, orange, vert, bleu, etc.)
- Personnalisation via le profil utilisateur

## 📝 Convention de code

- **TypeScript strict** activé
- **ESLint** + **Prettier** configurés
- **camelCase** pour fonctions/variables
- **PascalCase** pour composants
- Commentaires en français

## 🐛 Dépannage

### Erreurs Firebase

- Vérifiez que votre fichier `.env` contient toutes les variables nécessaires
- Vérifiez que les règles de sécurité Firestore sont correctement configurées
- Vérifiez que l'authentification est activée dans Firebase Console

### Erreurs PWA

- Vérifiez que le build de production fonctionne : `npm run build && npm run preview`
- Vérifiez que les icônes PWA sont présentes dans `/public`

### Erreurs Capacitor

- Assurez-vous d'avoir fait un build avant de synchroniser : `npm run build && npm run cap:sync`
- Vérifiez que les dépendances natives sont installées

## 📄 Licence

MIT

