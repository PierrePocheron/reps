# Branches & releases

| Branche | Rôle | Déploiement |
|---|---|---|
| `dev` | Travail quotidien (et la loop d'amélioration continue) | — |
| `main` | Intégration stable, reçoit les PR depuis `dev` | — |
| `prod` | Ce qui est publié ; chaque release y est taguée | Web (Firebase Hosting) via la CI |

Versions **X.Y.Z** (semver) : `X` rupture, `Y` fonctionnalité, `Z` correctif.

## Publier une version

```bash
scripts/release.sh prepare 1.0.0      # sur dev : bump package.json + versionCode/versionName Android
gh pr create --base main --head dev   # PR dev → main (labels + assignee PierrePocheron)
gh pr create --base prod --head main  # PR main → prod
scripts/release.sh publish            # sur prod : tag v1.0.0 + release GitHub (notes auto)
bash scripts/build-android-release.sh # AAB signé à uploader dans la Play Console
```

Avant la release : règles Firestore à jour déployées si elles ont changé, captures store régénérées si l'interface
a changé (`yarn store:screenshots`). Publication sur les stores et prérequis : [DEPLOY.md](DEPLOY.md).

Le `versionCode` Android est dérivé de la version (`1.2.3` → `10203`), donc toujours croissant.

## CI

- Tests, type-check, **lint** et build sur chaque push `dev`/`main`/`prod` et chaque PR vers `main`/`prod`.
- Déploiement web uniquement sur `prod`. Les variables `VITE_*` viennent des secrets GitHub :
  `gh secret set -f .env` (une fois, depuis la racine du repo).
- Les règles Firestore ne sont **pas** déployées par la CI (`firebase deploy --only firestore`, voir [DEPLOY.md](DEPLOY.md)).
- Les e2e (`yarn e2e`) et l'audit de contraste (`yarn a11y`) tournent en local sur la démo, pas en CI.
