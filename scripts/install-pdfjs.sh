#!/usr/bin/env bash
set -euo pipefail

VERSION=6.5.438

OUTPUT=$(realpath -m \
  "${1:?Usage: install-pdfjs.sh OUTPUT_DIRECTORY}")

WORK=$(mktemp -d /tmp/comicbed-pdfjs.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

cd "$WORK"

echo "=== Download PDF.js $VERSION ==="

npm pack "pdfjs-dist@$VERSION" \
  --ignore-scripts --quiet

tar -xzf "pdfjs-dist-$VERSION.tgz"

echo "=== Install PDF.js $VERSION ==="

mkdir -p "$OUTPUT/build"

for FILE in \
  pdf.mjs \
  pdf.worker.mjs \
  pdf.renderer.mjs
do
  cp "package/legacy/build/$FILE" \
    "$OUTPUT/build/"
done

for DIR in \
  cmaps \
  iccs \
  standard_fonts \
  wasm
do
  cp -R "package/$DIR" "$OUTPUT/"
done

cp package/LICENSE "$OUTPUT/"

printf '%s\n' "$VERSION" > "$OUTPUT/VERSION"

echo
echo "PDF.js $VERSION installed in: $OUTPUT"
du -sh "$OUTPUT"
