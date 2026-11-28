#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DST="$ROOT/assets/vendor"

WORK=$(mktemp -d /tmp/comicbed-test-vendor.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

cd "$WORK"

fetch_package() {
    local NAME="$1"
    local VERSION="$2"

    mkdir -p "$WORK/$NAME"

    npm pack "$NAME@$VERSION" \
        --ignore-scripts --silent

    tar -xzf "$NAME-$VERSION.tgz" \
        -C "$WORK/$NAME"
}

fetch_package mocha 1.21.5
fetch_package chai 1.9.2
fetch_package sinon 1.7.3

mkdir -p \
    "$DST/mocha/js" \
    "$DST/mocha/css" \
    "$DST/chai/js" \
    "$DST/sinon"

cp "$WORK/mocha/package/mocha.js" \
   "$DST/mocha/js/mocha.js"

cp "$WORK/mocha/package/mocha.css" \
   "$DST/mocha/css/mocha.css"

cp "$WORK/chai/package/chai.js" \
   "$DST/chai/js/chai.js"

# Locate the standalone browser build of Sinon.
SINON="$WORK/sinon/package/pkg/sinon.js"

if [ ! -f "$SINON" ]; then
    echo "Standalone Sinon browser build not found."
    find "$WORK/sinon/package" -name 'sinon*.js'
    exit 1
fi

cp "$SINON" "$DST/sinon/index.js"

echo "=== Test libraries installed ==="

ls -lh \
    "$DST/mocha/js/mocha.js" \
    "$DST/mocha/css/mocha.css" \
    "$DST/chai/js/chai.js" \
    "$DST/sinon/index.js"
