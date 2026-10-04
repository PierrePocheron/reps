# Variables d'environnement et fichiers de configuration

Copier le modèle puis le remplir : `cp .env.example .env`. **Ne jamais committer** `.env` (ignoré par git).

## `.env`

| Variable | Obligatoire | Où la trouver |
|---|---|---|
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | Oui | Firebase Console › Paramètres du projet › Vos applications › appli Web |
| `VITE_FIREBASE_MEASUREMENT_ID` | Non | Idem (Google Analytics) |
| `VITE_FIREBASE_VAPID_KEY` | Notifications web | Firebase › Cloud Messaging › Certificats Web Push |
| `VITE_RECAPTCHA_SITE_KEY` | App Check (prod) | Firebase › App Check › appli Web (reCAPTCHA v3) |
| `VITE_SENTRY_DSN` | Non | sentry.io › projet › Client Keys (DSN) |
| `VITE_APP_VERSION` | Non | Version suivie par Sentry (alignée sur `package.json`) |
| `VITE_LEGAL_NAME`, `VITE_CONTACT_EMAIL` | Oui (prod) | Éditeur affiché dans la politique de confidentialité |

> Le dépôt est **public** : l'identité de l'éditeur ne vit que dans `.env` et les secrets GitHub, jamais dans le code.

## Démo locale (sans projet Firebase)

`yarn dev:demo` utilise `.env.demo` (versionné, valeurs fictives) et les **émulateurs Firebase** :
aucune clé réelle n'est nécessaire. Comptes de démo : voir `scripts/seed-emulator.mjs`.

## Fichiers natifs (non versionnés)

| Fichier | Rôle | Où le récupérer |
|---|---|---|
| `android/app/google-services.json` | Firebase + connexion Google sur Android | Firebase › appli Android `com.pierre.reps.app` |
| `ios/App/App/GoogleService-Info.plist` | Firebase + connexion Google sur iOS | Firebase › appli iOS |
| `android/reps-release.keystore`, `android/keystore.properties` | Signature du build release | `bash scripts/setup-keystore.sh` (à sauvegarder hors du repo) |

## CI (GitHub Actions)

Les mêmes variables `VITE_*` sont stockées en **secrets GitHub** : `gh secret set -f .env` depuis la racine.
Secrets supplémentaires : `FIREBASE_SERVICE_ACCOUNT_REPS_APP` (déploiement Hosting), `SONAR_TOKEN` (analyse qualité).

Procédures complètes de publication : [docs/DEPLOY.md](docs/DEPLOY.md).
