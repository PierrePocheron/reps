# Mémoire du projet Reps

## Préférences utilisateur

- **Ne pas lancer les tests automatiquement** — les tests prennent du temps et des ressources. Les lancer seulement si explicitement demandé, ou en cas de doute critique sur une régression.
- **Workflow** : une feature = une branche, commits conventionnels (`feat(module): description`, `refactor:`, `docs:`, `test:`, etc.), merge sur `main` après validation.

## Commandes du projet

- `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"` — requis avant d'exécuter `yarn` dans le shell.
- `yarn type-check` — vérification TypeScript (toujours lancer après des modifications de types).
- `yarn test --run` — exécution unique de tous les tests.
- `yarn test:coverage` — tests + rapport de couverture HTML/LCOV.

## Architecture

- Stack : React 18 + TypeScript + Vite + Capacitor (iOS/Android) + Firebase
- Alias `@/` → `src/`
- `noUncheckedIndexedAccess: true` dans tsconfig — les accès `array[0]` retournent `T | undefined`, utiliser `array[0]!` dans les tests.
- Types partagés dans `src/firebase/types.ts` (User, Session, FriendRequest, Badge, etc.)
- Logger centralisé : `import { logger } from '@/utils/logger'` — ne jamais utiliser `console.*`

## Points clés tests

- Couverture actuelle : ~71% statements (251 tests, 21 fichiers)
- `vi.mock` + `vi.mocked` + `mockResolvedValueOnce` comme pattern standard
- Bug connu : `calculateUserStats` mute les dates — toujours retourner `new Date(dateMs)` depuis `toDate()`
- Badge `poussin` (threshold=0) toujours débloqué — pré-seeder `badges: ['poussin']` dans les tests
- `VITE_SENTRY_DSN` est défini dans `.env.local` — Sentry IS activé en test, assertions en conséquence
