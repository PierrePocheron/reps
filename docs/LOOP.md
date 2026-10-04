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
4. **Implémenter** en TDD (test d'abord, puis le code) le plus petit diff qui fonctionne, selon les règles du projet : `logger` (jamais
   `console`), tutoiement dans l'interface, tokens clair/sombre, cibles ≥ 44 px, `noUncheckedIndexedAccess`.
   Code, noms et commentaires en anglais (le code existant reste tel quel) ; docs en français.
5. **Vérifier** : `yarn type-check`, `yarn lint` (0 erreur), `yarn vitest run`, `yarn test:rules` si les
   règles Firestore changent ; contrôle visuel sur `yarn dev:demo` (émulateurs + données de démo, compte dans `scripts/seed-emulator.mjs`)
   et `yarn e2e` (parcours clés de bout en bout) dès qu'un parcours est touché ; `yarn a11y` (contraste) après un changement de couleurs.
6. **Documenter** : mettre à jour le README et les docs touchés (fonctionnalité visible → README ; commande ou
   procédure → TOOLS / DEPLOY / RELEASE ; tests → TESTS ; fiche store → PLAYSTORE).
7. **Livrer** : commit Conventional Commits **en anglais** (numéroté `[i/N]` si multi-commits, sans `Co-Authored-By`, **aucune donnée
   personnelle** — repo public), push `dev`, commentaire de bilan sur l'issue, fermeture si terminée.
8. **Journaliser** : une ligne ci-dessous.

## Interdit sans Pierre

Merger vers `main`/`prod`, publier une release, déployer (web, règles Firestore), toucher aux
consoles Firebase / Play / AdMob, créer des comptes, envoyer quoi que ce soit à l'extérieur,
ajouter une dépendance.
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
| 2026-10-03 | passe UI/UX Statistiques | Habitudes calculées sur les vraies séances (renfo + muscu, créneau favori) ; libellés et cibles corrigés | `8d3902d` |
| 2026-10-03 | #6 | Fiche Play Store FR (titre, descriptions, nouveautés) + 8 captures légendées générées depuis la démo (`yarn store:screenshots`) ; fix carte défi écrasée | `cce9048` |
| 2026-10-03 | #41 | Repos lancé automatiquement après chaque série (interrupteur dans le minuteur) ; invitation unique aux alarmes exactes sur Android 14+ | `12ad435` |
| 2026-10-03 | passe UI/UX Modèles, Social, Réglages, Historique | « Modèles » au lieu de « templates », onglets 44 px partout, durées « 1h 7min », coquilles | `ddf0780` |
| 2026-10-03 | #15 | « Refaire cette séance » depuis l'historique (muscu : charges réalisées pré-remplies ; renfo : mêmes exercices) | `c51a062` |
| 2026-10-03 | #23 | Pages à la demande (React.lazy) : bundle initial −15 % (gzip 476 → 417 Ko) ; suite (Sentry Replay, framer-motion) dans une issue à arbitrer | `21e3858` |
| 2026-10-03 | passe UI/UX mode clair + repères | Un seul <main> par écran (imbriqué avant), poids « 57,5 kg » partout ; mode clair vérifié sur 4 écrans | `430d89f` |
| 2026-10-03 | #14 + #43 | Notes par exercice (rappel de la dernière, visibles dans l'historique) ; bug P0 trouvé en E2E et corrigé : gel de l'appli en fin de séance muscu (navigate pendant le rendu) | `d87e3dd` |
| 2026-10-03 | test E2E | `yarn e2e` : test de fumée Playwright des parcours clés ; bug trouvé et corrigé : retour forcé à l'accueil juste après la connexion | `520ca37` |
| 2026-10-03 | passe UI/UX premier lancement | Compte neuf dans la démo ; tutoriel sans toast parasite, « Série » partout, état vide des Statistiques avec appel à l'action | `d219a6f` |
| 2026-10-03 | #10 | Muscles travaillés : séries par groupe musculaire sur 7/30 jours (principal 1, secondaire ½, renfo converti) | `f8408db` |
| 2026-10-03 | #11 | Calculateur de disques (exercices à la barre, barre et disques réglables, arrondi au réalisable) | `d08d401` |
| 2026-10-03 | passe UI/UX séance muscu | Bug P0 trouvé : barre minuteur + Terminer pas fixée (transform résiduel de PageTransition) → fondu seul + assertion E2E | `e67cfec` |
| 2026-10-03 | #16 | Export CSV (format Strong, importable Hevy) ; exports JSON/CSV via feuille de partage native (cassés sur Android) ; fichier vide si export pendant le chargement | `dca2ba8` |
| 2026-10-03 | test natif Android | Émulateur API 33 piloté par Playwright : partage CSV OK ; bug trouvé et corrigé : la notification de fin de repos s'effaçait 140 ms après son affichage ; icône de notification ajoutée | `722bb1b` |
| 2026-10-03 | #9 | Partager sa séance en image (carte 1080×1350, historique + toast de fin de séance, feuille de partage native) | `6224c68` |
| 2026-10-03 | passe UI/UX renfo, profil, amis, défis | Annuler le dernier ajout de reps en séance renfo (manque relevé) ; autres écrans conformes à 360 px | `117d0eb` |
| 2026-10-03 | #13 | RPE par série optionnel (sélecteur à la place de la coche, historique, CSV) + réglage « Repos automatique » | `19358c2` |
| 2026-10-03 | #21 | Joker de repos hebdomadaire : un jour sans séance isolé ne casse plus la série (en-tête, stats, 10 tests) ; série hebdo en suivi | `6b98cc7` |
| 2026-10-03 | passe UI/UX feuilles, modèles, sélecteur | Bug trouvé : opacité résiduelle de PageTransition → feuilles sous la navigation (CTA cachés) ; fondu CSS + z-[70] + assertion E2E ; libellés FR, icônes 44 px | `ac81918` |
| 2026-10-03 | #12 | Types de séries (É / D / !) : échauffement exclu du volume, des records et des stats ; historique et CSV | `9763d48` |
| 2026-10-03 | #22 | Questionnaire de départ (4 questions passables) : objectif hebdo + modèle conseillé mis en avant ; refaisable dans Réglages | `59be853` |
| 2026-10-03 | passe UI/UX + légal | Politique de confidentialité alignée (RPE, notes, notifications locales sans token, préférences locales, Replay déclaré) ; astuce types de séries dans le tutoriel ; succès / classement / défi validé vérifiés | `228a49b` |
| 2026-10-03 | #26 | Suggestion de surcharge progressive (+2,5 / +1,25 kg si tout réussi), appliquée en un tap, désactivable | `5be44db` |
| 2026-10-03 | #32 | Séries d'échauffement en un tap (40/60/80 %, arrondies aux disques, marquées É) | `0572023` |
| 2026-10-03 | passe UI/UX contraste | Audit WCAG AA automatique (yarn a11y) : ~45 textes corrigés en clair et en sombre (jeton muted, destructive, accents, color-mix en sombre) | `4a40c35` |
| 2026-10-03 | #29 | Récap mensuel / annuel dans Statistiques, partageable en image ; noms de fichiers en date locale | `679ee9f` |
| 2026-10-03 | #28 | Poids et mensurations datés sur le profil (courbe, évolution, poids du profil synchronisé), stockés en privé sans changer les règles | `2983821` |
| 2026-10-04 | passe UI/UX store | Captures Play régénérées (8, dont le récap mensuel) ; récap sans tuile « 0 record » | `0cdac8a` |
| 2026-10-04 | #45 | Série hebdomadaire en option (semaines à l'objectif) : réglage, en-tête, stats, recalculs | `ccf0f32` |
| 2026-10-04 | #30 | Kudos 👏 sur les séances des amis + bandeau « X a encouragé ta séance » ; règles + 7 tests (déploiement par Pierre) | `ce84d11` |
| 2026-10-04 | passe UI/UX profil / réglages | Profil raccourci (aperçu de 4 badges, « Voir tout (N) »), puce Poids alignée sur le profil ; réglages vérifiés en clair | `28e2c9e` |
| 2026-10-04 | #31 | Copier les modèles d'un ami (menu Amis), règles + 3 tests (déploiement par Pierre, avec #30) | `15d0745` |
| 2026-10-04 | #47 | Modifier un modèle perso (formulaire prérempli, mise à jour en place) | `61abccd` |
| 2026-10-04 | passe UI/UX séance libre | Ajout d'exercice : toutes les séries de la dernière fois recopiées (au lieu d'une seule) ; parcours libre vérifié | `25c4f1e` |
| 2026-10-04 | #27 | Supersets : liaison entre exercices, repos après le dernier du groupe, historique et « Refaire » | `0c974f1` |
| 2026-10-04 | #42 (partie autonome) | framer-motion hors du bundle initial (AnimatePresence retiré, tutoriel à la demande) : gzip 417 → 392 Ko | `6167f2f` |
| 2026-10-04 | passe UI/UX nouvel utilisateur | Parcours compte neuf → 1re séance → stats : fluide, aucune erreur ; #34 (i18n) mis en attente de décision | — |
| 2026-10-04 | tests E2E | yarn e2e : 7 parcours (+ échauffement, superset et repos, annulation, mensurations, récap) | `a02c532` |
| 2026-10-04 | #48 | Enregistrer une séance de l'historique comme modèle (séries réalisées, sans échauffement) | `2237c9d` |
| 2026-10-04 | passe UI/UX historique 360 px | Cartes coupées à droite (Refaire/Partager trop larges, nowrap) → libellé court + min-w-0 ; « 1 série » ; dette lint repérée → #50 | `20084c0` |
| 2026-10-04 | #49 | Durée de repos retenue par exercice (changée pendant son repos), défaut global sinon | `988a9a8` |
| 2026-10-04 | #50 | yarn lint à 0 (any toléré dans les tests, deps de hooks exactes, code mort) + lint dans la CI | `d28a10b` |
| 2026-10-04 | passe UI/UX petits écrans | Scan 320→412 px : Réglages débordaient sur presque tous les téléphones (mode, objectif hebdo), onglets/records/stats/classement/couleurs à 320 px → corrigés + étape e2e « rien ne déborde à 320 px » (échoue sans le fix) | `1bdd4dc` |
| 2026-10-04 | #36 | Widget Android (série + séances de la semaine), tap → accueil, mis à jour au lancement/fin de séance, se remet à 0 seul ; vérifié sur émulateur | `4d31171` |
| 2026-10-04 | #35 #37 → bloqué-pierre ; backlog | Health Connect et Wear OS dépendent de la Play Console (+ images d'émulateur) → commentés ; 4 nouvelles issues issues de la comparaison (#51-#54) | — |
| 2026-10-04 | #51 | Minuteur de repos −15 s / +15 s (fin décalée, notification replanifiée) | `a910a12` |
| 2026-10-04 | passe UI/UX écrans de séance | Repos ouvert : la barre flottante cachait « Ajouter un exercice » ; lignes de série hors carte à 320 px ; noms d'exercice tronqués → corrigés + e2e étendu | `1ad9f99` |
| 2026-10-04 | #52 (en vérif) | Écran allumé pendant la séance + réglage ; Android en FLAG_KEEP_SCREEN_ON (la Wake Lock de la WebView ne relâche pas) ; vérif Android à refaire (émulateur figé) | `d0da348` |
| 2026-10-04 | #52 → bloqué-pierre ; #53 | Émulateur saturé (ANR système en série) : test « écran allumé » à faire sur téléphone ; réordonner les exercices (« Échanger », supersets cohérents) | `9009229` |
| 2026-10-04 | passe UI/UX contraste | yarn a11y se bloquait (séries absentes dans la séance de démo) → robuste + minuteur audité ; « S1 » validé à 2,09:1 en clair → AA | `1b7facc` |
| 2026-10-04 | #54 (1/2) | Écran de fin de séance muscu : récap, comparaison de volume encourageante, Partager / Terminer | `c06f308` |
| 2026-10-04 | #54 (2/2) | Écran de fin de séance renfo (reps, kcal, comparaison avec la séance précédente) → issue fermée | `f09a10e` |
| 2026-10-04 | passe UI/UX accessibilité + textes | Scan sémantique (noms accessibles, alt, libellés, h1) : RAS sur 10 pages + séance + récap ; accords « 1 séries / 1 jours » corrigés via plural() | `d331809` |
| 2026-10-04 | backlog + #56 | Comparaison : 4 issues (#55 durée, #56 supprimer, #57 modifier, #58 séance oubliée) ; supprimer une séance (confirmation, retrait immédiat, stats recalculées) | `96336a6` |
| 2026-10-04 | #57 (1/2) | Modifier une séance muscu passée (reps, charge, type, séries ±, records recalculés) + menu ⋯ sur les cartes | `a550470` |
| 2026-10-04 | passe UI/UX textes (statique) | Machine saturée (charge 179, VM + Chrome) → pas d'e2e ; tutoiement rétabli (2 toasts de notifications, accroche de l'accueil déconnecté) ; console.error de l'ErrorBoundary gardé (dev seulement, évite un double envoi Sentry) | `9297308` |
| 2026-10-04 | #57 (2/2) | Modifier une séance renfo (reps, exercices, calories et totaux recalculés) → issue fermée ; e2e complet vert (10 parcours) | `db26828` |
| 2026-10-04 | #58 (1/2) | Séance muscu oubliée : date/heure/durée saisies, enregistrée à sa date (série et stats à jour) ; e2e 11 parcours verts | `fa8a443` |
| 2026-10-04 | passe UI/UX fenêtres | Menu ⋯, Modifier (muscu/renfo), Supprimer, Séance oubliée audités à 320 px clair/sombre (contraste AA OK) ; boutons d'édition coupés en bas → pied collant ; défilement latéral de 5 px supprimé | `bbb5c71` |
| 2026-10-04 | #58 (2/2) | Séance renfo oubliée (date/durée saisies) → issue fermée ; 332 tests, 11 parcours e2e verts | `689f9ba` |
| 2026-10-04 | #55 | Exercices en durée (reps ⇄ s par exercice, hors volume/1RM, historique, CSV, partage) ; suite chrono + record de durée en issue P3 | `74ff122` |
| 2026-10-04 | passe UI/UX exercices en durée | Records « 10 kg × 75 reps » → « 75 s » (unité de la séance la plus récente), courbe « Meilleure durée », plus d'échauffement proposé pour une durée | `e476ccc` |
| 2026-10-04 | #59 | Chrono des exercices en durée (arrêt = série remplie et validée) + record de meilleure durée (direct et modification) | `079044a` |
| 2026-10-04 | sécu + backlog + #60 | Clé API Firebase Android signalée par GitHub → google-services.json retiré du dépôt et ignoré (`90f42e2`, clé à restreindre/remplacer côté console) ; 4 issues (#60-#63) ; dernières séances dans la fiche exercice | `be438b3` |
| 2026-10-04 | passe UI/UX fiche exercice + contraste | « Dernières séances » à 320 px clair/sombre : rien ne déborde ; yarn a11y : AA respecté avec menu ⋯, unité reps ⇄ s, chrono ; RAS | — |
| 2026-10-04 | #61 | Import CSV Strong / Hevy / export REPS : aperçu, exercices reconnus FR/EN, doublons écartés, stats recalculées ; 12 parcours e2e verts | `972a15e` |
| 2026-10-04 | #62 | Remplacer un exercice en séance (depuis sa fiche ; séries, superset et place conservés) | `2d37c06` |
| 2026-10-04 | passe UI/UX nouvel arrivant | Import Strong/Hevy proposé depuis l'historique muscu vide (ancre vers le bouton) ; section Réglages « À propos » → « Tes données » | `079aa73` |
| 2026-10-04 | #63 (+ fix #61) | Filtrer l'historique muscu par exercice (liste native, triée par fréquence) ; import : anti-doublon immédiat après import ; 13 parcours e2e verts | `5b3cd38` |
| 2026-10-04 | backlog | COMPETITIVE.md remis à jour (tout ce qui est livré, écarts en attente de Pierre, restants) ; 2 issues P3 (titre/note de séance, valeur précédente) | `6976062` |
| 2026-10-04 | passe UI/UX visuels store | Démo réinitialisée (données propres) ; 8 captures Play Store régénérées sur l'interface actuelle | `78af5c1` |
| 2026-10-04 | #64 | Titre (repris du modèle) et note de séance : historique, partage, export / import CSV | `50906fe` |
| 2026-10-04 | #65 | Rappel « Précédent : 10 × 90 kg » sous une série modifiée (colonne Précédent de Hevy/Strong, sans colonne de plus) | `fc952be` |
| 2026-10-04 | passe UI/UX titre de séance | Séance ouverte à mi-page depuis une carte basse de l'historique (scrollY 1318) → remontée en haut à chaque navigation (sauf retour) + e2e ; champs titre/note OK en clair/sombre à 320 px | `8dcdc0d` |
| 2026-10-04 | demande Pierre : nav | Barre de navigation flottante en pilule façon Instagram, réduite au défilement, redéployée en remontant / au toucher ; pastilles accessibles ; e2e + AA verts | `1b1a5e2` |
| 2026-10-04 | mesure bundle | Initial 1 361 Ko (382 Ko gzip, −8 % vs #42 malgré ~30 fonctionnalités) ; framer-motion déjà hors démarrage ; reste Sentry Replay (décision Pierre, #42) | — |
| 2026-10-04 | demande Pierre : documentation | README réécrit, docs/DEPLOY.md (déploiements + prérequis Play Store / App Store), ENV, RELEASE, TESTS, TOOLS, PLAYSTORE à jour | `757236b` |
| 2026-10-04 | passe UI/UX barre flottante | 10 pages : rien caché sous la pilule ; **régression de la refonte** : sélecteur du bouton central inerte (pointer-events hérité) → portail + z-[70] + e2e | `5355323` |
| 2026-10-04 | e2e nouvel utilisateur | Parcours « nouvelle séance depuis le bouton central » (muscu libre + renfo de base, ménage ensuite) — le chemin qui avait cassé sans être vu ; 14 parcours verts | `02f8f7e` |
| 2026-10-04 | fiabilité hors ligne | Perte de données (1er motif d'abandon) : cache persistant Firestore jamais activé (ordre getFirestore/initializeFirestore) + « Terminer » bloqué sans réseau → file locale, retour à l'accueil en ~5 s, séance envoyée à la reconnexion (vérifié sur un 2e navigateur) ; e2e 15 parcours | `9d2b6f0` |
| 2026-10-04 | confidentialité appareil partagé | Séance muscu en cours conservée à la déconnexion (le compte suivant pouvait l'enregistrer chez lui) → annulée ; suppression du compte : cache Firestore local vidé (vérifié : 0 document restant) | `94b2322` |
| 2026-10-04 | passe UI/UX pages peu visitées | Connexion, profil, réglages, modèles, dialogues à 320 px clair/sombre : dialogue de suppression du compte débordait à droite (bouton nowrap → grille du dialogue), nom du profil rogné en « ca… » → icône + marges réduites sous 360 px ; e2e étendu | `dc69777` |
| 2026-10-04 | fiabilité hors ligne (suite) | Modèles, mensurations, modification / suppression d'une séance, profil et réglages : plus de bouton qui tourne sans fin sans réseau (TDD, 10 tests) ; e2e : suppression hors ligne qui tient au retour du réseau | `71811c6` |
| 2026-10-04 | bandeau hors ligne | Bandeau translucide sur 2 lignes (57 px) qui chevauchait l'en-tête, en-têtes collants (retour / annuler) cachés dessous → opaque, une ligne, hauteur partagée (--offline-h) ; e2e écrit d'abord. Constat : ouvrir une séance hors ligne plante en dev (module chargé à la demande sans serveur) — sans objet en prod (service worker / fichiers locaux) | `a10dc18` |
| 2026-10-04 | passe UI/UX réglages, badges, social, défis | Interrupteurs à la place des boutons « Activé / Désactivé » (3 annoncés « Activé » sans nom), tailles de texte unifiées ; « Réglages » et « Badges » partout. Tests : date d'import CSV unique par passage (collision HH:MM), échecs plus lisibles ; émulateur saturé (4 Go) → démo relancée. Instabilité renfo vue sous charge 80, non reproduite (3 passages verts) | `81ca5bc` `1110cd6` |
| 2026-10-04 | web après déploiement | Onglet ouvert sur l'ancienne version → page d'erreur à l'ouverture d'une page chargée à la demande (fichiers disparus) : rechargement unique sur vite:preloadError (garde anti-boucle, rien hors ligne) ; TDD + vérifié sur un build de prod | `ef620ff` |
| 2026-10-04 | mesure démarrage (#42) | Build prod : 380 Ko gzip au démarrage, dont Sentry 81 Ko et Replay 39 Ko (≈ 10 %) ; framer-motion bien à la demande ; FCM + connexion native (≈ 6 %) laissés tels quels (gain/risque faible) ; chiffres et recommandation sur #42 | — |
| 2026-10-04 | passe UI/UX écrans de séance | Accueil, sélecteur, ajout d'exercice, muscu et renfo à 320 px clair/sombre : titres « Séance » / « En séance » → « Renforcement » / « Musculation » (comme le sélecteur), éclair orange du renfo au lieu de l'haltère muscu ; titres mesurés sans chevauchement ; e2e 15/15 | `c4ec5eb` |
| 2026-10-04 | récap renfo / e2e instable | Cause de l'échec intermittent : reps de la séance précédente lues avant la fin de leur chargement → récap sans comparaison si on termine vite (réseau lent, séance oubliée) ; attente plafonnée à 3 s à la fin ; reproduit avec 1,5 s de latence (avant : absent, après : présent) et intégré au parcours e2e | `0f96f76` |
| 2026-10-04 | récap muscu (même course) | Historique de 200 séances > 1 s même en local : fin rapide → récap sans comparaison ; attente plafonnée à 3 s ; reproduit à 0 et 1,5 s de latence, vérifié dans le parcours e2e « bouton central ». Records : protégés (pas de faux positif avant chargement) | `f2d77af` |
| 2026-10-04 | passe UI/UX dialogues et feuilles | Modifier une séance, fiche d'exercice, séance oubliée, nouveau modèle, nouvelle mesure à 320 px : aucun débordement. Incohérence : carte d'historique affichant les séries prévues (« 4 séries ») d'un exercice non fait → « aucune série validée » (e2e d'abord). Vérification « navigation sur la feuille » rendue robuste (instantané pendant l'animation) | `9fe9f13` |
| 2026-10-04 | issue #66 + déconnexion | Terminer avec des séries non cochées : décision produit (Hevy demande, Strong valide) → issue #66 pour Pierre, pas implémenté. Écoute du profil jamais désabonnée (3 appels) : empilée à chaque chargement, refus journalisé à la déconnexion → une seule, arrêtée au reset (TDD). Nouveau parcours e2e déconnexion / reconnexion (16 parcours, 2 passages verts) | `d93d8b9` `9fd218e` |
