# Déploiements & stores

Tout ce qu'il faut pour publier REPS : web, règles Firestore, Android (Play Store) et iOS (App Store).
Le flux de branches et le versionnage sont dans [RELEASE.md](RELEASE.md), les variables dans [ENV.md](../ENV.md).

> **Rappel** : rien ne part en production sans Pierre (merge `main`/`prod`, release, déploiement, consoles).
> La loop d'amélioration ne fait que préparer sur `dev` ([LOOP.md](LOOP.md)).

---

## Vue d'ensemble

| Cible | Quand | Comment | Qui |
|---|---|---|---|
| **Web** (Firebase Hosting) | Merge sur `prod` | CI GitHub Actions, automatique | Pierre (merge) |
| **Règles / index Firestore** | Quand `firestore.rules` change | `firebase deploy --only firestore` | Pierre |
| **Android** (Play Store) | Après une release | AAB signé → Play Console | Pierre |
| **iOS** (App Store) | Après une release | Archive Xcode → App Store Connect | Pierre |

---

## 1. Web — Firebase Hosting

**Automatique** : la CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) déploie à chaque push sur `prod`,
après tests, type-check, lint et build. Les variables `VITE_*` viennent des secrets GitHub
(`gh secret set -f .env` depuis la racine, une fois ; à refaire si une variable change).

**À la main** (dépannage) :

```bash
yarn build
firebase deploy --only hosting --project reps
```

Vérifier ensuite : https://pedro-reps.web.app (connexion, une séance, la politique de confidentialité `/privacy-policy`).
Les onglets restés ouverts sur l'ancienne version se rechargent seuls (une fois) quand ils demandent une page qui
n'existe plus (`src/utils/staleChunk.ts`), au lieu d'afficher l'écran d'erreur.

---

## 2. Règles et index Firestore

Les règles ne sont **pas** déployées par la CI. Toujours les tester avant :

```bash
yarn test:rules                                          # 81 invariants sur l'émulateur
firebase deploy --only firestore:rules --project reps    # règles
firebase deploy --only firestore:indexes --project reps  # index (si firestore.indexes.json change)
```

**En attente de déploiement** (prêtes sur `dev`, testées) : kudos sur l'activité des amis (#30) — avec leur
effacement à la suppression du compte (champ `fromUid`, index de groupe de collections `kudos.fromUid` dans
`firestore.indexes.json`) —, lecture des modèles d'un ami (#31), **acceptation d'une demande d'ami** (la règle lisait l'état d'avant le batch :
toute acceptation était refusée, corrigé avec `getAfter`), **rejoindre ou créer un défi** (la règle exigeait un
`exerciseId` à la racine que l'appli n'écrit pas : tout refusé), **durcissement de sécurité** (chasse aux bugs du
06/10 : séances renfo et événements du fil liés au propriétaire du chemin, défis et exercices perso non
transférables, plus de notification via une simple demande d'ami en attente, demandes d'ami et kudos horodatés par le
serveur, kudos seulement sur une séance qui existe, champs du fil typés, listes du profil public plafonnées ; toutes
les écritures de l'appli actuelle restent acceptées, vérifié par les tests). Déployer **règles et index** avant de
publier la version de l'appli qui s'en sert.

---

## 3. Android — Play Store

### Prérequis (une fois)

- **JDK 21** (Android Studio en embarque un), **Android Studio** + SDK **36** (`targetSdk` 36, `minSdk` 24)
- **`android/app/google-services.json`** — **non versionné** (clé signalée par le secret scanning de GitHub) :
  Firebase Console › Paramètres du projet › Vos applications › Android `com.pierre.reps.app` › télécharger.
- **Keystore de signature** : `bash scripts/setup-keystore.sh` → `android/reps-release.keystore` +
  `android/keystore.properties` (ignorés par git). **La sauvegarder hors du repo** (gestionnaire de mots de passe) :
  sans elle, plus de mise à jour possible si la signature d'appli Google Play n'est pas activée.
- **Empreintes SHA dans Firebase** (sinon la connexion Google échoue en production) : ajouter dans l'appli Android
  Firebase le **SHA-1 et SHA-256** de la keystore *et* de la **clé de signature Google Play**
  (Play Console › Intégrité de l'application › Signature d'application), puis retélécharger `google-services.json`.
  ```bash
  keytool -list -v -keystore android/reps-release.keystore -alias reps
  ```

### Construire

```bash
scripts/release.sh prepare X.Y.Z          # sur dev : versionName + versionCode (1.2.3 → 10203)
# … PR dev → main → prod, puis sur prod :
bash scripts/build-android-release.sh     # yarn build + cap sync + bundleRelease
# → android/app/release/app-release.aab
```

Contrôle rapide sur émulateur ou téléphone : voir [TESTS.md › Démo sur l'émulateur Android](TESTS.md).

### Publier

1. Play Console › REPS › **Tests** › Test interne : téléverser l'AAB, notes de version (FR).
2. Vérifier sur un vrai téléphone (connexion Google, notification de fin de repos écran verrouillé,
   écran allumé en séance, widget, partage d'image).
3. Promouvoir vers **Production** (déploiement progressif conseillé : 20 % puis 100 %).

### Prérequis Play Console (avant la toute première publication)

- [ ] Compte développeur Google Play (25 $ une fois) avec **identité vérifiée**
- [ ] **Compte personnel récent** : test fermé obligatoire avec **au moins 12 testeurs pendant 14 jours**
      avant de pouvoir demander l'accès à la production
- [ ] **Fiche** : textes, icône 512 × 512, feature graphic 1024 × 500, captures (`store/fr-FR/screenshots/`,
      régénérables avec `yarn store:screenshots`) — contenu prêt dans [PLAYSTORE.md](PLAYSTORE.md)
- [ ] **Règles de confidentialité** : URL publique → `https://pedro-reps.web.app/privacy-policy`
- [ ] **Suppression de compte** : dans l'appli (Profil › Supprimer mon compte, déjà là : données Firestore, compte et
      copie locale de l'appareil) **et** une URL web
      expliquant la démarche (page du site, #24)
- [ ] **Sécurité des données** (Data Safety) : questionnaire rempli d'après [PLAYSTORE.md](PLAYSTORE.md#déclarations-de-données-data-safety--play-console)
- [ ] **Accès à l'appli** : fournir un **compte de test** (e-mail + mot de passe) aux réviseurs, l'appli exigeant une connexion
- [ ] **Annonces** : désactivées aujourd'hui (`ENABLED` / `ENABLED_MOBILE` à `false` dans `src/config/ads.ts`) →
      déclarer « Non » pour la v1. Avant de les activer : vrais identifiants AdMob (l'ID du manifeste
      `android/app/src/main/AndroidManifest.xml` est celui de **test** de Google, ceux de `ads.ts` sont des exemples),
      déclaration « contient des annonces », Sécurité des données (identifiant publicitaire) et, sur iOS, ATT
- [ ] **Applis santé** : déclarer les données de forme physique (séances, poids, mensurations)
- [ ] **Classification du contenu** (questionnaire IARC) et **public cible** (pas destiné aux enfants)
- [ ] Permissions : `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` (accordée par l'utilisateur, pas de déclaration
      spéciale, contrairement à `USE_EXACT_ALARM`) ; Health Connect plus tard (#35) demandera sa propre déclaration
- [ ] `targetSdk` à jour (Google exige l'API 35 minimum depuis août 2025 ; REPS cible 36)

---

## 4. iOS — App Store

### Prérequis (une fois)

- **Mac** + **Xcode** récent + **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Program** (99 $/an) — certificats et profils gérés par Xcode (« Automatically manage signing »)
- **`ios/App/App/GoogleService-Info.plist`** — non versionné : Firebase Console › appli iOS › télécharger.
  Le schéma d'URL `REVERSED_CLIENT_ID` (connexion Google) doit correspondre dans `Info.plist`.
- Identifiant AdMob iOS (`GADApplicationIdentifier` dans `Info.plist`) et identifiants de `src/config/ads.ts`

### Construire et publier

```bash
yarn build
npx cap sync ios        # à refaire après chaque ajout de plugin Capacitor
npx cap open ios        # ouvre Xcode
```

Dans Xcode : schéma **App**, cible « Any iOS Device » › **Product › Archive** › Distribute App › App Store Connect.
Puis App Store Connect : **TestFlight** (test interne), et soumission à la revue.

### Points de revue Apple à traiter avant la première soumission

- [ ] **Se connecter avec Apple** : l'appli propose la connexion Google ; la règle 4.8 impose alors une option de
      connexion équivalente respectueuse de la vie privée (en pratique *Sign in with Apple*). **Absente aujourd'hui.**
- [ ] **Manifeste de confidentialité** `PrivacyInfo.xcprivacy` (exigé depuis 2024) : **absent** à ajouter
- [ ] **Suivi publicitaire (ATT)** : sans objet tant que les annonces sont désactivées ; à leur activation, si elles
      sont personnalisées, ajouter `NSUserTrackingUsageDescription` et la demande d'autorisation
- [ ] **Suppression de compte dans l'appli** (règle 5.1.1) : déjà là
- [ ] Fiche App Store Connect : captures iPhone 6,7" et 6,5", étiquettes de confidentialité, compte de test pour la revue
- [ ] **Saisie décimale sur iPhone** (clavier français) : taper « 57,5 » dans une charge doit enregistrer 57,5 kg, pas 0.
      Vérifié sous Chromium (Android, web) : la virgule est acceptée ; WebKit n'a pas pu être testé en local

---

## 5. Secrets et accès nécessaires

| Élément | Où | Versionné ? |
|---|---|---|
| `.env` (`VITE_*`) | racine | Non — modèle : `.env.example` |
| Secrets GitHub (CI) | GitHub › Settings › Secrets | — (`gh secret set -f .env`) |
| `google-services.json` | `android/app/` | **Non** |
| `GoogleService-Info.plist` | `ios/App/App/` | **Non** |
| Keystore + `keystore.properties` | `android/` | **Non** (sauvegarde hors repo) |
| `FIREBASE_SERVICE_ACCOUNT_REPS_APP` | secret GitHub | — (déploiement Hosting par la CI) |
| `SONAR_TOKEN`, DSN Sentry | secrets GitHub / `.env` | Non |

En cas de fuite d'une clé : la retirer du dépôt, puis la **restreindre ou la régénérer** dans la console concernée
(Google Cloud › Identifiants pour les clés Firebase). Retirer le fichier ne suffit pas : il reste dans l'historique.

---

## 6. Après une publication

- Release GitHub créée par `scripts/release.sh publish` (notes automatiques)
- Surveiller **Sentry** (erreurs de la nouvelle version) et la Play Console (plantages, ANR) les premiers jours
- Mettre à jour la ligne de la release dans le journal de [LOOP.md](LOOP.md) si la loop tourne
