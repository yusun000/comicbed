#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 OUTPUT_DIRECTORY" >&2
  exit 1
fi

OUTPUT=$(realpath -m "$1")

if [ -e "$OUTPUT" ]; then
  echo "出力先が既に存在します: $OUTPUT" >&2
  exit 1
fi

WORK=$(mktemp -d /tmp/comicbed-setup.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/assets/app"

echo "=== 1/4 Vendor libraries ==="
"$ROOT/scripts/install-vendor.sh" "$WORK/assets/vendor"

echo "=== 2/4 Git submodules ==="
"$ROOT/scripts/build-submodules.sh" "$WORK/assets/app"

echo "=== 3/4 jQuery Mobile ==="
"$ROOT/scripts/install-jquery-mobile.sh" \
  "$WORK/assets/app/jquery-mobile"

echo "=== 4/4 PDF.js ==="
"$ROOT/scripts/install-pdfjs.sh" \
  "$WORK/assets/app/pdfjs-modern"

mkdir -p "$(dirname "$OUTPUT")"
mv "$WORK/assets" "$OUTPUT"

echo
echo "Setup complete: $OUTPUT"
find "$OUTPUT" -type f | sort
