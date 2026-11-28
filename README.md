# ComicBed
A browser based comic book reader ([English](https://github.com/seikichi/comicbed/blob/master/README.md), [日本語](https://github.com/seikichi/comicbed/blob/master/README.ja.md)).

## Demo
see [demo](http://seikichi.github.io/comicbed/#?url=comicbed/LH01_hq.pdf&screen.viewMode=TwoPage&screen.pageDirection=R2L). The pdf file used in the demo site is downloaded from [J-comi](http://www.j-comi.jp/book/comic/1).

## Features
+ JavaScript & HTML5
+ runs in both desktop and mobile modern browsers.
  + IE10+, Firefox 24+, Chrome29+, Safari 6+, Chrome for Android 30+, iOS Safari 6+
+ supports several archive formats (**pdf, zip, rar, cbz, cbr**) and image formats (**jpeg, png, gif, bmp, tiff**).
+ can read files in Google Drive and Dropbox storages.

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

Verified on Ubuntu with Node.js 22.22.1, npm 9.2.0 and Firefox.
Git, Bash, GNU command-line utilities and network access to npm and Git
repositories are required. Grunt CLI and TypeScript 0.9.7 are installed
locally; global installations are not required.

From the root of a fresh Git checkout:

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
./scripts/setup-legacy.sh "$PWD/generated-assets"
cp -a generated-assets/. assets/
./node_modules/.bin/grunt build
```

The setup script requires a non-existing output directory. It obtains
vendor libraries, initializes the pinned Git submodules and prepares
browser assets. Do not delete the existing `assets/` directory.
The generated-assets directory can be removed after copying its contents.

Release files are generated in `dist/`, and the build starts a local
HTTP server at `http://localhost:9001/`. To serve an existing build:

```sh
./node_modules/.bin/grunt server:release
```

The contents of `dist/` can also be served by a static HTTP server.

### Verification and limitations

Dependency installation with `npm ci`, TypeScript compilation, release
build, PDF and ZIP/CBZ viewing, and single-page and two-page display
have been verified. This build recovery retains the original PDF.js fork
and other legacy browser libraries. Updating these dependencies and
addressing their security issues are outside its scope. The development
server is intended for local testing, not public deployment.
RAR/CBR, TIFF and current cloud service compatibility have not been
revalidated. The npm lockfile fixes the main npm dependency tree, not
all dependencies obtained by the asset setup scripts.

## License
GPL v3 or later
