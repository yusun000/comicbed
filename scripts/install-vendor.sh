#!/usr/bin/env bash
set -euo pipefail

# 出力先を引数で指定する
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 OUTPUT_DIRECTORY" >&2
  exit 1
fi

OUTPUT_DIR=$(realpath -m "$1")

# 既存の出力先を誤って上書きしない
if [ -e "$OUTPUT_DIR" ]; then
  echo "出力先が既に存在します: $OUTPUT_DIR" >&2
  exit 1
fi

WORK=$(mktemp -d /tmp/comicbed-vendor.XXXXXX)
mkdir -p "$WORK/tools" "$WORK/deps" "$WORK/assets/vendor"

echo "検証ディレクトリ: $WORK"

# ツールをComicBed本体とは別の場所に導入
npm install --prefix "$WORK/tools" \
  --no-save --ignore-scripts --legacy-peer-deps \
  bower@1.8.14 browserify@17.0.1

# 元のbower.jsonを読み込まない
cat > "$WORK/deps/bower.json" <<'JSON'
{
  "name": "comicbed-pinned-vendor",
  "private": true,
  "dependencies": {}
}
JSON

# バージョンを明示して取得
(
  cd "$WORK/deps"
  "$WORK/tools/node_modules/.bin/bower" install \
    jquery#2.0.3 \
    underscore#1.4.4 \
    backbone#1.0.0 \
    requirejs#2.1.11 \
    text#2.0.10 \
    handlebars#1.3.0 \
    iscroll#5.2.0 \
    spin.js#1.3.2 \
    jsziptools#2.4.7 \
    sprintf#1.0.3 \
    bootstrap-progressbar#0.9.0 \
    --config.interactive=false
)

SRC="$WORK/deps/bower_components"
DST="$WORK/assets/vendor"

install_file() {
  mkdir -p "$(dirname "$DST/$2")"
  cp "$SRC/$1" "$DST/$2"
}

install_file jquery/jquery.js jquery/js/jquery.js
install_file underscore/underscore.js underscore/js/underscore.js
install_file backbone/backbone.js backbone/js/backbone.js
install_file requirejs/require.js requirejs/js/require.js
install_file text/text.js text/js/text.js
install_file handlebars/handlebars.js handlebars/js/handlebars.js
install_file iscroll/build/iscroll.js iscroll/js/iscroll-min.js
install_file spin.js/spin.js spin.js/js/spin.js
install_file jsziptools/jsziptools.js jsziptools/js/jsziptools.min.js
install_file sprintf/src/sprintf.js sprintf/js/sprintf.js

install_file \
  bootstrap-progressbar/bootstrap-progressbar.min.js \
  bootstrap-progressbar/js/bootstrap-progressbar.min.js

install_file \
  bootstrap-progressbar/css/bootstrap-progressbar-3.0.0-rc2.min.css \
  bootstrap-progressbar/css/bootstrap-progressbar-3.0.0-rc2.min.css

# Bluebird 1.2.4をブラウザ用UMDに変換
npm pack bluebird@1.2.4 --pack-destination "$WORK" \
  --silent

mkdir -p "$WORK/bluebird" "$DST/bluebird"
tar -xzf "$WORK/bluebird-1.2.4.tgz" \
  -C "$WORK/bluebird"

"$WORK/tools/node_modules/.bin/browserify" \
  "$WORK/bluebird/package/js/main/bluebird.js" \
  --standalone Promise \
  -o "$DST/bluebird/index.js"

echo
echo "生成結果:"
find "$DST" -type f | sort

echo
echo "依存ライブラリの配置:"

mkdir -p "$(dirname "$OUTPUT_DIR")"
mv "$DST" "$OUTPUT_DIR"

find "$OUTPUT_DIR" -type f | sort

echo
echo "生成ファイル数:"
find "$OUTPUT_DIR" -type f | wc -l

echo
echo "完了: $OUTPUT_DIR"
echo "作業ディレクトリ: $WORK"
