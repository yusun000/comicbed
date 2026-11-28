# ComicBed
ComicBed はWebブラウザ上で動作するコミックビューワです (注意: この README は書きかけです)  ([English](https://github.com/seikichi/comicbed/blob/master/README.md), [日本語](https://github.com/seikichi/comicbed/blob/master/README.ja.md)).

## デモ
[漫画を読む](http://seikichi.github.io/comicbed/#?url=comicbed/LH01_hq.pdf&screen.viewMode=TwoPage&screen.pageDirection=R2L).
このデモページで表示されている漫画は，[Jコミ](http://www.j-comi.jp/book/comic/1) からダウンロードした pdf ファイルです．

## 特徴
+ デスクトップとモバイル両方のモダンなブラウザで動作します
  + PDF.js が使用する JavaScript の機能に対応したモダンブラウザが必要です。旧世代のブラウザでの動作は保証されません。
  + とか言いつつモバイルだとまだまだ挙動が不安定です．たまにクラッシュするので注意
+ サポートしているフォーマットは **pdf, zip, rar, cbz, cbr** の5つです
+ 画像ファイルは **jpeg, png, gif, bmp, tiff** の5つをサポートしています
+ Google Drive や Dropbox との連携機能があります（現行サービスとの互換性は未検証です）

## 既知の不具合
+ モバイルでは挙動が不安定です．たまにクラッシュします．

## キーボードショートカット
+ 左右カーソルキー: ページを移動します
+ スペース: 2ページ表示モードと1ページ表示モードを切り替えます
+ エンター: フルスクリーンに切り替えます (フルスクリーンAPIをサポートしているブラウザに限る)

## その他どうでもいい特徴
+ ファイルのドロップに対応してます
+ 右綴じか左綴じかを設定で変更できます
+ pdf ファイルを閲覧する際は，ファイルのダウンロード完了を待たずに読み始めることができます （サーバーおよびブラウザの対応状況によります）
  + 回線が細い場合は一旦ファイルを全てダウンロードしてから閲覧を開始した方が快適かもしれません
  + フッタの設定 (Config) から "Range-Request when reading PDF files" で挙動を変更できます
+ スワイプでページを移動できます ([iScroll5](http://cubiq.org/iscroll-5-ready-for-beta-test) を利用)
+ 横に長いページは2ページ表示モードの際でも，その1ページだけ表示します
  + URL の末尾に screen.detectsSpreadPage=false と指定すると，この挙動を抑制できます
+ ページのキャッシュとかプリフェッチとかしてます
+ zip 等の圧縮ファイルを閲覧する際は，ファイル名を自然順ソートで並び換えます
+ Backbone.js + TypeScript (0.9) + JQuery Mobile (1.4) で書かれてます
  + MBA でビルドするのに10秒以上かかってつらぽよ...

## Query String Parameters
[example](http://seikichi.github.io/comicbed/#?url=comicbed/LH01_hq.pdf&screen.viewMode=TwoPage&screen.pageDirection=R2L)

+ url: string
+ screen.viewMode: 'OnePage' or 'TwoPage'
+ screen.pageDirection: 'L2R' or 'R2L'
+ screen.detectsSpreadPage: boolean
+ cache.cachePageNum: number
+ cache.cacheScreenNum: number
+ sort.reverse: boolean
+ sort.order: 'NameNatural' or 'NameDirectory' or 'Entry'
+ unarchiver.enablesRangeRequestInPdf: boolean

## ソースコードからのビルド

### 必要な環境

Ubuntu、Node.js 22.22.1、npm 9.2.0、Firefox で検証しています。
Git、Bash、標準的な GNU コマンドラインツール、および npm と
Git リポジトリへのネットワーク接続が必要です。
プロジェクト内の Grunt CLI と TypeScript 0.9.7 を使用するため、
グローバルインストールは不要です。

### 依存ライブラリの取得とビルド

新規チェックアウトしたリポジトリのルートで実行します。

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
./scripts/setup-legacy.sh "$PWD/generated-assets"
cp -a generated-assets/. assets/
./node_modules/.bin/grunt build
```

環境構築スクリプトには存在しない出力先を指定してください。
固定バージョンの依存ライブラリの取得、Git サブモジュールの初期化、
jQuery Mobile と PDF.js の配置を行います。
既存の `assets/` は削除しないでください。
`generated-assets/` は内容をコピーした後に削除できます。

リリース用ファイルは `dist/` に生成され、ビルド時には
`http://localhost:9001/` で HTTP サーバーが起動します。
ビルド済みのリリース版を配信する場合は以下を実行します。

```sh
./node_modules/.bin/grunt server:release
```

### Web サーバーへの配備

`dist/` の内容を静的 HTTP サーバーで配信できます。
`.mjs` の MIME タイプを `text/javascript`、`.wasm` を
`application/wasm` に設定してください。
HTTP 経由の PDF 閲覧には Range Request 対応を推奨します。

### ブラウザ回帰テスト

```sh
./scripts/install-test-vendor.sh
./node_modules/.bin/grunt test:browser
```

`http://localhost:9000/test.html` をブラウザで開いてください。
現在の回帰テストは62件です。

### PDF.js の統合

公式の `pdfjs-dist` バージョン 6.5.438 を使用します。
`scripts/install-pdfjs.sh` で取得・配置し、ES Modules と既存の
AMD アプリケーションを接続するブリッジから読み込みます。
PDF.js 本体への独自パッチは不要です。

条件を満たすページ全体の画像は元の解像度で直接取得し、
それ以外は PDF.js の標準レンダリング API を使用します。
画像取得にはバージョン固有の内部実装を使用しており、
安全性の確認条件を満たさない場合は標準レンダリングに戻ります。
PDF.js 更新時には回帰テストを再実行してください。

### PDF 診断ログと Range Request

診断ログは標準で無効です。URL のフラグメントより前に
`pdfDebug=true` を指定すると有効になります。

```text
http://localhost:9001/?pdfDebug=true#?url=example.pdf
```

Range Request は標準で有効です。無効にする例は以下のとおりです。

```text
http://localhost:9001/#?url=example.pdf&unarchiver.enablesRangeRequestInPdf=false
```

上記の例ではサーバーから `example.pdf` を取得できることが前提です。

### 動作確認状況

新規チェックアウトからの環境構築とリリースビルド、ブラウザ回帰テスト
62件、PDF・ZIP・CBZ の閲覧、1ページ・2ページ表示、HTTP Range
Request の切替、PDF 診断ログの切替を確認しています。
RAR/CBR と TIFF の閲覧は再検証していません。
現行の Google Drive・Dropbox との互換性および認証付きリモート PDF
へのアクセスも未検証です。

## ライセンス
GPL v3 or later
