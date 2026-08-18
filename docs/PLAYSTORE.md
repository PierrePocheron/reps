# Reps — Fiche Play Store

> Textes et informations à renseigner dans la Google Play Console.

---

## Informations de base

| Champ | Valeur |
|-------|--------|
| Nom de l'application | `Reps` |
| ID de l'application | `com.pierre.reps.app` |
| Langue principale | Français (fr-FR) |
| Catégorie | Santé & Fitness |
| Sous-catégorie | Fitness |
| Classification de contenu | Tout public (PEGI 3) |
| URL politique de confidentialité | `https://pedro-reps.web.app/privacy-policy` (Firebase Hosting — redéployer le web avant de la renseigner) |

---

## Description courte (≤ 80 caractères)

```
Suivez vos séances, défiez vos amis et progressez chaque jour.
```

*(63 caractères)*

---

## Description longue (≤ 4 000 caractères)

```
💪 Reps — Votre compagnon d'entraînement ultime

Que vous fassiez du renforcement musculaire au poids du corps ou de la musculation avec haltères, Reps s'adapte à votre style d'entraînement et vous aide à progresser avec méthode.

━━━ SUIVI D'ENTRAÎNEMENT ━━━

• Renforcement musculaire : créez vos séances personnalisées, ajoutez vos exercices et comptez vos répétitions en temps réel.
• Musculation : planifiez vos programmes avec poids, séries et temps de repos, puis cochez vos séries au fil de la séance.
• Bibliothèque de 1 324 exercices illustrés : animation, muscles ciblés et instructions étape par étape, en français ou en anglais (suit la langue de votre téléphone).
• Historique complet : retrouvez toutes vos séances passées avec le détail des exercices, le volume soulevé et la durée.

━━━ STATISTIQUES & PROGRESSION ━━━

• Tableau de bord avec calories brûlées, nombre de répétitions et séances hebdomadaires.
• Graphiques de progression du volume d'entraînement semaine par semaine.
• Heatmap d'activité pour visualiser votre régularité sur l'année.
• Analyse des habitudes (matin, après-midi, soir) et de votre streak de régularité.

━━━ GAMIFICATION ━━━

• Système de niveaux algorithmique — progressez et débloquez de nouveaux rangs.
• 15+ badges à débloquer selon vos performances et votre régularité.
• Défis hebdomadaires pour repousser vos limites.

━━━ SOCIAL ━━━

• Ajoutez vos amis et comparez vos performances sur le classement.
• Fil d'activité pour rester motivé par la progression de votre entourage.

━━━ EXPÉRIENCE NATIVE ━━━

• Tutoriel de prise en main au premier lancement.
• Rappels d'entraînement personnalisables pour ne jamais manquer une séance.
• Retours haptiques et effets sonores pour une expérience immersive.
• Mode sombre, clair ou automatique selon votre préférence.
• Fonctionne en mode hors-ligne — vos données se synchronisent à la reconnexion.

━━━ CONFIDENTIALITÉ ━━━

Vos données d'entraînement vous appartiennent. Reps utilise Firebase pour la synchronisation sécurisée et ne revend aucune donnée à des tiers.

Débutant ou athlète confirmé, Reps est fait pour vous. Commencez dès aujourd'hui — chaque répétition compte.
```

*(~1 950 caractères)*

---

## Nouveautés (version 1.0)

```
Première version de Reps !

• Suivi renforcement musculaire et musculation
• Bibliothèque de 1 324 exercices illustrés (FR/EN)
• Templates de séances personnalisables
• Statistiques, heatmap et graphiques de progression
• Système de badges et de niveaux
• Classement et défis avec vos amis
• Rappels d'entraînement
• Mode sombre et thèmes de couleurs
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

## Captures d'écran requises

Format recommandé : **1080 × 1920 px** (9:16) ou **1080 × 2400 px** (9:20)

| # | Contenu suggéré | Page |
|---|----------------|------|
| 1 | Accueil — bandeau de bienvenue + dernière séance | `/` |
| 2 | Session en cours — exercices + reps en temps réel | `/session` |
| 3 | Session musculation — exécution avec poids/séries | `/gym` |
| 4 | Statistiques — graphiques hebdo + heatmap | `/statistics` |
| 5 | Profil — badges débloqués + classement | `/profil` |
| 6 | Templates — liste des programmes | `/templates` |
| 7 | Amis — classement social | `/leaderboard` |

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
