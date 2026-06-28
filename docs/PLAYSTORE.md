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
| URL politique de confidentialité | `https://reps-app.vercel.app/privacy-policy` |

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
• Musculation : planifiez vos programmes avec poids, séries et temps de repos. Choisissez parmi une bibliothèque complète d'exercices ou utilisez vos templates personnalisés.
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

• Rappels d'entraînement personnalisables pour ne jamais manquer une séance.
• Retours haptiques et effets sonores pour une expérience immersive.
• Mode sombre, clair ou automatique selon votre préférence.
• Fonctionne en mode hors-ligne — vos données se synchronisent à la reconnexion.

━━━ CONFIDENTIALITÉ ━━━

Vos données d'entraînement vous appartiennent. Reps utilise Firebase pour la synchronisation sécurisée et ne revend aucune donnée à des tiers.

Débutant ou athlète confirmé, Reps est fait pour vous. Commencez dès aujourd'hui — chaque répétition compte.
```

*(~1 750 caractères)*

---

## Nouveautés (version 1.0)

```
Première version de Reps !

• Suivi renforcement musculaire et musculation
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
- [ ] `versionCode` incrémenté dans `android/app/build.gradle`
- [ ] `versionName` mis à jour (ex. `"1.0"`)
- [ ] Keystore configurée (`android/keystore.properties` + `android/reps-release.keystore`)
- [ ] Vrai AdMob App ID dans `AndroidManifest.xml` (remplacer l'ID de test)
- [ ] Vrais AdMob Banner IDs dans `src/config/ads.ts`
- [ ] `ENABLED_MOBILE: true` dans `src/config/ads.ts` (si publicités activées)
- [ ] `VITE_RECAPTCHA_SITE_KEY` réelle configurée dans `.env`
- [ ] AAB buildé et signé : `bash scripts/build-android-release.sh`

### Play Console
- [ ] Compte développeur créé (25 € one-time)
- [ ] Application créée dans la console
- [ ] Data Safety renseigné (tableau ci-dessus)
- [ ] Politique de confidentialité URL renseignée : `https://reps-app.vercel.app/privacy-policy`
- [ ] Captures d'écran uploadées (min. 2 téléphone)
- [ ] Feature Graphic uploadée
- [ ] Description courte et longue renseignées
- [ ] Classification de contenu remplie (questionnaire Play Console)
- [ ] Pays de distribution sélectionnés

### Avant la publication
- [ ] Tester l'AAB sur un appareil physique Android
- [ ] Vérifier que la connexion Google fonctionne sur l'APK signé (SHA-1 à ajouter dans Firebase Console)
- [ ] Vérifier que les publicités AdMob s'affichent (si activées)
