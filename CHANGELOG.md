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
- Hors ligne : séances, modèles, mensurations, modifications et import enregistrés sans réseau, envoyés au retour de la connexion

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

### Technique
- Démo complète hors ligne sur émulateurs (`yarn dev:demo`), parcours e2e, audit de contraste, tests des règles Firestore
- Branches `dev` → `main` → `prod`, script de release, CI ; `google-services.json` retiré du dépôt

## 1.10.0 — 19/02/2026

Version publiée avant la mise en place de ce fichier : voir la
[release GitHub](https://github.com/PierrePocheron/reps/releases/tag/v1.10.0).
