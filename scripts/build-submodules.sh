#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUTPUT=${1:?Usage: build-submodules.sh OUTPUT_DIRECTORY}

mkdir -p \
  "$OUTPUT/pdfjs/js" \
  "$OUTPUT/tiff/js" \
  "$OUTPUT/unrarlib/js"

cd "$ROOT"

# 固定されたコミットのサブモジュールを取得
git submodule update --init --recursive

# PDF.js
node submodules/pdf.js/make.js generic

cp submodules/pdf.js/build/generic/build/*.js \
  "$OUTPUT/pdfjs/js/"

cp submodules/pdf.js/build/generic/web/compatibility.js \
  "$OUTPUT/pdfjs/js/"

# TIFF.js
cp submodules/tiff.js/tiff.memory_growth.min.js \
  "$OUTPUT/tiff/js/tiff.min.js"

# unrar.js
cp submodules/unrar.js/unrar.min.js \
  "$OUTPUT/unrarlib/js/unrar.min.js"

echo "Submodule assets generated in: $OUTPUT"
