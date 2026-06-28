#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build-android-release.sh — Build complet de l'AAB signé pour le Play Store
#
# Prérequis :
#   - android/keystore.properties configuré (via scripts/setup-keystore.sh)
#   - Android Studio / SDK installé
#   - Variables d'environnement Firebase dans .env
#
# Usage : bash scripts/build-android-release.sh
# Sortie : android/app/release/app-release.aab
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
PROPS_FILE="$ANDROID_DIR/keystore.properties"

echo ""
echo "═══════════════════════════════════════════════"
echo "   📦  Reps — Build AAB Play Store"
echo "═══════════════════════════════════════════════"
echo ""

# ─── Vérifications ────────────────────────────────────────────────────────────

if [[ ! -f "$PROPS_FILE" ]]; then
  echo "❌  keystore.properties introuvable."
  echo "    Exécutez d'abord : bash scripts/setup-keystore.sh"
  exit 1
fi

if ! command -v yarn &> /dev/null; then
  echo "❌  yarn introuvable — export PATH requis :"
  echo "    export PATH=\"/opt/homebrew/bin:/usr/local/bin:\$PATH\""
  exit 1
fi

# ─── Étape 1 : Build web ──────────────────────────────────────────────────────
echo "1/4  🏗️   Build Vite (production)..."
cd "$ROOT_DIR"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
yarn build
echo "      ✅  dist/ généré"
echo ""

# ─── Étape 2 : Sync Capacitor ─────────────────────────────────────────────────
echo "2/4  🔄  Capacitor sync android..."
yarn cap sync android
echo "      ✅  Sources Android synchronisées"
echo ""

# ─── Étape 3 : Build AAB Gradle ───────────────────────────────────────────────
echo "3/4  🔨  Gradle bundleRelease..."
cd "$ANDROID_DIR"
./gradlew bundleRelease --no-daemon
echo "      ✅  AAB généré"
echo ""

# ─── Étape 4 : Résumé ─────────────────────────────────────────────────────────
AAB_PATH="$ANDROID_DIR/app/release/app-release.aab"

if [[ -f "$AAB_PATH" ]]; then
  AAB_SIZE=$(du -sh "$AAB_PATH" | cut -f1)
  echo "4/4  📋  Résumé"
  echo ""
  echo "     Fichier : $AAB_PATH"
  echo "     Taille  : $AAB_SIZE"
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "🎉  Build terminé avec succès !"
  echo ""
  echo "Prochaines étapes :"
  echo "  1. Aller sur play.google.com/console"
  echo "  2. Créer une nouvelle application (si pas encore fait)"
  echo "  3. Production > Versions > Créer une version"
  echo "  4. Uploader $AAB_PATH"
  echo "  5. Remplir les infos store (voir docs/PLAYSTORE.md)"
  echo "═══════════════════════════════════════════════"
else
  echo "❌  AAB introuvable après le build."
  echo "    Vérifiez les logs Gradle ci-dessus."
  exit 1
fi
