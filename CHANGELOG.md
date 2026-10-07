# Changelog

Changements visibles de REPS, du plus récent au plus ancien. La section « Non publié » suit `dev` ;
à chaque release elle devient `X.Y.Z — date` (voir [docs/RELEASE.md](docs/RELEASE.md)).

## Non publié

Tout ce qui est arrivé sur `dev` depuis la v1.10.0 (19/02/2026).

### Séance muscu
- Planification et exécution d'une séance, séance libre, aperçu d'un modèle avant de lancer
- Valeurs de la dernière fois pré-remplies, rappel « Précédent » quand on s'en écarte, suggestion de surcharge progressive
- Types de séries (échauffement, dégressive, échec), séries d'échauffement en un tap, RPE optionnel
- Supersets, réordonner et remplacer un exercice, exercices en durée avec chrono
- Minuteur de repos automatique : notification écran verrouillé, durée retenue par exercice, −15 s / +15 s
- Records détectés et célébrés en direct, calculateur de disques, écran maintenu allumé
- Titre et note de séance, notes par exercice (la dernière est rappelée)
- Séance oubliée enregistrée à sa vraie date
- Écran de fin de séance : récap et comparaison avec la séance précédente, partage en image

### Séance renfo
- Bibliothèque d'exercices au poids du corps, annuler le dernier ajout de reps
- Écran de fin de séance (reps, kcal, comparaison), séance oubliée à une date passée

### Historique et données
- Page historique (muscu / renfo / records), filtre par exercice, séances plus anciennes chargées à la demande
- Refaire, modifier, supprimer une séance ; l'enregistrer comme modèle
- Export CSV (format Strong) et JSON complet (mensurations, modèles, notes, RPE, types de séries), import Strong (ancien et nouveau format) / Hevy sans doublon, charges en livres converties en kg, exercices reconnus (grands mouvements Strong / Hevy reliés aux exercices de base de REPS, variantes distinctes gardées à part, les autres à la bibliothèque), aperçu qui signale les livres converties
- Hors ligne : séances, modèles, mensurations et modifications enregistrés sans réseau, envoyés au retour de la connexion (l'import CSV demande une connexion pour écarter les doublons, voir #84)

### Progrès et statistiques
- Courbe de progression par exercice (1RM estimé, charge, volume, durée) et dernières séances détaillées
- Records personnels, muscles travaillés sur 7 / 30 jours, heatmap d'activité, habitudes d'entraînement
- Récap du mois et de l'année, partageable ; mensurations et poids de corps

### Motivation et social
- Questionnaire de départ, tutoriel de première connexion
- Série quotidienne avec joker ou série hebdomadaire, objectif hebdo
- Kudos sur l'activité des amis, copie des modèles d'un ami *(règles Firestore à déployer)*
- Modèles perso illimités et modifiables, widget Android (série et séances de la semaine)

### Interface et accessibilité
- Barre de navigation flottante en pilule, réduite au défilement
- Bibliothèque de 1 324 exercices illustrés en français et en anglais
- Contraste AA en clair et en sombre (texte d'accent lisible pour tous les thèmes), écrans dès 320 px, appli Android en portrait comme la PWA (en paysage, la barre de séance couvrait l'écran), plus grande police d'Android sans bouton coupé (valider une série, onglets, partager, boutons des dialogues), « Supprimer les animations » respecté (confettis compris), lecteurs d'écran (dialogues nommés, cibles de 44 px)
- Tutoiement partout, accords au singulier, « Réglages », « Badges », « Modèles » ; interrupteurs dans les réglages

### Fiabilité et confidentialité
- Fin de séance sans réseau qui ne bloque plus et ne perd rien (cache persistant Firestore enfin actif)
- Reconnexion fiable juste après une déconnexion (le formulaire n'est plus vidé) ; rien ne passe au compte suivant sur un appareil partagé ; suppression de compte complète (données, kudos, listes d'amis, compte, copie locale)
- Défis : terminés seulement quand toutes les étapes sont faites (rattrapage possible jusqu'au bout), jour juste au
  changement d'heure et après minuit
- Récap toujours comparé, même en terminant tout de suite ; onglet ouvert pendant un déploiement rechargé tout seul
- Démarrage plus léger : pages chargées à la demande, framer-motion hors du démarrage
- Série gardée le lendemain d'un jour de repos couvert par le joker (le widget et l'en-tête affichaient 0)
- « Refaire » garde les échauffements comme échauffements (volume, records et suggestions justes)
- Mensurations : plus d'historique écrasé par une mesure ajoutée avant la fin du chargement
- Rappel d'entraînement quotidien qui revient chaque jour (il ne sonnait qu'une fois sur Android et iOS)
- Accepter une demande d'ami fonctionne *(règles Firestore à déployer)*
- Fil d'activité : tous les amis y apparaissent (seuls les 10 premiers étaient lus)
- Récap du mois / de l'année : les exercices en durée ne gonflent plus le volume ni les répétitions
- Réglages ne plante plus dans Safari sur iPhone (onglet classique) ni dans les navigateurs intégrés
- Les badges débloqués apparaissent enfin dans le fil des amis (l'événement était effacé aussitôt)
- Suggestion de charge : les séries dégressives n'y comptent plus, « Appliquer » ne les alourdit plus
- Statistiques et badges à jour juste après une séance muscu, un jour de défi ou un changement d'objectif
- Modèles enregistrés depuis une séance : vrais noms et images des exercices de la bibliothèque ou importés
- Modifier une séance garde les séries ratées (la suggestion de charge ne croit plus à tort que tout est réussi)
- Rappel quotidien remis en place au lancement s'il avait été perdu ; effacer l'heure ne le programme plus à minuit
- Badges gagnés qui restent débloqués quand la série casse ; « Max estimé sur 1 rep » juste dans les Records
- Trophées en direct recalculés quand on corrige une série validée ; repos de superset juste avec des échauffements
- Classement : plus de chiffres d'un autre onglet ni de rang sauté ; calculateur de disques qui ne gèle plus l'appli
- Index Firestore du classement par période et des badges déclarés dans le dépôt *(index à déployer)*
- Image de partage : records de durée comptés ; modèle changé de type : plus d'ancienne liste d'exercices
- Âge juste aux Antilles, en Guyane et au Québec ; date de naissance impossible (31 février) refusée
- Badges lève-tôt / midi / nuit : les séances muscu comptent ; un kudos retiré ne s'affiche plus comme encouragement
- Passe UI : durée des séances sur une ligne, icône calendrier visible en sombre, nombres à la française (« 3 666 », « 5,0 kcal », « 1 % »), « 5 exos », « Démarrer la séance »
- Une page en erreur ne bloque plus l'appli (barre du bas gardée, « Réessayer » qui recharge, message hors ligne) ; un échec de chargement Social s'affiche comme tel
- Photos d'exercices : emoji à la place d'une image cassée hors ligne, et gardées en cache ; plus de faux zéros pendant les chargements
- Rejoindre ou créer un défi fonctionne *(règles Firestore à déployer)* ; défi « Épaules 3D » de nouveau validable
- Séance renfo oubliée : enregistrée avec 2 h au plus, à son jour (elle durait parfois 13 h et passait au lendemain), et l'écran l'explique au lieu de rester vide
- Comptes Google : suppression du compte possible dans l'appli Android (la ré-authentification ne s'ouvrait pas)
- Séance renfo oubliée : sa date tient même si l'appli redémarre ; un appui bref ou un défilement n'ouvre plus « Supprimer » sur un exercice ; kcal par exercice (Statistiques) calculées comme le total
- Défis : la carte validée montre l'étape du jour (plus celle du lendemain ni une barre pleine trop tôt), « Retard » juste après la date de fin, page qui ne se vide plus à chaque validation, défi de la veille revalidable au réveil, double tap sans jour en trop (reps prises côté serveur), limite de 6 défis tenue, rejoindre / créer / abandonner hors ligne sans attente infinie (message clair pour valider)
- Compte : plus de retour de l'ancien compte après une déconnexion rapide, widget et demandes d'ami vidés à la déconnexion, noms très longs qui ne bloquent plus l'inscription, pseudo généré qui garde les lettres accentuées (é → e), plus d'erreur en anglais quand on ferme le choix du compte Google
- Profil : questionnaire de départ qui ne disparaît plus, poids / taille / date de naissance vraiment effaçables, recherche d'ami avec « @pseudo », avatar 🔥 nommé d'après le badge obtenu
- Export / import : types de séries (dégressive, échec) et charge des exercices en durée gardés, gainage lesté en reps qui reste en reps, séances Hevy nommées « Renforcement » importées, export complet refusé hors ligne au lieu d'un fichier incomplet ; image de partage avec la meilleure série au poids du corps
- Écran Défis : une colonne sur téléphone à l'accueil (titres coupés lettre par lettre), « Défi terminé ! » au dernier jour, nombres à la française et compteur qui s'affiche tout de suite, abandon confirmé dans l'appli, « Retard : 2 jours », compteur « aujourd'hui : x/y », défis validés dépliés quand il n'y a plus rien à faire, bouton « Rattraper » lisible, défis perso de tractions / dips au montant fixe à la bonne taille
- Historique : filtre d'exercice qui se réinitialise quand l'exercice disparaît, courbe « Reps max » pour les exercices au poids du corps (elle disait « Aucune séance »), modifier une séance garde les exercices non faits et les supersets, Records sans exercices vides, photos et explications des exercices de la bibliothèque, pas de modèle en double au double tap (ni de copie en double d'un modèle d'ami)
- Modèles : les exercices en secondes restent en secondes, retoucher le type déjà choisi n'efface plus la liste ; renfo : kcal des exercices de la bibliothèque selon leur catégorie, « pompes » et « Pompes » reconnus comme le même exercice
- Recherche d'exercices : sans accents (« developpe »), par le muscle affiché en français (« abdominaux »), avec plusieurs mots (« curl haltère »)
- Appli : le retour ne renvoie plus à l'écran de connexion, bouton retour Android qui quitte l'appli depuis le premier écran, barre d'état Android lisible selon le thème choisi, lien inconnu → accueil au lieu d'une page blanche, onglet actif retapé sans effet ; appli Android sans service worker web (la 1ʳᵉ ouverture après une mise à jour Play Store montrait l'ancienne version) ; sons disponibles hors ligne sur la PWA
- Sécurité *(règles Firestore à déployer)* : impossible d'écrire des séances, badges ou défis au nom d'un autre compte, de notifier un inconnu via une demande d'ami, ou de bloquer le fil d'un ami avec un document mal formé ; supprimer une séance efface aussi ses kudos
- Relecture des correctifs : abandon d'un défi qui attend son enregistrement (« Annuler » abandonnait quand même hors ligne), défi abandonné ailleurs « plus en cours » et carte rafraîchie, suppression d'une séance qui n'attend plus ~12 s sur un réseau mort, courbe en reps gardée avec une séance lestée, filtre d'historique qui ne revient plus tout seul, recherche « Essentiels » mot par mot, bouton central sans entrée d'historique en double, anciens caches vidés sur Android
- Séance muscu : virgule décimale acceptée (« 82,5 » donnait 825 kg), séance en cours plus effacée depuis l'Historique vide, repos auto après chaque série, minuteur de repos et chrono gardés au rechargement, séance vide abandonnée en la quittant, dé-valider une série, retirer une série ou un exercice, série suivante qui défile au-dessus du repos, champs et contrôles de 44 px, dialogues qui défilent au lieu de dépasser l'écran, suggestion de charge seulement si les séries avaient la même charge, image de partage sans texte écrasé, Modèles rouvert sur le dernier onglet
- Virgule décimale aussi dans la modification d'une séance, l'éditeur de modèles, les mensurations, le calculateur de disques et le poids du profil ; partage raté signalé depuis le récap renfo et les statistiques
- Historique : une modification n'est plus perdue par un tap à côté de la fenêtre, onglet / filtre / séances chargées gardés au retour arrière, résumé des cartes avec la série la plus lourde (« 2 séries · 82,5 kg max »), compteurs « 100+ » quand tout n'est pas chargé, modèle enregistré nommé d'après la séance et visible dans Modèles ; courbe sans arrondi au kilo (« stable » au lieu de « −0 kg »), dates avec l'année, période qui contient la dernière séance, 🏆 recalculés depuis l'historique ; durées « 1 h 07 », muscles traduits ; cartes, Records et fenêtres lisibles à 320 px avec une grande police
- Relecture des passes séance / Historique : un chrono par exercice, lié à sa série (plus de faux record après un retrait), superset défait au retrait d'un exercice, confirmation avant de retirer un exercice déjà commencé, reps entières ; « Voir les séances plus anciennes » garde la position, « Retour » mène à l'accueil après un onglet changé, « Séance libre » depuis Modèles, volume de l'image de partage jamais tronqué, graduations entières pour reps et durées ; modèle en cours d'édition protégé d'un tap à côté
- Mêmes chiffres partout : série recalculée en rouvrant l'appli un autre jour (Statistiques, Profil et Badges restaient figés), badges de série débloqués par la meilleure série, badges « séances » comptant la muscu, plus de badge verrouillé à « 100 % », objectif hebdo transmis au widget dès qu'il change, calendrier d'activité sur 90 jours réels (pas les 200 dernières séances), kcal par exercice qui s'additionnent au total, kcal des défis selon ton profil, exercices sautés d'un modèle non comptés, « pompes » = « Pompes », trophées des séances importées et après un changement d'unité ou un remplacement

### Technique
- Démo complète hors ligne sur émulateurs (`yarn dev:demo`), parcours e2e, audit de contraste, tests des règles Firestore
- Branches `dev` → `main` → `prod`, script de release, CI ; `google-services.json` retiré du dépôt

## 1.10.0 — 19/02/2026

Version publiée avant la mise en place de ce fichier : voir la
[release GitHub](https://github.com/PierrePocheron/reps/releases/tag/v1.10.0).
