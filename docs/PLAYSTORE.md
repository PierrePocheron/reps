# Reps — Fiche Play Store

> Textes et informations à renseigner dans la Google Play Console.

---

## Informations de base

| Champ | Valeur |
|-------|--------|
| Nom de l'application (≤ 30) | `Reps – Carnet muscu & renfo` *(27 caractères)* |
| ID de l'application | `com.pierre.reps.app` |
| Langue principale | Français (fr-FR) |
| Catégorie | Santé & Fitness |
| Sous-catégorie | Fitness |
| Classification de contenu | Tout public (PEGI 3) |
| URL politique de confidentialité | `https://pedro-reps.web.app/privacy-policy` (Firebase Hosting — en ligne seulement après l'étape 3 de l'[ordre de soumission](#ordre-de-soumission-dans-cet-ordre)) |
| URL de suppression de compte | `https://pedro-reps.web.app/privacy-policy#suppression-compte` |

---

## Description courte (≤ 80 caractères)

```
Note tes séances de muscu et de renfo, bats tes records, motive-toi entre amis.
```

*(79 caractères — les trois piliers des leaders : noter, progresser, rester motivé)*

---

## Description longue (≤ 4 000 caractères)

```
Reps, c'est ton carnet d'entraînement : gratuit, en français, pour la muscu comme pour le renfo au poids du corps. Tu notes ta séance en deux taps, tu vois tes charges grimper et tu restes motivé avec tes amis.

━━━ NOTE TES SÉANCES EN DEUX TAPS ━━━

• Musculation : prépare ta séance (séries, répétitions, charges), puis valide chaque série d'un geste. Tes charges de la dernière fois sont pré-remplies.
• Renforcement au poids du corps : pompes, squats, tractions, gainage… compte tes répétitions en direct.
• Minuteur de repos lancé automatiquement après chaque série, avec notification même écran verrouillé.
• Calculateur de disques : les disques à charger de chaque côté de la barre.
• Note par exercice (réglage machine, sensation), rappelée à la séance suivante.
• Types de séries (échauffement, dégressive, échec) et effort ressenti (RPE) en option.
• Ta séance est sauvegardée en continu : même si l'appli se ferme, tu reprends où tu en étais.
• 1 324 exercices illustrés, avec les muscles ciblés et les consignes pas à pas.
• Modèles de séance, ou refais une séance passée en un geste depuis l'historique.
• Supersets, exercices en durée (gainage) avec chrono, échauffement calculé, suggestion de charge quand tout est réussi.
• Repos réglable par exercice, ±15 s d'un geste, écran maintenu allumé pendant la séance.
• Réordonne ou remplace un exercice en pleine séance, donne un titre et une note à ta séance.

━━━ VOIS TA PROGRESSION ━━━

• Records détectés en direct : bats ton meilleur 1RM estimé et Reps te le fête.
• Une courbe par exercice : 1RM estimé, charge max ou volume, sur 3 mois, 1 an ou depuis le début.
• Historique complet de tes séances et de tes records : modifie, supprime, filtre par exercice, ajoute une séance oubliée.
• Écran de fin de séance : durée, volume, records et comparaison avec ta dernière séance.
• Statistiques : calendrier d'activité, progression semaine par semaine, créneaux où tu t'entraînes le plus.
• Muscles travaillés : tes séries par groupe musculaire sur 7 ou 30 jours.
• Série de jours d'entraînement d'affilée, renfo et muscu confondus.

━━━ RESTE MOTIVÉ ━━━

• Défis progressifs (pompes, squats, gainage…), ou crée le tien.
• 22 badges à débloquer.
• Ajoute tes amis : classement du jour, de la semaine, du mois ou depuis le début, et fil d'activité.
• Partage ta séance en image (stories, messages) en un geste.
• Rappel d'entraînement à l'heure de ton choix.

━━━ PENSÉ POUR TOI ━━━

• Tutoriel et questionnaire de départ : ton objectif de la semaine et un premier programme adapté.
• Un jour de repos par semaine ne casse pas ta série.
• Mode sombre ou clair, 8 couleurs d'accent.
• Fonctionne hors connexion : tout se synchronise au retour du réseau.
• Exercices en français ou en anglais selon la langue de ton téléphone.

━━━ TES DONNÉES T'APPARTIENNENT ━━━

Tes séances sont synchronisées de façon sécurisée et ne sont jamais revendues. Exporte-les en CSV quand tu veux, ou importe ton historique Strong ou Hevy pour tout retrouver dans Reps. Tu peux supprimer ton compte et toutes tes données depuis l'appli.

Débutant ou confirmé, lance ta première séance : chaque rep compte.
```

*(~3 150 caractères. À ne pas promettre tant que ce n'est pas tranché : « sans pub », niveaux — il n'y a pas de système de niveaux dans l'appli.)*

---

## Captures d'écran (téléphone, 1080 × 1920)

Générées depuis la démo, légendées par bénéfice : `store/fr-FR/screenshots/` (8 PNG, ordre = ordre d'affichage).

```bash
yarn dev:demo          # terminal 1 : émulateurs + données de démo
yarn store:screenshots # terminal 2 : régénère les 8 captures
```

Les légendes et les écrans se règlent dans `scripts/store-screenshots.mjs`. À régénérer quand la mascotte sera
choisie (#8) ou après un changement visuel notable.

---

## Nouveautés (version 1.0)

```
Première version de Reps !

• Muscu et renfo dans un seul carnet
• Records détectés en direct et courbe de progression par exercice
• Minuteur de repos avec notification
• 1 324 exercices illustrés (FR/EN)
• Statistiques, séries, défis progressifs et 22 badges
• Classement et fil d'activité avec tes amis
• Import de ton historique Strong ou Hevy
• Widget Android : ta série d'un coup d'œil
```

---

## Déclarations de données (Data Safety — Play Console)

À renseigner dans **Contenu de l'appli › Sécurité des données**. Ce tableau décrit le build Android actuel : à
reprendre si une collecte change (pubs, Sentry, nouveau champ de profil). La [politique de
confidentialité](../src/pages/PrivacyPolicy.tsx) dit la même chose : garder les deux alignées.

**Réponses générales** : l'appli collecte des données → **Oui** ; toutes chiffrées en transit → **Oui** ;
l'utilisateur peut demander leur suppression → **Oui** (Profil › Supprimer mon compte, immédiat, et
`https://pedro-reps.web.app/privacy-policy#suppression-compte`).

### Données collectées

Pour chaque ligne : **collectée**, **non partagée** (Firebase, Sentry, Google Fonts et jsDelivr sont des
prestataires qui traitent pour le compte de Reps : ce n'est pas un « partage » au sens de Play), **traitée de
façon éphémère : Non**.

| Catégorie Play › type | Contenu réel | Finalités | Obligatoire ou facultative |
|---|---|---|---|
| Infos personnelles › Nom | Prénom, nom, pseudo | Fonctionnement de l'appli, Gestion du compte | Obligatoire |
| Infos personnelles › Adresse e-mail | E-mail du compte (Google ou e-mail/mot de passe) | Gestion du compte | Obligatoire |
| Infos personnelles › ID utilisateur | UID Firebase | Fonctionnement de l'appli, Gestion du compte | Obligatoire |
| Infos personnelles › Autres infos | Date de naissance, sexe | Fonctionnement de l'appli (âge, calories) | Facultative |
| Santé et remise en forme › Infos sur la santé | Poids, taille, mensurations datées | Fonctionnement de l'appli | Facultative |
| Santé et remise en forme › Infos sur la remise en forme | Séances, exercices, répétitions, charges, records, séries | Fonctionnement de l'appli | Obligatoire |
| Activité dans l'appli › Autre contenu généré par l'utilisateur | Titres et notes de séance, notes par exercice, exercices, défis et modèles personnalisés | Fonctionnement de l'appli | Facultative |
| Activité dans l'appli › Interactions avec l'appli | Relecture Sentry autour d'une erreur (textes masqués, médias bloqués) | Analyse | Obligatoire |
| Infos et performances de l'appli › Journaux de plantage | Erreurs et plantages (Sentry) | Analyse | Obligatoire |
| Infos et performances de l'appli › Diagnostics | Traces de performance Sentry (10 % des sessions) | Analyse | Obligatoire |

**Non collecté** (ne rien cocher) : photos (la photo du compte Google n'est pas enregistrée), position, contacts,
identifiants de l'appareil et **identifiant publicitaire** (AD_ID retiré du manifeste, pas de pub en v1),
infos financières, messages. Sur Android, les notifications sont locales : aucun jeton FCM (le jeton n'existe que
sur la version web). L'adresse IP qui transite vers Google Fonts et jsDelivr (polices et illustrations) n'est ni
stockée ni utilisée par Reps.

Les autres utilisateurs connectés voient le profil public, les séances de renfo et le fil d'activité : c'est la
fonction sociale de l'appli, pas un transfert à une entreprise tierce (à préciser si Google pose la question).

### Pratiques de sécurité

- [x] Les données sont chiffrées en transit (HTTPS/TLS)
- [x] L'utilisateur peut demander la suppression de ses données (in-app, immédiate, et par l'URL ci-dessus)
- [x] Les données ne sont pas vendues à des tiers

---

## Feature graphic

**Feature Graphic** : 1 024 × 500 px (fond sombre, logo Reps + slogan)

---

## Checklist avant soumission

### Ordre de soumission (dans cet ordre)

Les étapes 1 à 3 se font dans la même fenêtre : l'ancien web réécrit l'e-mail dans le profil public, et les
anciennes règles refusent des écritures de la nouvelle appli (suppression de compte comprise). Rien n'est
automatique : la CI ne déploie ni les règles ni le web (voir [DEPLOY.md](DEPLOY.md#1-web--firebase-hosting)).

1. **Migrer les données héritées** : les profils publics écrits par l'ancienne version portent encore e-mail, date
   de naissance, sexe, poids et taille, lisibles par tout compte connecté. Avec une clé de compte de service du
   projet `pedro-reps`, rangée hors du repo :
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/hors-du-repo/cle-compte-de-service.json
   node scripts/migrate-security.mjs --dry-run   # relire la liste des comptes et demandes concernés
   node scripts/migrate-security.mjs             # migration réelle
   ```
2. **Règles et index Firestore** :
   ```bash
   yarn test:rules
   firebase deploy --only firestore:rules,firestore:indexes --project reps
   ```
   Attendre que l'exemption d'index `kudos.fromUid` (portée groupe de collections) soit **Activée** (console
   Firebase › Firestore › Index › Champ unique). Sans elle, la suppression de compte échoue (`FAILED_PRECONDITION`).
3. **Web**, qui porte la politique de confidentialité et l'URL de suppression :
   ```bash
   yarn build
   firebase deploy --only hosting --project reps
   ```
   Ouvrir en navigation privée `https://pedro-reps.web.app/privacy-policy#suppression-compte` : la page s'affiche,
   avec le nom de l'éditeur et l'e-mail de contact (`VITE_LEGAL_NAME`, `VITE_CONTACT_EMAIL` du `.env`). Puis
   relancer `node scripts/migrate-security.mjs --dry-run` : il doit afficher « 0 utilisateurs migrés ».
4. **Test en production avec deux comptes jetables** (inscription e-mail sur `pedro-reps.web.app`) : les rendre
   amis, donner et recevoir un encouragement (kudos), puis **Profil › Supprimer mon compte** sur l'un : la
   suppression doit aboutir et la connexion avec ce compte doit ensuite échouer. Supprimer l'autre de la même façon.
5. **AAB** : keystore une fois (`bash scripts/setup-keystore.sh`), puis `bash scripts/build-android-release.sh`
   → `android/app/build/outputs/bundle/release/app-release.aab` (le script efface l'ancien avant de construire).
   Contrôler le manifeste fusionné (attendu : `…/AndroidManifest.xml:0`, ni identifiant publicitaire ni SDK
   Facebook), puis effacer le vieil export Android Studio `android/app/release/` :
   ```bash
   grep -rcE "permission.AD_ID|ACCESS_ADSERVICES|com.facebook" android/app/build/intermediates/merged_manifests/release/
   ```
6. **Formulaires Play Console** : Sécurité des données ([tableau ci-dessus](#déclarations-de-données-data-safety--play-console)),
   Identifiant publicitaire = **Non**, Annonces = **Non**, URL de la politique et URL de suppression de compte, puis la
   liste [Play Console](#play-console) ci-dessous. Seulement alors, envoyer l'AAB.

### Technique
- [x] `targetSdk 36`, AAB, R8/ProGuard, `allowBackup=false`, `POST_NOTIFICATIONS`
- [x] Suppression de compte in-app, export JSON, politique de confidentialité (`/privacy-policy`, ancre `#suppression-compte`)
- [x] `VITE_RECAPTCHA_SITE_KEY` réelle dans `.env` (⚠️ vérifier que c'est bien la clé enregistrée dans Firebase → App Check ; ne pas activer l'*enforcement* App Check tant que ce n'est pas testé sur l'APK signé)
- [x] Publicités mobiles coupées (`ENABLED_MOBILE: false`) : `AD_ID` et `ACCESS_ADSERVICES_*` retirés du manifeste (`tools:node="remove"`), mesure AdMob différée (`DELAY_APP_MEASUREMENT_INIT`) ; l'ID AdMob de test reste, sans effet tant que le SDK n'est pas initialisé
- [x] SDK Facebook exclu (`SocialLogin.providers.facebook: false` dans `capacitor.config.ts`, appliqué par `cap sync`)
- [ ] Étapes 1 à 4 de l'[ordre de soumission](#ordre-de-soumission-dans-cet-ordre) faites
- [ ] Fusionner `dev` → `main` (release v1.0.0)
- [ ] Keystore : `bash scripts/setup-keystore.sh` (crée `android/reps-release.keystore` + `keystore.properties`, tous deux gitignorés — **sauvegarder le keystore et ses mots de passe hors du Mac**, sa perte = impossible de mettre l'app à jour)
- [ ] `versionCode = 1`, `versionName = "1.0"` — OK pour la première soumission (incrémenter `versionCode` à chaque envoi suivant)
- [ ] AAB buildé et signé : `bash scripts/build-android-release.sh` → `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Licence des illustrations : lire les [CGU Gym visual](https://gymvisual.com/content/3-terms-and-conditions-of-use) (les médias du dataset sont © Gym visual, redistribués avec permission sous condition d'attribution + 180×180 — les deux sont respectées dans l'app) ; en cas de doute, un mail à Gym visual pour confirmer l'usage embarqué

### Play Console
- [x] Compte développeur créé (25 €)
- [ ] Application créée dans la console (nom `Reps`, id `com.pierre.reps.app`, gratuite)
- [ ] **Play App Signing** activé (par défaut) → récupérer l'empreinte **SHA-1 de la clé de signature Google** dans *Intégrité de l'application* et l'ajouter dans Firebase → Paramètres du projet → Application Android (en plus du SHA-1 de la keystore d'upload). Sans ça, la connexion Google échoue sur l'app installée depuis le Play Store
- [ ] Sécurité des données renseignée (tableau ci-dessus)
- [ ] Politique de confidentialité URL renseignée : `https://pedro-reps.web.app/privacy-policy`, et URL de suppression de compte : `https://pedro-reps.web.app/privacy-policy#suppression-compte`
- [ ] Contenu de l'appli : « Annonces » = Non (v1), « Identifiant publicitaire » = Non, « Accès à l'appli » = fournir un compte de test (email + mot de passe) car l'app exige une connexion, « Applis santé » = déclarer les données de forme physique (poids, taille, mensurations, séances)
- [ ] Public cible : aucune tranche d'âge de moins de 13 ans (la politique et le formulaire de profil excluent les moins de 13 ans)
- [ ] Classification de contenu remplie (questionnaire → Tout public)
- [ ] Captures d'écran uploadées (min. 2 téléphone, idéalement 6-8, format 9:16 ou 9:20)
- [ ] Feature Graphic 1 024 × 500 uploadée
- [ ] Description courte et longue renseignées
- [ ] Pays de distribution sélectionnés
- [ ] **Test fermé obligatoire** (compte perso créé après nov. 2023) : au moins **12 testeurs inscrits pendant 14 jours consécutifs** sur une piste de test fermé, puis demande d'accès à la production depuis la console. À lancer dès que l'AAB est prêt — c'est le chemin critique du calendrier

### Avant la publication
- [ ] Installer l'AAB via la piste de test interne sur un appareil physique Android
- [ ] Vérifier la connexion Google sur le build signé (SHA-1 upload + SHA-1 Play App Signing dans Firebase)
- [ ] Vérifier le tutoriel au premier lancement, la bibliothèque (vignettes CDN + mode avion), les notifications locales, le mode sombre, le partage d'une image et l'export CSV (FileProvider limité au cache)
- [ ] Vérifier que le crash reporting Sentry remonte bien depuis le build release (ProGuard : `proguard-rules.pro` conserve les numéros de ligne)
- [ ] Publicités : ne rien réactiver avant que le compte AdMob soit rétabli. Le jour venu : retirer les `tools:node="remove"` et `DELAY_APP_MEASUREMENT_INIT` du manifeste, puis mettre à jour « Annonces », « Identifiant publicitaire », la Sécurité des données et la politique de confidentialité
