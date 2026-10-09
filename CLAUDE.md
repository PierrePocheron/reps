# CLAUDE.md — Reps

Dépôt **public**. Méthode de travail et boucle d'amélioration : [docs/LOOP.md](docs/LOOP.md).

## Règle n°1 : aucun secret ni information privée dans le dépôt
- Rien de ce qui suit ne doit être versionné, ni dans le code, ni dans les tests, les docs, les commentaires ou les
  messages de commit :
  - `.env` et ses variantes : seuls `.env.example` et `.env.demo`, à valeurs factices, sont versionnés ;
  - `android/app/google-services.json` et tout `GoogleService-Info.plist` ;
  - les clés de compte de service (`*-firebase-adminsdk-*.json`, `serviceAccount*.json`) ;
  - `android/*.keystore`, `keystore.properties` et leurs mots de passe ;
  - les jetons Sentry, la clé reCAPTCHA réelle et les identifiants de test de production.
- Cela vaut aussi pour les clés Firebase dites « publiques » : elles passent par `VITE_*` dans `.env`.
- Aucun nom réel (employeur, client, personne), aucun e-mail ni téléphone réel, même dans un placeholder ou un test.
- Avant chaque commit : `git diff --cached` relu à la recherche de secrets. Avant d'ajouter un fichier de config :
  vérifier `git check-ignore -v <fichier>`.
- Secret déjà poussé : prévenir Pierre immédiatement, en tête de message. La rotation est obligatoire, car le retirer
  du code ne le retire pas de l'historique.
