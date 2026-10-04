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

Ce projet utilise des **tests unitaires**, des **tests d'intégration légère** (mocks de dépendances externes) et un **test de fumée de bout en bout** sur la démo (émulateurs Firebase).

| Catégorie | Description | Exemples dans ce projet |
|---|---|---|
| **Unitaire** | Teste une fonction isolée, sans dépendances réelles | `utils/calories.ts`, `utils/formatters.ts`, `utils/validation.ts` |
| **Intégration (mockée)** | Teste un module avec ses dépendances mockées (Firebase, Sentry…) | `firebase/auth.ts`, `firebase/firestore.ts`, `store/sessionStore.ts` |
| **Composant React** | Teste le rendu et l'interactivité d'un composant UI | `components/BottomNav.tsx`, `pages/Home.tsx` |
| **Hook React** | Teste la logique d'un custom hook | `hooks/useStreak.ts`, `hooks/useChallenges.ts` |

### Test de fumée E2E (`yarn e2e`)

`scripts/e2e-smoke.mjs` pilote un vrai navigateur (Playwright) sur la démo. Il enchaîne 15 parcours :

| Parcours | Ce qui est vérifié |
|---|---|
| Connexion, navigation | Chaque onglet de la barre flottante ouvre sa page ; le bouton central ouvre un sélecteur de séance qui répond |
| Nouvelle séance (bouton central) | Muscu : séance libre, exercice ajouté, série validée, fin immédiate avec comparaison au récap ; renfo : séance de base, récap ; séances supprimées ensuite |
| Séance muscu complète | Refaire, titre et note, rappel « Précédent », repos auto, barre fixée, écran de récap, carte titrée dans l'historique |
| Séance renfo | Refaire, compter, récap avec comparaison — réseau lent (1,5 s) et fin immédiate |
| Hors ligne | Bandeau sur une ligne qui ne masque pas l'en-tête de séance ; réseau coupé avant « Terminer » : récap et retour à l'accueil sans attendre le réseau, séance dans l'historique à la reconnexion ; suppression hors ligne qui tient au retour du réseau |
| Échauffement, superset, repos | Échauffement en tête, échanger deux exercices, pas de repos au milieu d'un tour, ±15 s, durée retenue, exercice en secondes + chrono, remplacer un exercice, annulation |
| Mensurations et récap | Saisie, récap mensuel et muscles travaillés |
| Records | Courbe de progression au-dessus de la navigation |
| Séance oubliée | Muscu et renfo enregistrées à une date passée, rangées à leur date |
| Modifier / supprimer | Charge corrigée (muscu), reps corrigées (renfo), suppression confirmée |
| Filtrer l'historique | Filtre par exercice ; « Refaire » depuis une carte basse ouvre la séance en haut |
| Import CSV Strong | Aperçu, import, réimport sans doublon |
| Petit écran (320 px) | Rien ne déborde sur les pages principales, dans le dialogue de suppression du compte, ni en séance (repos ouvert) |

Il échoue si une page lève une erreur JS ou se fige (boucle de rendu), avec un garde-fou global de 6 minutes.
Les parcours ajoutent des séances à la démo : relancer `yarn dev:demo` repart de données propres. Après des dizaines
de passages, l'émulateur Firestore grossit (plusieurs Go) et ralentit jusqu'à faire échouer des parcours : relancer la démo.
En cas d'échec, le message montre l'élément attendu (journal d'appel Playwright).

```bash
yarn dev:demo   # terminal 1 : émulateurs + données de démo
yarn e2e        # terminal 2
```

À lancer avant chaque PR vers `main`.

### Audit de contraste (`yarn a11y`)

`scripts/contrast-audit.mjs` calcule le contraste de chaque texte visible (WCAG AA : 4,5:1, 3:1 pour le grand texte)
sur 8 écrans, en clair et en sombre, avec les fonds réels (transparences comprises). Démo lancée, puis `yarn a11y`.

### Démo sur l'émulateur Android (natif)

Pour tester ce que le web ne couvre pas (notifications, feuille de partage, alarmes exactes) :

```bash
yarn dev:demo                                   # terminal 1 : émulateurs Firebase
yarn vite build --mode demo && npx cap sync android && (cd android && ./gradlew assembleDebug)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:9099 tcp:9099 && adb reverse tcp:8085 tcp:8085   # l'appli joint les émulateurs du Mac
```

Le build **debug** autorise le HTTP en clair vers `127.0.0.1` (`android/app/src/debug/res/xml/network_security_config.xml`) ;
le build release l'interdit. La WebView d'un build debug se pilote avec l'API `_android` de Playwright
(`device.webView({ pkg: 'com.pierre.reps.app' })`). Repasser ensuite sur les vraies valeurs : `yarn build && npx cap sync android`.

Widget d'écran d'accueil (#36) : appui long sur l'accueil → Widgets → « Reps », le poser, puis ouvrir l'appli
(elle pousse série et séances de la semaine). Données : `adb shell run-as com.pierre.reps.app cat shared_prefs/reps_widget.xml`.
 Il a déjà attrapé deux bugs invisibles aux tests unitaires : le gel en fin de
séance muscu (#43) et le retour forcé à l'accueil juste après la connexion.

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
