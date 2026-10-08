#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-keystore.sh — Génère la keystore de signature Reps pour le Play Store
#
# Usage : bash scripts/setup-keystore.sh
# Crée  : android/reps-release.keystore + android/keystore.properties
#
# ⚠️  NE JAMAIS committer keystore.properties ni *.keystore !
#     Ces fichiers sont dans .gitignore.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077 # keystore and keystore.properties readable by this account only

KEYSTORE_DIR="$(dirname "$0")/../android"
KEYSTORE_FILE="$KEYSTORE_DIR/reps-release.keystore"
PROPS_FILE="$KEYSTORE_DIR/keystore.properties"

echo ""
echo "═══════════════════════════════════════════════"
echo "   🔐  Reps — Configuration keystore Play Store"
echo "═══════════════════════════════════════════════"
echo ""

# Vérification keytool
if ! command -v keytool &> /dev/null; then
  echo "❌  keytool introuvable. Installez le JDK :"
  echo "    brew install openjdk"
  exit 1
fi

# Vérification si keystore existe déjà
if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "⚠️   La keystore existe déjà : $KEYSTORE_FILE"
  echo "    Pour la recréer, supprimez-la d'abord."
  echo ""
  if [[ -f "$PROPS_FILE" ]]; then
    echo "✅  keystore.properties existe aussi — configuration déjà en place."
  fi
  exit 0
fi

echo "Ce script va créer votre keystore de signature."
echo "📌 IMPORTANT : notez vos mots de passe dans un gestionnaire de mots de passe !"
echo "   Perdre la keystore = impossible de mettre à jour l'app sur le Play Store."
echo ""

# Collecte des informations
# -s: nothing echoed (scrollback, screen sharing)
read -rsp "Mot de passe de la keystore (store password) : " STORE_PASSWORD
echo ""
read -rsp "Mot de passe de la clé (key password, peut être identique) : " KEY_PASSWORD
echo ""
# keytool reads them from the environment (:env), never from argv (visible in ps)
export STORE_PASSWORD KEY_PASSWORD
read -rp "Votre prénom et nom : " FULL_NAME
read -rp "Ville : " CITY
read -rp "Pays (code 2 lettres) [FR] : " COUNTRY
COUNTRY="${COUNTRY:-FR}"

echo ""
echo "⏳  Génération de la keystore (validité 27 ans / 10 000 jours)..."
echo ""

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias reps \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass:env STORE_PASSWORD \
  -keypass:env KEY_PASSWORD \
  -dname "CN=$FULL_NAME, OU=Reps, O=Reps, L=$CITY, ST=$CITY, C=$COUNTRY"

echo ""
echo "✅  Keystore créée : $KEYSTORE_FILE"

# Génération de keystore.properties
cat > "$PROPS_FILE" <<EOF
storeFile=reps-release.keystore
storePassword=$STORE_PASSWORD
keyAlias=reps
keyPassword=$KEY_PASSWORD
EOF
chmod 600 "$KEYSTORE_FILE" "$PROPS_FILE" # umask covers new files; this also tightens an older keystore.properties

echo "✅  Fichier créé  : $PROPS_FILE"
echo ""
echo "═══════════════════════════════════════════════"
echo "🎉  Configuration terminée !"
echo ""
echo "Prochaine étape : bash scripts/build-android-release.sh"
echo "═══════════════════════════════════════════════"
echo ""
echo "⚠️  Rappel : sauvegardez $KEYSTORE_FILE en lieu sûr."
echo "   Pensez à activer le Play App Signing dans la Google Play Console"
echo "   (recommandé — Google garde une copie chiffrée de votre clé)."
echo ""
