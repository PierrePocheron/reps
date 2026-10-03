#!/usr/bin/env bash
# Release REPS — versions X.Y.Z, releases GitHub sur la branche prod.
#
#   1. sur dev  : scripts/release.sh prepare 1.2.0   → bump versions + commit + push
#   2. PR dev → main, puis main → prod (validées par Pierre)
#   3. sur prod : scripts/release.sh publish          → tag vX.Y.Z + release GitHub
#
# versionCode Android = X*10000 + Y*100 + Z (croissant, exigé par le Play Store).
set -euo pipefail
cd "$(dirname "$0")/.."

die() { echo "✗ $*" >&2; exit 1; }
branch=$(git branch --show-current)
[ -z "$(git status --porcelain)" ] || die "arbre de travail non propre"

case "${1:-}" in
  prepare)
    v="${2:-}"
    [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || die "usage : $0 prepare X.Y.Z"
    [ "$branch" = dev ] || die "prepare se lance sur dev (branche actuelle : $branch)"
    (( BASH_REMATCH[2] < 100 && BASH_REMATCH[3] < 100 )) || die "mineur/patch < 100 (versionCode)"
    code=$(( BASH_REMATCH[1] * 10000 + BASH_REMATCH[2] * 100 + BASH_REMATCH[3] ))
    sed -i '' -E "s/\"version\": \"[0-9.]+\"/\"version\": \"$v\"/" package.json
    sed -i '' -E "s/versionCode = [0-9]+/versionCode = $code/; s/versionName = \"[^\"]+\"/versionName = \"$v\"/" android/app/build.gradle
    git commit -qam "chore(release): v$v"
    git push -q origin dev
    echo "✓ v$v préparée sur dev (versionCode $code)."
    echo "  Ensuite : PR dev → main, puis main → prod, puis « $0 publish » sur prod."
    ;;
  publish)
    [ "$branch" = prod ] || die "publish se lance sur prod (branche actuelle : $branch)"
    git pull -q --ff-only origin prod
    v=$(node -p "require('./package.json').version")
    git rev-parse -q --verify "refs/tags/v$v" >/dev/null && die "le tag v$v existe déjà"
    git tag -a "v$v" -m "REPS v$v"
    git push -q origin "v$v"
    gh release create "v$v" --target prod --title "REPS v$v" --generate-notes
    echo "✓ Release v$v publiée. AAB : bash scripts/build-android-release.sh"
    ;;
  *) die "usage : $0 prepare X.Y.Z | $0 publish" ;;
esac
