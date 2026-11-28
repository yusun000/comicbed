import Unarchiver = require('models/unarchiver');
import ImageUtil = require('utils/image');
import Promise = require('promise');

var assert = chai.assert;

describe('PdfImageUnarchiver', function () {
  this.timeout(5000);
  var compressTypes = [
    'None',
    'BZip',
    'Fax',
    'Group4',
    'JPEG',
    'JPEG2000',
    'Lossless',
    'LZW',
    'RLE',
    'Zip',
  ];
  var factory = Unarchiver.createFactory(<Unarchiver.Setting><any>{
    pdfjsCanvasScale: () => 1,
    detectsImageXObjectPageInPdf: () => true,
    pageFileExtensions: () => [''],
    enablesRangeRequestInPdf: () => true,
  });
  function contentToCanvas(
    content: Unarchiver.Content
  ): HTMLCanvasElement {
    if (content instanceof HTMLCanvasElement) {
      return <HTMLCanvasElement>content;
    }
    return ImageUtil.imageElementToCanvas(<any>content);
  }

  var PAGE_SIZE = 2;
  var pdfDir = location.protocol + '//' + location.host + '/testdata/pdf/';

  var image01: HTMLCanvasElement;
  var image02: HTMLCanvasElement;
  var jpegImage01: HTMLCanvasElement;
  var jpegImage02: HTMLCanvasElement;
  before((done) => {
    ImageUtil.loadImageFromURL(pdfDir + '01.png').then((image: HTMLImageElement) => {
      image01 = ImageUtil.imageElementToCanvas(image);
      return ImageUtil.loadImageFromURL(pdfDir + '02.png');
    }).then((image: HTMLImageElement) => {
      image02 = ImageUtil.imageElementToCanvas(image);
      return ImageUtil.loadImageFromURL(pdfDir + '01.jpg');
    }).then((image: HTMLImageElement) => {
      jpegImage01 = ImageUtil.imageElementToCanvas(image);
      return ImageUtil.loadImageFromURL(pdfDir + '02.jpg');
    }).then((image: HTMLImageElement) => {
      jpegImage02 = ImageUtil.imageElementToCanvas(image);
      done();
    }).catch((error: any) => {
      done(error || new Error('Reference image loading failed'));
    });
  });

  for (var i = 0, len = compressTypes.length; i < len; ++i) {
    ((type: string) => {
      var url = pdfDir + type + '.pdf';

      it('should extract Image XObject from pdf files (compressed with ' + type + ' option)', (done) => {
        var unarchiver: Unarchiver.Unarchiver = null;
        var filenames: string[] = [];
        factory.getUnarchiverFromURL(url)
          .then((_unarchiver: Unarchiver.Unarchiver) => {
            unarchiver = _unarchiver;
            filenames = unarchiver.filenames();

            assert.strictEqual(type, unarchiver.archiveName());
            assert.strictEqual(PAGE_SIZE, filenames.length);

            return unarchiver.unpack(filenames[0]);
          }).then((content: Unarchiver.Content) => {
            var image = contentToCanvas(content);
            assert(content instanceof HTMLCanvasElement);
            assert.strictEqual(image.width, image01.width);
            assert.strictEqual(image.height, image01.height);

            if (type === 'JPEG') {
              assert(jpegImage01.toDataURL() === image.toDataURL());
            } else {
              // assert(image01.toDataURL() === image.toDataURL());
            }
            return unarchiver.unpack(filenames[1]);
          }).then((content: Unarchiver.Content) => {
            var image = contentToCanvas(content);
            assert(content instanceof HTMLCanvasElement);
            assert.strictEqual(image.width, image02.width);
            assert.strictEqual(image.height, image02.height);

            if (type === 'JPEG') {
              assert(jpegImage02.toDataURL() === image.toDataURL());
            } else {
              // assert(image02.toDataURL() === image.toDataURL());
            }
          }).finally(() => {
            if (unarchiver) {
              unarchiver.close();
            }
          }).then(() => {
            done();
          }, (error: any) => {
            done(error || new Error('PDF test failed'));
          });
      });
    })(compressTypes[i]);
  }
});


describe('PdfXObjectSafety', function () {
  this.timeout(10000);

  var pdfDir = location.protocol + '//' +
    location.host + '/testdata/pdf/xobject/';

  function createFactory(extract: boolean) {
    return Unarchiver.createFactory(<Unarchiver.Setting><any>{
      pdfjsCanvasScale: () => 1,
      detectsImageXObjectPageInPdf: () => extract,
      pageFileExtensions: () => [''],
      enablesRangeRequestInPdf: () => true
    });
  }

  function assertPixel(
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number
  ): void {
    var pixel = canvas.getContext('2d')
      .getImageData(x, y, 1, 1).data;

    assert(Math.abs(pixel[0] - r) <= 5);
    assert(Math.abs(pixel[1] - g) <= 5);
    assert(Math.abs(pixel[2] - b) <= 5);
  }

  function check(
    name: string,
    extract: boolean,
    width: number,
    height: number,
    verify?: (canvas: HTMLCanvasElement) => void
  ): void {
    it(name + ' / extraction=' + extract, (done) => {
      var unarchiver: Unarchiver.Unarchiver = null;

      createFactory(extract)
        .getUnarchiverFromURL(pdfDir + name + '.pdf')
        .then((value: Unarchiver.Unarchiver) => {
          unarchiver = value;
          assert.strictEqual(unarchiver.filenames().length, 1);

          return unarchiver.unpack(
            unarchiver.filenames()[0]
          );
        }).then((content: Unarchiver.Content) => {
          assert(content instanceof HTMLCanvasElement);
          assert.strictEqual(content.width, width);
          assert.strictEqual(content.height, height);

          if (verify) {
            verify(<HTMLCanvasElement>content);
          }
        }).finally(() => {
          if (unarchiver) {
            unarchiver.close();
          }
        }).then(() => {
          done();
        }, (error: any) => {
          done(error || new Error('XObject test failed'));
        });
    });
  }

  check('full-page', true, 240, 360, (canvas) => {
    assertPixel(canvas, 60, 90, 255, 0, 0);
    assertPixel(canvas, 180, 90, 0, 255, 0);
    assertPixel(canvas, 60, 270, 0, 0, 255);
    assertPixel(canvas, 180, 270, 255, 255, 0);
  });

  check('full-clip', true, 240, 360);

  check('partial-clip', true, 160, 240, (canvas) => {
    assertPixel(canvas, 40, 60, 255, 0, 0);
    assertPixel(canvas, 120, 60, 255, 255, 255);
  });

  check('margin', true, 160, 240, (canvas) => {
    assertPixel(canvas, 0, 0, 255, 255, 255);
  });

  check('multiple-images', true, 160, 240);
  check('text-overlay', true, 160, 240);
  check('rotated-page', true, 240, 160);

  check('mirrored-image', true, 160, 240, (canvas) => {
    assertPixel(canvas, 40, 60, 0, 255, 0);
    assertPixel(canvas, 120, 60, 255, 0, 0);
  });

  check('annotation', true, 160, 240);
  check('aspect-mismatch', true, 160, 200);

  check('full-page', false, 160, 240);
});


describe('PdfUnarchiverLifecycle', function () {
  this.timeout(10000);

  var url = location.protocol + '//' +
    location.host + '/testdata/pdf/JPEG.pdf';

  var factory = Unarchiver.createFactory(
    <Unarchiver.Setting><any>{
      pdfjsCanvasScale: () => 1,
      detectsImageXObjectPageInPdf: () => true,
      pageFileExtensions: () => [''],
      enablesRangeRequestInPdf: () => true
    }
  );

  var unarchiver: Unarchiver.Unarchiver;

  beforeEach((done) => {
    unarchiver = null;

    factory.getUnarchiverFromURL(url)
      .then((value: Unarchiver.Unarchiver) => {
        unarchiver = value;
        assert.strictEqual(value.filenames().length, 2);
      }).then(() => {
        done();
      }, (error: any) => {
        done(error || new Error('PDF setup failed'));
      });
  });

  afterEach(() => {
    if (unarchiver) {
      unarchiver.close();
      unarchiver = null;
    }
  });

  function finish(task: Promise<any>,
                  done: (error?: any) => void): void {
    task.then(() => {
      done();
    }, (error: any) => {
      done(error || new Error('PDF lifecycle test failed'));
    });
  }

  function expectRejected(
    task: Promise<Unarchiver.Content>,
    expected?: string
  ): Promise<void> {
    return task.then<void>(
      (): void => {
        throw new Error('Expected rejection');
      },
      (error: any): void => {
        if (expected) {
          assert.strictEqual(error, expected);
        } else {
          assert(error);
        }
      }
    );
  }

  it('shares simultaneous requests for the same page', (done) => {
    var name = unarchiver.filenames()[0];

    var first = unarchiver.unpack(name);
    var second = unarchiver.unpack(name);
    var third = unarchiver.unpack(name);

    finish(
      Promise.all<Unarchiver.Content[]>([
        first, second, third
      ]).then((contents: Unarchiver.Content[]) => {
        assert(contents[0] instanceof HTMLCanvasElement);
        assert.strictEqual(contents[0], contents[1]);
        assert.strictEqual(contents[0], contents[2]);
      }),
      done
    );
  });

  it('returns distinct pages for simultaneous requests', (done) => {
    var names = unarchiver.filenames();

    finish(
      Promise.all<Unarchiver.Content[]>([
        unarchiver.unpack(names[0]),
        unarchiver.unpack(names[1])
      ]).then((contents: Unarchiver.Content[]) => {
        assert(contents[0] instanceof HTMLCanvasElement);
        assert(contents[1] instanceof HTMLCanvasElement);

        assert.notStrictEqual(contents[0], contents[1]);

        var first = <HTMLCanvasElement>contents[0];
        var second = <HTMLCanvasElement>contents[1];

        assert.notStrictEqual(
          first.toDataURL(),
          second.toDataURL()
        );
      }),
      done
    );
  });

  it('clears completed in-flight requests', (done) => {
    var name = unarchiver.filenames()[0];
    var previous: Unarchiver.Content;

    finish(
      unarchiver.unpack(name)
        .then((content: Unarchiver.Content) => {
          previous = content;
          return unarchiver.unpack(name);
        }).then((content: Unarchiver.Content) => {
          assert.notStrictEqual(previous, content);

          assert.strictEqual(
            (<HTMLCanvasElement>previous).toDataURL(),
            (<HTMLCanvasElement>content).toDataURL()
          );
        }),
      done
    );
  });

  it('rejects an invalid page name', (done) => {
    var name = 'nonexistent-page';

    finish(
      expectRejected(
        unarchiver.unpack(name),
        'invalid filename:' + name
      ),
      done
    );
  });

  it('allows valid requests after an invalid page name', (done) => {
    finish(
      expectRejected(
        unarchiver.unpack('nonexistent-page')
      ).then(() => {
        return unarchiver.unpack(
          unarchiver.filenames()[0]
        );
      }).then((content: Unarchiver.Content) => {
        assert(content instanceof HTMLCanvasElement);
      }),
      done
    );
  });

  it('rejects requests after close', (done) => {
    var name = unarchiver.filenames()[0];

    unarchiver.close();

    finish(
      expectRejected(
        unarchiver.unpack(name),
        'PDF is closed'
      ),
      done
    );
  });

  it('rejects queued requests when closed', (done) => {
    var names = unarchiver.filenames();

    var first = expectRejected(
      unarchiver.unpack(names[0])
    );

    var second = expectRejected(
      unarchiver.unpack(names[1])
    );

    unarchiver.close();

    finish(
      Promise.all<any>([first, second]),
      done
    );
  });

  it('allows repeated close calls', () => {
    unarchiver.close();
    unarchiver.close();
    unarchiver.close();
  });
});
