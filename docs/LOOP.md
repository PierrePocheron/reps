# Loop d'amélioration continue

Chaque itération livre **une** amélioration sur `dev`, comparée à ce que font les concurrents
(`docs/COMPETITIVE.md`), puis note une ligne dans le journal ci-dessous.
Backlog : GitHub Project « REPS — Roadmap » (#9), issues labellisées `P0` → `P3`.

## Une itération

1. **Synchroniser** : `git checkout dev && git pull` ; relire les 5 dernières lignes du journal.
2. **Choisir** l'issue ouverte la plus prioritaire (`P0` > `P1` > …) faisable en autonomie.
   Ignorer celles labellisées `bloqué-pierre`. Toutes les 3 itérations : une passe de cohérence UI/UX
   sur un écran (textes, accessibilité, états vides, clair/sombre) au lieu d'une fonctionnalité.
3. **Comparer** : comment Hevy / Strong / Boostcamp… le font (rapport + recherche rapide si besoin) ;
   2-3 lignes en commentaire de l'issue sur le comportement visé.
4. **Implémenter** le plus petit diff qui fonctionne, selon les règles du projet : `logger` (jamais
   `console`), tutoiement, tokens clair/sombre, cibles ≥ 44 px, `noUncheckedIndexedAccess`.
5. **Vérifier** : `yarn type-check`, `yarn lint` (0 erreur), `yarn vitest run`, `yarn test:rules` si les
   règles Firestore changent ; contrôle visuel sur `yarn dev:demo` (émulateurs + données de démo, compte dans `scripts/seed-emulator.mjs`).
6. **Livrer** : commit (numéroté `[i/N]` si multi-commits, sans `Co-Authored-By`, **aucune donnée
   personnelle** — repo public), push `dev`, commentaire de bilan sur l'issue, fermeture si terminée.
7. **Journaliser** : une ligne ci-dessous.

## Interdit sans Pierre

Merger vers `main`/`prod`, publier une release, déployer (web, règles Firestore), toucher aux
consoles Firebase / Play / AdMob, créer des comptes, envoyer quoi que ce soit à l'extérieur.
Une issue qui en dépend → label `bloqué-pierre` + commentaire, et on passe à la suivante.

## Journal

| Date | Issue | Livré | Commit |
|---|---|---|---|
| 2026-10-03 | — | Mise en place : branches `dev`/`main`/`prod`, script de release, CI, analyse concurrentielle, 36 issues, planche mascotte, réflexion site web | `1fd1cdf` |
| 2026-10-03 | #5 | Environnement de démo sur émulateurs (`yarn dev:demo`) ; bugs trouvés : #38 (séries), #39 (carte défi) | `c61d0b9` |
| 2026-10-03 | #2 | Records détectés et célébrés pendant la séance (1RM estimé, trophée sur la série, rappel en fin de séance) | `27a60b4` |
| 2026-10-03 | #39 (passe UI/UX accueil) | Carte défi sans débordement ; « Dernière activité » couvre la muscu ; bug P0 trouvé : séance muscu non persistée (#40) | `09cbf9a` |
| 2026-10-03 | #40 | La séance muscu en cours survit à la fermeture / au rechargement (persist Zustand + test) | `1ed034e` |
| 2026-10-03 | #4 | Graphique de progression par exercice (1RM estimé, charge max, volume ; 3 mois / 1 an / tout) | `411794a` |
| 2026-10-03 | passe UI/UX séance muscu + Records | Séance muscu accessible (cibles 44 px, champs nommés) ; les cartes Records ouvrent la courbe de progression | `02f03be` |
| 2026-10-03 | #3 | Notification de fin de repos écran verrouillé ; décompte calé sur l'heure de fin (ne se fige plus en arrière-plan) | `cf43f9f` |
| 2026-10-03 | #38 | Une seule série (jours d'entraînement renfo + muscu) dans l'en-tête et les stats ; record juste ; badges de série via la muscu | `6903f88` |
