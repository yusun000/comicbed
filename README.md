# ComicBed
A browser based comic book reader ([English](https://github.com/seikichi/comicbed/blob/master/README.md), [日本語](https://github.com/seikichi/comicbed/blob/master/README.ja.md)).

## Demo
see [demo](http://seikichi.github.io/comicbed/#?url=comicbed/LH01_hq.pdf&screen.viewMode=TwoPage&screen.pageDirection=R2L). The pdf file used in the demo site is downloaded from [J-comi](http://www.j-comi.jp/book/comic/1).

## Features
+ JavaScript & HTML5
+ runs in both desktop and mobile modern browsers.
  + Requires a modern browser supporting the JavaScript features used by PDF.js. Legacy browser versions are not guaranteed to work.
+ supports several archive formats (**pdf, zip, rar, cbz, cbr**) and image formats (**jpeg, png, gif, bmp, tiff**).
+ includes Google Drive and Dropbox integrations (current service compatibility has not been verified).

## Known Issues
+ sometimes crashes in mobile browsers ;-p
+ need tap twice to open dropbox chooser in Safari.

## Keyboard Shortcuts
+ left/right-arrow key: move page
+ space: toggle view mode between one page and two pages
+ enter: toggle fullscreen

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

## Building from source

### Requirements

Verified on Ubuntu with Node.js 22.22.1, npm 9.2.0 and Firefox.
Git, Bash, standard GNU command-line utilities and network access to npm
and Git repositories are required. The build uses the local Grunt CLI and
TypeScript 0.9.7; global installations are not required.

### Install dependencies and build

From the root of a fresh Git checkout, run:

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
./scripts/setup-legacy.sh "$PWD/generated-assets"
cp -a generated-assets/. assets/
./node_modules/.bin/grunt build
```

The setup script requires an output directory that does not already exist.
It installs version-pinned vendor libraries, initializes Git submodules,
and installs jQuery Mobile and PDF.js. The existing `assets/` directory
must not be deleted. The temporary `generated-assets/` directory can be
removed after copying its contents.

Release files are generated in `dist/`. The build task also starts a
local HTTP server at `http://localhost:9001/`. To serve an existing build:

```sh
./node_modules/.bin/grunt server:release
```

### Deployment

Serve the contents of `dist/` using a static HTTP server. Configure
`.mjs` as `text/javascript` and `.wasm` as `application/wasm`.
HTTP Range Request support is recommended for remote PDF files.

### Browser regression tests

```sh
./scripts/install-test-vendor.sh
./node_modules/.bin/grunt test:browser
```

Open `http://localhost:9000/test.html`. The current suite has 62 tests.

### PDF.js integration

ComicBed uses the official `pdfjs-dist` package, version 6.5.438,
installed by `scripts/install-pdfjs.sh` and loaded through an ES module
bridge to the existing AMD application. No custom PDF.js patch is needed.

Suitable full-page images can be extracted at their native resolution.
Other pages use the standard PDF.js rendering API. Image extraction
uses version-specific internals and falls back to standard rendering
when its safety checks do not pass. Re-run regression tests when
updating PDF.js.

### PDF diagnostics and Range Requests

Diagnostic logging is disabled by default. Enable it with `pdfDebug=true`
before the URL fragment:

```text
http://localhost:9001/?pdfDebug=true#?url=example.pdf
```

Range Requests are enabled by default. To disable them:

```text
http://localhost:9001/#?url=example.pdf&unarchiver.enablesRangeRequestInPdf=false
```

These examples assume `example.pdf` is available from the server.

### Verification status

A clean checkout and release build, 62 browser regression tests,
PDF/ZIP/CBZ viewing, single-page and two-page display, HTTP Range
Request switching and PDF diagnostic logging have been verified.
RAR/CBR and TIFF viewing have not been revalidated. Current Google Drive
and Dropbox compatibility and authenticated remote PDF access remain
unverified.

## License
GPL v3 or later
