# Outils du projet — Guide d'utilisation

> Vue d'ensemble de tous les outils intégrés dans le projet **Reps**, comment les utiliser et comment les configurer.

---

## Sommaire

- [Développement](#développement)
- [Tests & Qualité](#tests--qualité)
- [Mobile & Natif (Capacitor)](#mobile--natif-capacitor)
- [Backend (Firebase)](#backend-firebase)
- [Monitoring (Sentry)](#monitoring-sentry)
- [CI/CD & Déploiement](#cicd--déploiement)
- [Toutes les commandes](#toutes-les-commandes)

---

## Développement

### Vite

Bundler et serveur de développement. Démarre en millisecondes grâce au HMR (Hot Module Replacement).

```bash
yarn dev          # Lance le serveur de dev sur http://localhost:5173
yarn build        # Build de production dans dist/
yarn preview      # Prévisualise le build de production
```

Configuration : [vite.config.ts](../vite.config.ts)

---

### TypeScript

Vérification des types sans compilation (lecture seule).

```bash
yarn type-check   # Équivalent à tsc --noEmit
```

Toutes les erreurs TypeScript bloquent le pipeline CI/CD.

---

### ESLint

Linter statique pour détecter les problèmes de code.

```bash
yarn lint         # Analyse tout le code src/
```

Configuration : [.eslintrc.cjs](../.eslintrc.cjs) — mode strict, zéro warning autorisé en CI.

---

### Prettier

Formatage automatique du code.

```bash
yarn format       # Formate tous les fichiers src/**/*.{ts,tsx,js,jsx,json,css,md}
```

---

### Alias de chemins (`@/`)

L'alias `@` pointe vers `src/`. Utilisable partout dans le code :

```ts
import { logger } from '@/utils/logger';     // = src/utils/logger.ts
import { useUserStore } from '@/store/userStore'; // = src/store/userStore.ts
```

Défini dans `vite.config.ts` → `resolve.alias` et `tsconfig.json` → `paths`.

---

## Tests & Qualité

### Vitest

Runner de tests unitaires/intégration. Voir [TESTS.md](./TESTS.md) pour le guide complet.

```bash
yarn test                        # Mode watch (développement)
yarn test --run                  # Exécution unique
yarn test:coverage               # Avec rapport de couverture
yarn test --run src/utils/       # Dossier spécifique
yarn test --run -t "signIn"      # Filtrer par nom de test
```

Rapport HTML de couverture : ouvrir `coverage/index.html` après `yarn test:coverage`.

---

### SonarCloud

Analyse statique de la qualité du code (dette technique, bugs, vulnérabilités, duplication).

**Accès** : [sonarcloud.io](https://sonarcloud.io) → projet `PierrePocheron_reps`

**Déclenchement** : automatique à chaque push sur `main` via GitHub Actions.

**Configuration** : [sonar-project.properties](../sonar-project.properties)

```properties
sonar.projectKey=PierrePocheron_reps
sonar.sources=src
sonar.javascript.lcov.reportPaths=coverage/lcov.info  # Lit la couverture générée par Vitest
```

SonarCloud lit le fichier `coverage/lcov.info` produit par `yarn test:coverage` pour afficher la couverture dans son tableau de bord.

---

## Mobile & Natif (Capacitor)

Capacitor encapsule l'app web dans une application iOS/Android native.

### Commandes Capacitor

```bash
yarn cap:sync           # Synchronise le build web → projets natifs (iOS + Android)
yarn cap:open:ios       # Ouvre le projet dans Xcode
yarn cap:open:android   # Ouvre le projet dans Android Studio
```

**Workflow mobile :**
```
yarn build → yarn cap:sync → cap open ios/android → Build depuis l'IDE
```

### Configuration

Fichier [capacitor.config.ts](../capacitor.config.ts) :
- `appId` : `com.pierre.reps.app`
- `webDir` : `dist` (dossier de build Vite)
- SplashScreen, StatusBar configurés

### Plugins natifs utilisés

| Plugin | Usage |
|---|---|
| `@capgo/capacitor-social-login` | Authentification Google native (iOS/Android) |
| `@capacitor-community/admob` | Publicités natives (bannières) |
| `@capacitor/haptics` | Retours haptiques (vibrations) |
| `@capacitor/local-notifications` | Notifications locales |

---

## Backend (Firebase)

### Architecture Firebase

```
Firebase Project: pedro-reps
├── Firestore          → Base de données NoSQL temps réel
├── Authentication     → Gestion des utilisateurs (Email, Google)
├── App Check          → Protection contre les abus d'API
└── Hosting            → Déploiement web (CDN global)
```

### Configuration

Variables d'environnement dans `.env.local` :

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Fichier de configuration : [src/firebase/config.ts](../src/firebase/config.ts)

### Modules Firebase dans le projet

| Fichier | Responsabilité |
|---|---|
| `src/firebase/config.ts` | Initialisation app, Auth, Firestore, App Check |
| `src/firebase/auth.ts` | Sign in/up (email, Google), sign out, profil |
| `src/firebase/firestore.ts` | CRUD : users, sessions, exercices, stats, badges, amis |
| `src/firebase/offline.ts` | Cache localStorage (sessions en cours, exercices) |
| `src/firebase/challenges.ts` | Logique des défis entre amis |
| `src/firebase/index.ts` | Export centralisé de tous les modules |

### Déploiement Firebase Hosting

```bash
yarn deploy    # = yarn build + firebase deploy
```

Ou automatiquement via CI/CD sur push `main`.

---

## Monitoring (Sentry)

Sentry capture automatiquement les erreurs JavaScript en production et les reporte dans un tableau de bord centralisé.

### Configuration

Variable dans `.env.local` :
```env
VITE_SENTRY_DSN=https://...@sentry.io/...
```

Si `VITE_SENTRY_DSN` est absent ou vide, Sentry est désactivé (aucun appel réseau).

### Logger — service centralisé

**Ne jamais utiliser `console.log/error/warn` directement.** Utiliser le service logger :

```ts
import { logger } from '@/utils/logger';

// Logs simples
logger.debug('message');                    // Dev uniquement
logger.info('message');                     // Info + breadcrumb Sentry
logger.warn('message', { key: 'value' });   // Warning + Sentry captureMessage

// Erreurs (envoyées à Sentry en production)
logger.error('message', error);             // Error object → Sentry captureException
logger.error('message', 'string');          // Non-Error → Sentry captureMessage
logger.captureException(new Error('...'));  // Exception manuelle

// Contexte utilisateur Sentry
logger.setUser({ id: 'uid', email: '...' });
logger.setUser(null);                        // Déconnexion

// Tags et contexte pour le filtrage dans Sentry
logger.setTag('platform', 'ios');
logger.setContext('session', { duration: 300 });
logger.addBreadcrumb('button_click', { button: 'start' });
```

Fichier source : [src/utils/logger.ts](../src/utils/logger.ts)

---

## CI/CD & Déploiement

### GitHub Actions

Pipeline défini dans [.github/workflows/ci.yml](../.github/workflows/ci.yml).

**Déclenchement** : push ou PR vers `main`

```
1. yarn install          → Installation des dépendances
2. yarn test:coverage    → Tests + génération coverage/lcov.info
3. SonarCloud Scan       → Analyse qualité (lit lcov.info)
4. yarn type-check       → Vérification TypeScript
5. yarn build            → Build de production
6. Firebase Deploy       → (push main uniquement)
```

### Déploiements

| Cible | Déclencheur | Commande |
|---|---|---|
| Firebase Hosting (web) | Push `main` via CI | `yarn deploy` |
| Vercel (web alternatif) | Auto via intégration Vercel | — |
| iOS (App Store) | Manuel depuis Xcode | `yarn build && yarn cap:sync && cap open ios` |
| Android (Play Store) | Manuel depuis Android Studio | `yarn build && yarn cap:sync && cap open android` |

---

## Toutes les commandes

```bash
# ── Développement ──────────────────────────────────────
yarn dev                    # Serveur de développement
yarn build                  # Build production
yarn preview                # Prévisualiser le build

# ── Qualité ────────────────────────────────────────────
yarn lint                   # Lint ESLint (0 warning toléré)
yarn format                 # Formatage Prettier
yarn type-check             # Vérification TypeScript

# ── Tests ──────────────────────────────────────────────
yarn test                   # Mode watch (développement)
yarn test --run             # Exécution unique de tous les tests
yarn test:coverage          # Tests + rapport de couverture HTML/LCOV
yarn test --run <fichier>   # Fichier spécifique
yarn test --run -t "<nom>"  # Filtrer par nom de test

# ── Mobile ─────────────────────────────────────────────
yarn cap:sync               # Sync build web → natif
yarn cap:open:ios           # Ouvrir dans Xcode
yarn cap:open:android       # Ouvrir dans Android Studio

# ── Déploiement ────────────────────────────────────────
yarn deploy                 # Build + déploiement Firebase Hosting
```
