# Site web REPS — réflexion

> Issues : #7 (site vitrine v1), #24 (pages support). Décisions en attente de Pierre en fin de page.

## Rôle du site

1. **Exigences store** : URL de politique de confidentialité, URL de suppression de compte, site du développeur.
2. **Acquisition** : convertir un visiteur (Google, Instagram, bouche-à-oreille) en installation Play Store.
3. **Crédibilité** : une app gratuite d'un dev solo inspire plus confiance avec une vraie vitrine.

## Architecture proposée

| Domaine | Contenu | Hébergement |
|---|---|---|
| `domaine.fr` | Site vitrine (statique) | Firebase Hosting, 2ᵉ site du projet `pedro-reps` |
| `app.domaine.fr` | L'app web actuelle (aujourd'hui `pedro-reps.web.app`) | Firebase Hosting (site existant) |

- **Stack** : Astro statique + Tailwind, zéro JS hormis l'animation de la mascotte (SVG + CSS), comme
  pierrepocheron.fr. Objectif Lighthouse 4×100.
- **Emplacement** : dossier `site/` dans ce repo (même CI, mêmes releases, réutilise les captures et la
  mascotte), déployé seulement depuis `prod`.
- Identité de l'éditeur (mentions légales, confidentialité) injectée au build, jamais versionnée (repo public).

## Pages

| Page | Contenu |
|---|---|
| `/` | Hero (Rep qui marche + maquette téléphone + badge Google Play + « Ouvrir la version web »), 3 piliers, modes renfo/muscu, bibliothèque 1 324 exercices, social et défis, « gratuit et sans pub » (comparaison des paliers gratuits), FAQ, footer légal |
| `/confidentialite` | Politique actuelle (déplacée depuis l'app, l'app garde un lien) |
| `/suppression-compte` | Procédure in-app + par e-mail (URL exigée par Google) |
| `/faq` | Synchro, hors ligne, données, Android/iOS, langues |
| `/presse` | Logo, mascotte, captures, description courte/longue |
| `/mentions-legales` | Obligatoire en France (LCEN) |
| 404 | Rep « Oups » + retour à l'accueil |

## Message

Reprendre les trois piliers qui fonctionnent chez les leaders, en français et avec la touche REPS :
**Note tes séances en deux taps · Vois ta progression · Motive-toi avec tes amis (et Rep).**
Mots-clés : *application musculation gratuite*, *carnet d'entraînement*, *suivi pompes*,
*application renforcement musculaire*, *sans pub*.

## Plus tard

- Pages exercices pour le SEO (1 324 fiches) : fort potentiel, mais les illustrations sont © Gym visual
  (redistribution 180×180 avec attribution) — à valider avec leurs CGU avant de les publier sur le web.
- Version anglaise quand l'interface de l'app sera traduite (#34).

## Décisions en attente (Pierre)

- [ ] **Nom de domaine** — pistes : `repsapp.fr`, `getreps.fr`, `reps-muscu.fr` (vérifier la disponibilité).
- [ ] Site avant ou après la mise en production Play Store (l'URL de confidentialité actuelle suffit pour soumettre).
- [ ] Mascotte retenue (planche de propositions) — elle porte le hero du site.
