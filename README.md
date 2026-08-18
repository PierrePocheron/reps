# 🏋️ Reps - L'expérience Musculation Ultime

> **Plus qu'une simple application de suivi, Reps est une expérience sociale et gamifiée conçue pour pousser vos limites.**
> Une Application Web (PWA) propulsée en natif sur iOS et Android, alliant la flexibilité du Web à la puissance du Natif.

[![Status](https://img.shields.io/badge/Status-Active-success)]() [![License](https://img.shields.io/badge/license-MIT-blue)]() [![CI/CD](https://github.com/PierrePocheron/reps/actions/workflows/ci.yml/badge.svg)](https://github.com/PierrePocheron/reps/actions/workflows/ci.yml) [![Vercel](https://vercel.com/button)](https://vercel.com/pierre-pocheron/reps)

📖 **Documentation** : [Tests](docs/TESTS.md) · [Outils](docs/TOOLS.md)

<div align="center">
  <a href="https://pedro-reps.web.app">
    <img src="https://img.shields.io/badge/iOS_PWA-Add_to_Home_Screen-black?style=for-the-badge&logo=apple" alt="iOS PWA" height="40" />
  </a>
  <a href="https://github.com/PierrePocheron/reps/releases/latest">
    <img src="https://img.shields.io/badge/Android-Download_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" height="40" />
  </a>
</div>

---

## 📱 Aperçu & Interface

| Accueil | Session | Classement | Statistiques |
|:---:|:---:|:---:|:---:|
| ![Home](/screenshots/reps_home.png) | ![Session](/screenshots/reps_session.png) | ![Leaderboard](/screenshots/reps_top.png) | ![Statistics](/screenshots/reps_stats.png) |
| *Votre tableau de bord* | *Suivi en temps réel* | *Défiez vos amis* | *Statistiques* |

| Friends | Achievements | Profile | Settings |
|:---:|:---:|:---:|:---:|
| ![Friends](/screenshots/reps_social.png) | ![Achievements](/screenshots/reps_achievements.png) | ![Profile](/screenshots/reps_profil.png) | ![Settings](/screenshots/reps_settings.png) |
| *Amis et fil d'actualité* | *Achievements et badges* | *Profil* | *Paramètres* |

---

## ⚡️ Stack Technologique & Outils

Ce projet est une démonstration technique utilisant un écosystème moderne pour garantir performance, fluidité et maintenabilité.

### 💻 Cœur & Frontend
*   **[React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)** : Architecture robuste, typée et composants réactifs.
*   **[Vite](https://vitejs.dev/)** : Environnement de développement ultra-rapide et build optimisé.
*   **[TailwindCSS](https://tailwindcss.com/)** : Styling "Utility-first" pour un Design System sur-mesure et cohérent.
*   **[Framer Motion](https://www.framer.com/motion/)** : Moteur d'animations fluide (60fps) pour les transitions de pages et micro-interactions.
*   **[Shadcn/ui](https://ui.shadcn.com/)** : Composants UI accessibles et personnalisables (basés sur Radix Primitives).
*   **[Zustand](https://github.com/pmndrs/zustand)** : Gestion d'état global minimaliste et performante.

### 📲 Mobile & Natif (iOS / Android)
L'application exploite **[Capacitor](https://capacitorjs.com/)** (v5) pour offrir une véritable expérience native.
*   **Plugins Natifs** :
    *   `@codetrix-studio/capacitor-google-auth` : Authentification Google native (OAuth2) sans redirection web.
    *   `@capacitor-community/admob` : Levier de monétisation native (Bannières publicitaires) pour iOS et Android.
    *   `@capacitor/haptics` : Retours haptiques (vibrations) précis.
    *   `@capacitor/local-notifications` : Rappels d'entraînements et motivation.
*   **Monétisation Hybride** :
    *   **AdMob** : Publicités natives optimisées pour les stores.
    *   **Google AdSense** : Revenus complémentaires sur la version Web/Desktop.
*   **Outils de Build** :
    *   **Xcode** & **Swift** : Configuration iOS profonde (Capabilities, Info.plist, Safe Areas).
    *   **CocoaPods** : Gestion des dépendances natives iOS.
    *   **Android Studio** & **Gradle** : Pipeline de build Android optimisé.

### 🔥 Backend & Infrastructure
*   **[Firebase](https://firebase.google.com/)** :
    *   **Firestore** : Base de données NoSQL temps réel pour la synchro instantanée entre appareils.
    *   **Authentication** : Gestion sécurisée des identités.
    *   **Hosting** : Déploiement global sur CDN.

### 🎨 Design & Production
*   **[Shorts.so](https://shorts.so/)** : Génération des mockups de présentation haute fidélité.
*   **Lucide React** : Set d'icônes vectorielles léger et cohérent.
*   **Canvas Confetti** : Effets de particules pour la gamification (Célébrations).

---

## 💎 Principes de Développement

Ce projet met en œuvre des concepts avancés pour gommer la frontière Web/Natif :

1.  **Native Feel First** :
    *   Suppression du "Rubber-banding" (scroll élastique) excessif.
    *   Désactivation du Zoom tactile et sélection de texte.
    *   Gestion précise des **Safe Areas** (Notch, Dynamic Island) via CSS `env()`.
2.  **Gamification Poussée** :
    *   Système de leveling algorithmique.
    *   **Badge System** dynamique (15+ succès à débloquer).
    *   Calcul de "Streaks" (Séries) pour la rétention utilisateur.
3.  **Performance UX** :
    *   Optimistic UI pour une réactivité immédiate sans attendre le réseau.
    *   Mode Offline partiel.

---

## 🛠️ Configuration Développement

Pour les développeurs souhaitant explorer le code source.

### 1. Variables d'environnement
Créez un fichier `.env` à la racine du projet contenant vos clés Firebase :

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_projet_id
VITE_FIREBASE_STORAGE_BUCKET=projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
VITE_APP_ENV=development
```

### 2. Installation & Lancement

```bash
# Installation des dépendances JS
yarn install

# Lancer en mode Web
yarn dev

# Synchroniser les projets natifs (nécessite les IDEs installés)
yarn cap:sync
```
