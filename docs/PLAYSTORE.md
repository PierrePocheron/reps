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
| URL politique de confidentialité | `https://pedro-reps.web.app/privacy-policy` (Firebase Hosting — redéployer le web avant de la renseigner) |

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

━━━ VOIS TA PROGRESSION ━━━

• Records détectés en direct : bats ton meilleur 1RM estimé et Reps te le fête.
• Une courbe par exercice : 1RM estimé, charge max ou volume, sur 3 mois, 1 an ou depuis le début.
• Historique complet de tes séances et de tes records.
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

Tes séances sont synchronisées de façon sécurisée et ne sont jamais revendues. Tu peux supprimer ton compte et toutes tes données depuis l'appli.

Débutant ou confirmé, lance ta première séance : chaque rep compte.
```

*(~3 000 caractères. À ne pas promettre tant que ce n'est pas tranché : « sans pub », niveaux — il n'y a pas de système de niveaux dans l'appli.)*

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
```

---

## Déclarations de données (Data Safety — Play Console)

À renseigner dans la section **"Sécurité des données"** de la Play Console.

### Données collectées

| Type de données | Collectées | Partagées | Traitement | Obligatoire |
|----------------|-----------|-----------|------------|-------------|
| Nom | Oui | Non | Compte utilisateur | Oui |
| Adresse e-mail | Oui | Non | Compte utilisateur | Oui |
| Photo de profil | Oui | Non | Compte utilisateur | Non |
| Identifiant utilisateur | Oui | Non | Analytique | Oui |
| Informations de santé et de forme (poids, taille) | Oui | Non | Fonctionnalité de l'application | Non |
| Activités sportives (séances) | Oui | Non | Fonctionnalité de l'application | Oui |
| Identifiants de l'appareil (AD_ID) | Oui | Oui (Google AdMob) | Publicités | Non |

> **AD_ID** : le SDK AdMob reste embarqué (publicités mobiles désactivées pour la v1, `ENABLED_MOBILE: false`), donc la permission `com.google.android.gms.permission.AD_ID` figure dans le manifest fusionné. Google exige que la déclaration soit cohérente : **déclarer « Identifiants de l'appareil » collectés** même sans pub affichée. À la question « Votre appli contient-elle des annonces ? » répondre **Non** tant que `ENABLED_MOBILE` est `false`, puis passer à **Oui** et mettre à jour cette section quand AdMob sera réactivé.
| Journaux de pannes | Oui | Oui (Sentry) | Analytique | Non |

### Pratiques de sécurité

- [x] Les données sont chiffrées en transit (HTTPS/TLS)
- [x] L'utilisateur peut demander la suppression de ses données
- [x] Les données ne sont pas vendues à des tiers

---

## Feature graphic

**Feature Graphic** : 1 024 × 500 px (fond sombre, logo Reps + slogan)

---

## Checklist avant soumission

### Technique
- [x] `targetSdk 36`, AAB, R8/ProGuard, `allowBackup=false`, `POST_NOTIFICATIONS`
- [x] Suppression de compte in-app, export JSON, politique de confidentialité (`/privacy-policy`, ancre `#suppression-compte`)
- [x] `VITE_RECAPTCHA_SITE_KEY` réelle dans `.env` (⚠️ vérifier que c'est bien la clé enregistrée dans Firebase → App Check ; ne pas activer l'*enforcement* App Check tant que ce n'est pas testé sur l'APK signé)
- [x] Publicités mobiles coupées (`ENABLED_MOBILE: false`) — l'ID AdMob de test reste dans le manifest, sans effet tant que le SDK n'est pas initialisé
- [ ] **Redéployer la version web** (`yarn build && firebase deploy --only hosting`) : le build en ligne sur `pedro-reps.web.app` est ancien et n'a pas la page `/privacy-policy` — l'URL doit répondre AVANT la soumission
- [ ] Fusionner `dev` → `main` (release v1.0.0)
- [ ] Keystore : `bash scripts/setup-keystore.sh` (crée `android/reps-release.keystore` + `keystore.properties`, tous deux gitignorés — **sauvegarder le keystore et ses mots de passe hors du Mac**, sa perte = impossible de mettre l'app à jour)
- [ ] `versionCode = 1`, `versionName = "1.0"` — OK pour la première soumission (incrémenter `versionCode` à chaque envoi suivant)
- [ ] AAB buildé et signé : `bash scripts/build-android-release.sh` → `android/app/release/app-release.aab`
- [ ] Licence des illustrations : lire les [CGU Gym visual](https://gymvisual.com/content/3-terms-and-conditions-of-use) (les médias du dataset sont © Gym visual, redistribués avec permission sous condition d'attribution + 180×180 — les deux sont respectées dans l'app) ; en cas de doute, un mail à Gym visual pour confirmer l'usage embarqué

### Play Console
- [x] Compte développeur créé (25 €)
- [ ] Application créée dans la console (nom `Reps`, id `com.pierre.reps.app`, gratuite)
- [ ] **Play App Signing** activé (par défaut) → récupérer l'empreinte **SHA-1 de la clé de signature Google** dans *Intégrité de l'application* et l'ajouter dans Firebase → Paramètres du projet → Application Android (en plus du SHA-1 de la keystore d'upload). Sans ça, la connexion Google échoue sur l'app installée depuis le Play Store
- [ ] Data Safety renseigné (tableau ci-dessus, AD_ID inclus)
- [ ] Politique de confidentialité URL renseignée : `https://pedro-reps.web.app/privacy-policy`
- [ ] Contenu de l'appli : « Annonces » = Non (v1), « Accès à l'appli » = fournir un compte de test (email + mot de passe) car l'app exige une connexion, « Applis santé » = déclarer les données de forme physique (poids, taille, séances)
- [ ] Classification de contenu remplie (questionnaire → Tout public)
- [ ] Captures d'écran uploadées (min. 2 téléphone, idéalement 6-8, format 9:16 ou 9:20)
- [ ] Feature Graphic 1 024 × 500 uploadée
- [ ] Description courte et longue renseignées
- [ ] Pays de distribution sélectionnés
- [ ] **Test fermé obligatoire** (compte perso créé après nov. 2023) : au moins **12 testeurs inscrits pendant 14 jours consécutifs** sur une piste de test fermé, puis demande d'accès à la production depuis la console. À lancer dès que l'AAB est prêt — c'est le chemin critique du calendrier

### Avant la publication
- [ ] Installer l'AAB via la piste de test interne sur un appareil physique Android
- [ ] Vérifier la connexion Google sur le build signé (SHA-1 upload + SHA-1 Play App Signing dans Firebase)
- [ ] Vérifier le tutoriel au premier lancement, la bibliothèque (vignettes CDN + mode avion), les notifications locales, le mode sombre
- [ ] Vérifier que le crash reporting Sentry remonte bien depuis le build release (ProGuard : `proguard-rules.pro` conserve les numéros de ligne)
- [ ] Publicités : ne rien réactiver avant que le compte AdMob soit rétabli ET que Data Safety + « Annonces » soient mis à jour
