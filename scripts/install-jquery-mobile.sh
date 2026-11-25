#!/usr/bin/env bash
set -euo pipefail

VERSION="1.4.0-rc.1"
URL="https://jquerymobile.com/resources/download/jquery.mobile-${VERSION}.zip"

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUTPUT=${1:?Usage: install-jquery-mobile.sh OUTPUT_DIRECTORY}

mkdir -p "$OUTPUT"
OUTPUT=$(cd "$OUTPUT" && pwd)

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "Downloading jQuery Mobile ${VERSION}..."

curl -fL --retry 2 "$URL" -o "$WORK/jquery-mobile.zip"

unzip -oq "$WORK/jquery-mobile.zip" -d "$WORK/extracted"

SRC="$WORK/extracted"

# 配布アーカイブ内の必要なファイルを特定
JS=$(find "$SRC" -type f -name "jquery.mobile-${VERSION}.js" -print -quit)
CSS=$(find "$SRC" -type f -name "jquery.mobile-${VERSION}.min.css" -print -quit)
GIF=$(find "$SRC" -type f -name "ajax-loader.gif" -print -quit)

for FILE in "$JS" "$CSS" "$GIF"; do
  if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
    echo "必要なファイルが見つかりません" >&2
    exit 1
  fi
done

mkdir -p "$OUTPUT/js" "$OUTPUT/css/images"

cp "$JS" "$OUTPUT/js/"
cp "$CSS" "$OUTPUT/css/"
cp "$GIF" "$OUTPUT/css/images/"

echo "jQuery Mobile installation complete: $OUTPUT"
