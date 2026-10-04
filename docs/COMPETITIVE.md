# REPS — Analyse concurrentielle

> Octobre 2026. Référence de la loop d'amélioration continue (`docs/LOOP.md`) :
> chaque itération compare ce qu'elle livre à ce que font les apps ci-dessous.

## Synthèse

Le marché du carnet d'entraînement est dominé par **Hevy** (4,9★ / ~200 k avis Play Store, 4,8 M installations)
et **Strong** (référence historique, meilleur Apple Watch). Les deux ont la même faiblesse : un **palier gratuit
bridé** (3-4 routines max, graphiques musculaires et mensurations payants) et une approche **100 % salle de sport**.

**Positionnement recommandé pour REPS** :
> *Le carnet d'entraînement gratuit, sans pub et en français, pour la muscu **et** le poids du corps —
> motivé par tes amis et une mascotte attachante.*

Ce que personne ne combine aujourd'hui : compteur de reps en direct pour le poids du corps + journal de salle,
défis quotidiens entre amis, interface native française, et tout gratuit (routines illimitées, graphiques
musculaires inclus).

## Le paysage

| App | Promesse | Prix | Forces | Faiblesses citées |
|---|---|---|---|---|
| **Hevy** | « Le tracker le plus simple au monde, sans pub et gratuit » | Gratuit (4 routines) · Pro ~50 $/an · 75 $ à vie | Saisie en 2 taps, valeurs précédentes affichées, PR en direct, partage en image, fil social, widgets, WearOS, Live Activity, Year in Review | Fonctions avancées payantes (heatmap musculaire, mensurations, CSV), petits soucis de synchro |
| **Strong** | Carnet privé, épuré, rapide | Gratuit (3 routines) · 30 $/an | Interface la plus propre, supersets/dropsets, calculateur de disques, meilleure montre Apple, graphiques avancés filtrables | Palier gratuit plus limité, bibliothèque plus petite, peu social |
| **Fitbod** | Coach IA : séances générées selon récupération et matériel | ~80 $/an, pas de vrai gratuit | Filtre matériel, récupération musculaire, surcharge auto | Abonnement obligatoire, incompatible avec un programme suivi |
| **Boostcamp** | 11 000+ programmes de coachs (Nippard, RP…) | Gratuit généreux · Pro | Progression automatique des charges, RPE/RIR par série, série précédente visible | Orienté programmes, moins pour le libre |
| **Liftosaur** | Progression scriptée (règles explicites) | Gratuit + payant | Transparence des règles de progression | Courbe d'apprentissage |
| **JEFIT** | Bibliothèque + communauté | 40 $/an | Dropsets/supersets/pyramides, photos de progression, mensurations | Interface datée, lente |
| **Thenx / Calisteniapp** | Calisthenics : arbres de compétences (muscle-up, planche…) | Abonnement | Progressions par skill, 700+ exercices, charge adaptée | Payant, peu de suivi libre |
| **Duolingo** *(réf. gamification)* | Habitude quotidienne | — | Mascotte Duo = mécanique de rétention (joie, encouragement, culpabilité), streaks, ligues | Ton culpabilisant parfois mal vécu |
| **Gentler Streak** *(réf. bienveillance)* | Fitness « humain » | — | Mascotte Yorhart qui reflète la forme du jour, « Activity Path » au lieu d'objectifs quotidiens rigides | Apple uniquement |

## Ce que les pratiquants veulent (Reddit / comparatifs)

- **Vitesse de saisie** avant tout : « pas cinq écrans pour logger une série » ; valeurs précédentes pré-remplies.
- **Minuteur de repos avec notification** (même écran verrouillé).
- **Calculateur de disques**, séries d'échauffement.
- **Graphiques par exercice** (1RM estimé, volume) et détection des records.
- **Export CSV** (les lifters sérieux analysent eux-mêmes).
- Rejet du **paywall** sur l'essentiel et des **pubs** ; préférence pour l'achat unique.
- Ce qui fait abandonner : saisie lente, perte de données, synchro capricieuse.

## REPS face au marché

### Déjà au niveau (ou mieux)
> Mis à jour en octobre 2026 après les itérations de la loop (journal : `docs/LOOP.md`).

- Gratuit, sans pub, **modèles illimités** (Hevy 4 / Strong 3 en gratuit), modèle depuis une séance, modèle modifiable
- **Mode renforcement** avec compteur en direct — inexistant chez Hevy/Strong
- Bibliothèque de **1 324 exercices illustrés FR/EN** (Hevy : 300+ en gratuit)
- Saisie : valeurs de la dernière fois, **suggestion de surcharge progressive**, types de séries (échauffement, dégressive, échec),
  **RPE**, notes par exercice, **supersets**, réordonner / remplacer un exercice, **exercices en durée** avec chrono
- Repos : minuteur auto avec **notification écran verrouillé**, durée par exercice, −15 s / +15 s, écran maintenu allumé
- Progrès : **records en direct** (charge et durée) avec célébration, **courbe par exercice** (1RM, charge, volume, durée),
  dernières séances détaillées, **répartition musculaire** (payante chez Hevy), récap mensuel / annuel partageable
- Après la séance : **écran de récap** avec comparaison bienveillante, **partage en image**
- Historique : modifier, supprimer, saisir une séance oubliée, filtrer par exercice ; **export CSV (format Strong)**
  et **import Strong / Hevy** (l'argument « je garde tout mon historique »)
- Calculateurs de **disques** et de **séries d'échauffement** ; mensurations et poids de corps (payant chez Hevy)
- Motivation : série quotidienne avec joker ou série hebdomadaire, objectif hebdo, questionnaire de départ, widget Android
- Social : amis, fil, **classement** jour/semaine/mois, **défis quotidiens**, badges, kudos
- Hors ligne, PWA + Android ; accessibilité AA vérifiée (contraste, 320 px, lecteurs d'écran)

### Écarts restants
**En attente de Pierre** (label `bloqué-pierre`) :
1. **Mascotte** et moments de célébration (Duolingo / Gentler Streak) — choix de la charte (#8 et suivantes)
2. **Fiche Play Store** + **site vitrine** (pages support, suppression de compte) — publication
3. **Wear OS**, **Health Connect** — consoles Play / Google Cloud
4. **Interface en anglais** et unités en livres (i18n) — calendrier de sortie
5. Kudos et copie des modèles d'un ami — déploiement des règles Firestore

**Faisables en autonomie** (backlog du projet #9) :
- Titre et note de séance (Hevy, Strong)
- Valeur de la séance précédente affichée à côté de chaque série (colonne « Précédent » de Hevy / Strong)
- Plus tard, à cadrer avec Pierre : programmes sur plusieurs semaines (Boostcamp), photos de progression (JEFIT)

## Enseignements mascotte

- **Duolingo** : la mascotte est une *mécanique*, pas un logo — un système d'expressions (joie, encouragement,
  inquiétude) qui communique sans texte, dans les notifications, les célébrations de streak et les nouveautés.
- **Gentler Streak** : le personnage *reflète l'état de l'utilisateur* (forme du jour) et se collectionne dans
  le récap — bienveillance plutôt que culpabilité.
- **Pour REPS** : une haltère cartoon, expressive par les yeux et les jambes, présente aux moments émotionnels
  (lancement, onboarding, fin de séance, record, badge, streak, états vides, erreurs) — **ton encourageant, jamais
  culpabilisant** (le guilt-trip de Duo est la critique n°1 qu'on lui fait).

## Enseignements store & site web

- Titre/description Hevy : trois piliers répétés partout — *logger, progresser, rester motivé (avec ses amis)* ;
  mots-clés « gym log », « workout tracker », « journal », « planner ».
- Captures d'écran légendées par bénéfice, pas par écran.
- Site vitrine type : hero + badge store, 3 piliers, captures, preuve sociale, FAQ, pages légales
  (confidentialité, **suppression de compte** — exigée par Google), support.

## Sources

- [Hevy — fonctionnalités](https://www.hevyapp.com/features/) · [Hevy sur Google Play (AppGoblin)](https://appgoblin.info/apps/com.hevy)
- [Hevy vs Strong 2026 — Sensai](https://www.sensai.fit/blog/hevy-vs-strong-2026) · [RepReturn — comparatif vitesse/analytics](https://repreturn.com/best-workout-tracking-app/) · [Setgraph — Hevy vs Strong](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)
- [Boostcamp — test BarBend](https://barbend.com/boostcamp-review/) · [Garage Gym Reviews — meilleures apps muscu](https://www.garagegymreviews.com/best-weightlifting-app) · [Apps de surcharge progressive 2026 — JEFIT](https://www.jefit.com/blog/best-progressive-overload-apps-for-beginners-in-2026-top-5-reviewed-and-compared)
- [Ce que Reddit recommande — Setgraph](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit) · [Cora Health — Reddit 2026](https://www.corahealth.app/blog/best-fitness-app-reddit)
- [Duolingo — rappels et rétention (Digia)](https://www.digia.tech/post/duolingo-habit-forming-reminders-retention-architecture/) · [Duolingo — gamification comme langage](https://blakecrosley.com/guides/design/duolingo)
- [Gentler Streak — Sketch](https://sketch.com/blog/gentler-streak) · [Gentler Streak — 9to5Mac](https://9to5mac.com/2023/12/28/2023-fitness-recap-gentler-streak/)
- [Meilleures apps calisthenics — FitBudd](https://www.fitbudd.com/post/best-calisthenics-app)
