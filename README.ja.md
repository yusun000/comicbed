# ComicBed
ComicBed はWebブラウザ上で動作するコミックビューワです (注意: この README は書きかけです)  ([English](https://github.com/seikichi/comicbed/blob/master/README.md), [日本語](https://github.com/seikichi/comicbed/blob/master/README.ja.md)).

## デモ
[漫画を読む](http://seikichi.github.io/comicbed/#?url=comicbed/LH01_hq.pdf&screen.viewMode=TwoPage&screen.pageDirection=R2L).
このデモページで表示されている漫画は，[Jコミ](http://www.j-comi.jp/book/comic/1) からダウンロードした pdf ファイルです．

## 特徴
+ デスクトップとモバイル両方のモダンなブラウザで動作します
  + Firefox 24+, Chrome29+, Safari 6+, Chrome for Android 30+, iOS Safari 6+
  + とか言いつつモバイルだとまだまだ挙動が不安定です．たまにクラッシュするので注意
+ サポートしているフォーマットは **pdf, zip, rar, cbz, cbr** の5つです
+ 画像ファイルは **jpeg, png, gif, bmp, tiff** の5つをサポートしています
+ Google Drive や Dropbox 上に置いてあるファイルを閲覧することができます

## 既知の不具合
+ モバイルでは挙動が不安定です．たまにクラッシュします．

## キーボードショートカット
+ 左右カーソルキー: ページを移動します
+ スペース: 2ページ表示モードと1ページ表示モードを切り替えます
+ エンター: フルスクリーンに切り替えます (フルスクリーンAPIをサポートしているブラウザに限る)

## その他どうでもいい特徴
+ ファイルのドロップに対応してます
+ 右綴じか左綴じかを設定で変更できます
+ pdf ファイルを閲覧する際は，ファイルのダウンロード完了を待たずに読み始めることができます (ただし Safari を除く)
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

Ubuntu、Node.js 22.22.1、npm 9.2.0、Firefox で検証しています。
Git、Bash、GNU コマンドラインツール、および npm と Git リポジトリ
へのネットワーク接続が必要です。Grunt CLI と TypeScript 0.9.7 は
プロジェクト内に導入するため、グローバルインストールは不要です。

新規チェックアウトしたリポジトリのルートで以下を実行します。

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
./scripts/setup-legacy.sh "$PWD/generated-assets"
cp -a generated-assets/. assets/
./node_modules/.bin/grunt build
```

環境構築スクリプトには存在しない出力先を指定してください。
依存ライブラリの取得、固定された Git サブモジュールの初期化、
ブラウザ用ファイルの構築を行います。既存の `assets/` は削除しないで
ください。`generated-assets/` は内容をコピーした後に削除できます。

リリース用ファイルは `dist/` に生成され、ビルド時には
`http://localhost:9001/` で HTTP サーバーが起動します。
ビルド済みのリリース版を配信する場合は以下を実行します。

```sh
./node_modules/.bin/grunt server:release
```

`dist/` の内容は静的 HTTP サーバーでも配信できます。

### 動作確認と制約

`npm ci` による依存関係の導入、TypeScript のコンパイル、リリースビルド、
PDF・ZIP・CBZ の閲覧、1ページ・2ページ表示を確認しています。
今回のビルド復旧では従来の PDF.js フォークと旧世代のブラウザ用
ライブラリを維持しています。これらの更新や脆弱性対策は対象外です。
開発用サーバーはローカル検証用であり、一般公開用ではありません。
RAR/CBR、TIFF、現行クラウドサービスとの互換性は再検証していません。
lockfile は本体の npm 依存関係を固定しますが、環境構築スクリプトが
取得するすべての依存関係を固定するものではありません。

## ライセンス
GPL v3 or later
