import Unarchiver = require('models/unarchiver');
import PdfjsBridge = require('models/pdfjs_bridge');
import sprintf = require('sprintf');
import Promise = require('promise');
import PromiseUtil = require('utils/promise');

export = PdfUnarchiver;

// Enable PDF diagnostics with ?pdfDebug=true.
var pdfDebug = /(?:^|[?&])pdfDebug=true(?:&|$)/
  .test(window.location.search);

function debugLog(...messages: any[]): void {
  if (pdfDebug) {
    console.log.apply(console, messages);
  }
}

class PdfUnarchiver implements Unarchiver.Unarchiver {

  static createFromURL(
    url: string,
    setting: Unarchiver.Setting,
    options: Unarchiver.Options
  ): Promise<Unarchiver.Unarchiver> {

    var name = options.name || '';

    return Promise.cast<any>(PdfjsBridge.load())
      .then((pdfjs: any) => {

        if (setting.enablesRangeRequestInPdf()) {
          var params: any = {
            url: url,
            httpHeaders: options.httpHeaders
          };

          return PdfUnarchiver.openDocument(
            pdfjs, params, name, setting
          );
        }

        return PromiseUtil.getArrayBufferByXHR(
          url, options.httpHeaders
        ).then((buffer: ArrayBuffer) => {
          return PdfUnarchiver.openDocument(
            pdfjs,
            { data: new Uint8Array(buffer) },
            name,
            setting
          );
        });
      });
  }

  private static openDocument(
    pdfjs: any,
    params: any,
    name: string,
    setting: Unarchiver.Setting
  ): Promise<Unarchiver.Unarchiver> {

    var task = pdfjs.getDocument(params);

    return Promise.cast<any>(task.promise)
      .then<Unarchiver.Unarchiver>(
        (doc: any): Promise<Unarchiver.Unarchiver> => {
        if (name) {
          return Promise.fulfilled<Unarchiver.Unarchiver>(
            new PdfUnarchiver(name, doc, task, setting)
          );
        }

        return Promise.cast<any>(doc.getMetadata())
          .then<Unarchiver.Unarchiver>(
            (metadata: any): Unarchiver.Unarchiver => {
            var title = '';

            if (metadata && metadata.info) {
              title = metadata.info.Title || '';
            }

            return new PdfUnarchiver(
              title, doc, task, setting
            );
          });
      }).catch((error: any) => {
        task.destroy().catch(function () {});
        return Promise.rejected<Unarchiver.Unarchiver>(
          error
        );
      });
  }

  private _document: any;
  private _loadingTask: any;
  private _setting: Unarchiver.Setting;
  private _archiveName: string;
  private _names: string[];
  private _nameToPageNum: {[name: string]: number;};
  private _tail: Promise<any>;
  private _inFlight: {
    [name: string]: Promise<Unarchiver.Content>;
  };
  private _activeRender: any;
  private _closed: boolean;

  constructor(
    name: string,
    pdfDocument: any,
    loadingTask: any,
    setting: Unarchiver.Setting
  ) {
    this._document = pdfDocument;
    this._loadingTask = loadingTask;
    this._setting = setting;
    this._archiveName = name;
    this._names = [];
    this._nameToPageNum = {};
    this._tail = Promise.fulfilled(null);
    this._inFlight = {};
    this._activeRender = null;
    this._closed = false;

    var digits = 1 + Math.floor(
      Math.log(pdfDocument.numPages) / Math.log(10)
    );

    var format = (<any>sprintf).sprintf(
      'pdf-page-%%0%dd', digits
    );

    for (var i = 0; i < pdfDocument.numPages; ++i) {
      var pageName = (<any>sprintf).sprintf(
        format, i + 1
      );

      this._names.push(pageName);
      this._nameToPageNum[pageName] = i + 1;
    }
  }

  archiveName(): string {
    return this._archiveName;
  }

  filenames(): string[] {
    return this._names;
  }

  private renderPage(
    page: any
  ): Promise<Unarchiver.Content> {

    if (!this._setting.detectsImageXObjectPageInPdf()) {
      debugLog('[PDF] XObject disabled');
      return this.renderPageNormally(page);
    }

    return Promise.cast<any>(PdfjsBridge.load())
      .then((pdfjs: any) => {
        return Promise.cast<any>(
          pdfjs.extractImage(page)
        );
      }).catch((error: any): HTMLCanvasElement => {
        console.warn('PDF image extraction failed:', error);
        return null;
      }).then((canvas: HTMLCanvasElement) => {

        if (this._closed) {
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
          }
          return Promise.rejected<Unarchiver.Content>(
            'PDF is closed'
          );
        }

        if (!canvas) {
          debugLog(
            '[PDF] XObject fallback', page.pageNumber
          );
          return this.renderPageNormally(page);
        }

        debugLog(
          'PDF image extracted:',
          canvas.width,
          canvas.height
        );

        if (!this._closed) {
          page.cleanup();
        }

        return Promise.fulfilled<Unarchiver.Content>(
          canvas
        );
      });
  }

  private renderPageNormally(
    page: any
  ): Promise<Unarchiver.Content> {

    if (this._closed) {
      return Promise.rejected<Unarchiver.Content>(
        'PDF is closed'
      );
    }

    var CSS_UNITS = 96.0 / 72.0;
    var scale = this._setting.pdfjsCanvasScale();
    var viewport = page.getViewport({
      scale: scale * CSS_UNITS
    });

    var canvas = document.createElement('canvas');

    canvas.width = Math.max(
      1, Math.floor(viewport.width)
    );

    canvas.height = Math.max(
      1, Math.floor(viewport.height)
    );

    var renderTask = page.render({
      canvas: canvas,
      canvasContext: canvas.getContext('2d'),
      viewport: viewport
    });

    this._activeRender = renderTask;

    var completed = false;

    return Promise.cast<void>(renderTask.promise)
      .then<Unarchiver.Content>(
        (): Promise<Unarchiver.Content> => {
        if (this._closed) {
          return Promise.rejected<Unarchiver.Content>(
            'PDF is closed'
          );
        }

        completed = true;

        return Promise.fulfilled<Unarchiver.Content>(canvas);
      }).finally(() => {
        this._activeRender = null;

        if (!this._closed) {
          page.cleanup();
        }

        if (!completed) {
          canvas.width = 0;
          canvas.height = 0;
        }
      });
  }

  unpack(name: string): Promise<Unarchiver.Content> {
    var pageNum = this._nameToPageNum[name];

    if (!pageNum || pageNum > this._document.numPages) {
      return Promise.rejected<Unarchiver.Content>(
        'invalid filename:' + name
      );
    }

    if (this._closed) {
      return Promise.rejected<Unarchiver.Content>(
        'PDF is closed'
      );
    }

    if (this._inFlight[name]) {
      debugLog('[PDF] reuse in-flight', pageNum);
      return this._inFlight[name].uncancellable();
    }

    var requestedAt = pdfDebug ? performance.now() : 0;

    debugLog('[PDF] request', pageNum);

    var task = this._tail.then(() => {
      debugLog(
        '[PDF] start', pageNum,
        'queue ms:', Math.round(
          pdfDebug ? performance.now() - requestedAt : 0
        )
      );
      if (this._closed) {
        return Promise.rejected<Unarchiver.Content>(
          'PDF is closed'
        );
      }

      return Promise.cast<any>(
        this._document.getPage(pageNum)
      ).then((page: any) => {
        return this.renderPage(page).then((content) => {
          debugLog(
            '[PDF] ready', pageNum,
            'total ms:', Math.round(
              pdfDebug ? performance.now() - requestedAt : 0
            ),
            'size:', content.width, content.height
          );
          return content;
        });
      });
    });

    this._tail = task.then<any>(
      (): any => null,
      (): any => null
    );

    var sharedTask = task.finally(() => {
      delete this._inFlight[name];
    });

    this._inFlight[name] = sharedTask;

    return sharedTask.uncancellable();
  }

  close(): void {
    if (this._closed) {
      return;
    }

    this._closed = true;

    if (this._activeRender) {
      this._activeRender.cancel();
    }

    this._loadingTask.destroy().catch(function () {});
  }
}
