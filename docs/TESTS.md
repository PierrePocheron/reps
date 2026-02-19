# Tests — Guide complet

> Documentation sur la stratégie de test, les commandes disponibles et la couverture du projet **Reps**.

---

## Sommaire

- [Type de tests utilisés](#type-de-tests-utilisés)
- [Stack de test](#stack-de-test)
- [Structure des fichiers de tests](#structure-des-fichiers-de-tests)
- [Lancer les tests](#lancer-les-tests)
- [Couverture de code](#couverture-de-code)
- [Automatisation CI/CD](#automatisation-cicd)
- [Conventions et patterns](#conventions-et-patterns)

---

## Type de tests utilisés

Ce projet utilise exclusivement des **tests unitaires** et des **tests d'intégration légère** (mocks de dépendances externes). Il n'y a pas de tests E2E (end-to-end) pour le moment.

| Catégorie | Description | Exemples dans ce projet |
|---|---|---|
| **Unitaire** | Teste une fonction isolée, sans dépendances réelles | `utils/calories.ts`, `utils/formatters.ts`, `utils/validation.ts` |
| **Intégration (mockée)** | Teste un module avec ses dépendances mockées (Firebase, Sentry…) | `firebase/auth.ts`, `firebase/firestore.ts`, `store/sessionStore.ts` |
| **Composant React** | Teste le rendu et l'interactivité d'un composant UI | `components/BottomNav.tsx`, `pages/Home.tsx` |
| **Hook React** | Teste la logique d'un custom hook | `hooks/useStreak.ts`, `hooks/useChallenges.ts` |

> **Pourquoi pas de tests E2E ?**
> L'application dépend de Firebase (Firestore, Auth) et de plugins Capacitor natifs. Les tests E2E nécessiteraient un émulateur Firebase et des simulateurs iOS/Android, ce qui sort du scope actuel. Les tests d'intégration mockés couvrent les cas critiques de manière fiable et rapide.

---

## Stack de test

| Outil | Rôle |
|---|---|
| **[Vitest](https://vitest.dev/)** | Runner de tests (compatible Vite/ESM, très rapide) |
| **[@testing-library/react](https://testing-library.com/react)** | Test des composants React (rendu, interactions) |
| **[@testing-library/jest-dom](https://github.com/testing-library/jest-dom)** | Matchers DOM supplémentaires (`toBeInTheDocument`, etc.) |
| **jsdom** | Simulation du navigateur en environnement Node.js |
| **v8** | Moteur de couverture de code (intégré à Vitest) |

Configuration dans [vite.config.ts](../vite.config.ts) :
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/setupTests.ts',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
  }
}
```

---

## Structure des fichiers de tests

Les tests sont colocalisés avec les sources dans des dossiers `__tests__/` :

```
src/
├── __tests__/
│   └── App.test.tsx
├── components/
│   ├── __tests__/
│   │   └── BottomNav.test.tsx
│   └── challenges/
│       └── __tests__/
│           └── ChallengeCard.test.tsx
├── firebase/
│   └── __tests__/
│       ├── auth.test.ts         ← 25 tests
│       ├── challenges.test.ts   ← 10 tests
│       ├── firestore.test.ts    ← 60 tests
│       └── offline.test.ts      ← 21 tests
├── hooks/
│   └── __tests__/
│       ├── useBadgeEvents.test.ts
│       ├── useChallenges.test.ts
│       └── useStreak.test.ts
├── pages/
│   └── __tests__/
│       ├── Achievements.test.tsx
│       └── Home.test.tsx
├── store/
│   └── __tests__/
│       ├── sessionStore.test.ts  ← 22 tests
│       └── userStore.test.ts
├── utils/
│   └── __tests__/
│       ├── calories.test.ts
│       ├── constants.test.ts
│       ├── formatters.test.ts
│       ├── logger.test.ts        ← 20 tests
│       ├── theme-colors.test.ts  ← 10 tests
│       └── validation.test.ts
└── setupTests.ts                 ← Mocks globaux Firebase, Audio, SocialLogin
```

---

## Lancer les tests

### Mode watch (développement)

Lance les tests en mode interactif — les tests se relancent automatiquement à chaque modification de fichier.

```bash
yarn test
```

### Mode run (une seule exécution)

```bash
yarn test --run
```

### Fichier ou dossier spécifique

```bash
# Un fichier précis
yarn test --run src/firebase/__tests__/auth.test.ts

# Tous les tests d'un dossier
yarn test --run src/firebase/

# Par nom de test (pattern)
yarn test --run -t "signInWithEmail"
```

### Avec rapport de couverture

```bash
yarn test:coverage
```

Génère les rapports dans `coverage/` :
- **Terminal** : résumé textuel immédiat
- **HTML** : `coverage/index.html` (ouvrir dans un navigateur)
- **LCOV** : `coverage/lcov.info` (utilisé par SonarCloud)

---

## Couverture de code

### État actuel

| Métrique | Valeur |
|---|---|
| Statements | **71.73%** |
| Branches | 62.54% |
| Functions | 69.73% |
| Lines | 73.41% |

### Détail par module

| Module | Couverture statements |
|---|---|
| `utils/` | ~97% |
| `hooks/` | ~93% |
| `pages/` | ~80% |
| `store/` | ~79% |
| `firebase/` | ~62% |
| `components/` | ~71% |

### Zones non couvertes

- `firebase/index.ts` (0%) — fichier de re-exports, couvrable en testant via `@/firebase`
- `firebase/firestore.ts` fonctions sociales avancées — `sendFriendRequest`, `acceptFriendRequest`, `getLeaderboardStats` (~38% du fichier)
- `store/userStore.ts` — logique `initializeAuth` et `loadUserProfile` (complexe, dépend du lifecycle Auth)

---

## Automatisation CI/CD

Les tests sont exécutés automatiquement via **GitHub Actions** à chaque push/PR sur `main`.

Pipeline [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) :

```
push/PR → main
  │
  ├── yarn install
  ├── yarn test:coverage    ← Tests + génération coverage/lcov.info
  ├── SonarCloud Scan       ← Analyse qualité (lit coverage/lcov.info)
  ├── yarn type-check       ← Vérification TypeScript
  ├── yarn build            ← Build de production
  └── Deploy Firebase       ← (sur main uniquement)
```

Le rapport LCOV généré est automatiquement transmis à **SonarCloud** pour analyse de la qualité du code.

---

## Conventions et patterns

### Structure d'un test

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('nomDuModule', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Réinitialiser les mocks entre chaque test
  });

  describe('nomDeLaFonction', () => {
    it('should [comportement attendu]', async () => {
      // Arrange — préparer les données
      vi.mocked(maFonction).mockResolvedValueOnce(résultat);

      // Act — exécuter
      const result = await maFonction(args);

      // Assert — vérifier
      expect(result).toEqual(attendu);
    });
  });
});
```

### Mocks globaux

Le fichier [src/setupTests.ts](../src/setupTests.ts) définit les mocks globaux appliqués à **tous** les tests :
- `firebase/app` — `initializeApp`, `getApps`
- `firebase/auth` — `getAuth`, `signOut`, `GoogleAuthProvider`, `onAuthStateChanged`
- `firebase/firestore` — toutes les fonctions CRUD, `writeBatch`, `Timestamp`, `serverTimestamp`
- `@capgo/capacitor-social-login` — `SocialLogin.login/logout`
- `Audio` — constructeur global pour les sons

### Mocks locaux (par fichier de test)

Certains tests redéfinissent des mocks spécifiques avec `vi.mock(...)` en tête de fichier. Ces mocks **remplacent** les mocks globaux pour ce test uniquement :

```ts
// Override local — s'applique uniquement à ce fichier de test
vi.mock('../config', () => ({ db: {} }));
vi.mock('../firestore', () => ({
  createUserDocument: vi.fn().mockResolvedValue(undefined),
}));
```

### Pattern mockResolvedValueOnce

Pour contrôler le retour d'une fonction mockée test par test :

```ts
// Une seule fois (recommandé pour isoler les tests)
vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ uid: 'user123' }) as any);

// Par défaut pour tous les appels suivants
vi.mocked(getDocs).mockResolvedValue(makeSnapshot([]) as any);
```

### Piège connu : mutation d'objet Date

Dans les tests de `calculateUserStats`, Firestore mute les dates lors du calcul de streak. Toujours retourner une **copie** depuis `toDate()` :

```ts
// ✅ Correct — nouvelle copie à chaque appel
date: { toDate: () => new Date(dateMs) }

// ❌ Incorrect — objet partagé, muté par le calcul de streak
const date = new Date();
date: { toDate: () => date }
```
