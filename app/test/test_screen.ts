import Promise = require('promise');
import Screen = require('models/screen');
import Page = require('models/page');
import Pages = require('collections/pages');
import Scaler = require('models/scaler');

var assert = chai.assert;
declare var sinon: any;

describe('Screen', () => {
  var mocks: any[] = [];

  function createMock(target: any): any {
    var mock = sinon.mock(target);
    mocks.push(mock);
    return mock;
  }

  afterEach(() => {
    mocks.forEach((mock: any) => {
      mock.restore();
    });
    mocks = [];
  });

  function assertScreenContent(
    screen: Screen.Screen,
    expected: Page.Content[]
  ): void {
    var content = screen.content();

    assert.strictEqual(content.nodeType, 11);
    assert.strictEqual(
      content.childNodes.length, expected.length
    );

    expected.forEach((page: Page.Content, i: number) => {
      assert.strictEqual(content.childNodes[i], page);
    });
  }

  var builder: Scaler.Scaler = {
    scale: (pages: Page.Content[], params: Scaler.ScaleParams) => <any>undefined
  };
  var size = { width: 640, height: 480 };
  var pageContents = [ new Image(), new Image(), new Image(), new Image(), new Image(), ];
  var pages: Pages.Collection = {
    length: pageContents.length,
    at: (i: number) => {
      return {
        name: () => 'page',
        pageNum: () => i + 1,
        content: () => Promise.fulfilled(pageContents[i]),
      };
    }
  };

  describe('the update method', () => {
    var setting: Screen.Setting = <Screen.Setting><any>{
      detectsSpreadPage: () => true,
      viewMode: () => Screen.ViewMode.TwoPage,
      isSpreadPage: (content: Page.Content) => false,
      pageDirection: () => Screen.PageDirection.R2L,
    };
    it('makes the status Screen.Status.Success', (done) => {
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => {
        assert.strictEqual(Screen.Status.Success, screen.status());
        done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('makes the status Screen.Status.Error when first page.content() failed', (done) => {
      var mock = createMock(pages);
      mock.expects('at').atLeast(1).withExactArgs(0).returns({
        name: () => 'page',
        pageNum: () => 0,
        content: () => Promise.rejected(null),
      });
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => {
        assert.strictEqual(Screen.Status.Error, screen.status());
        assert.strictEqual(1, screen.pages().length);
        mock.verify();
        done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 1 if second page.content() failed', (done) => {
      var first = true;
      var pages: Pages.Collection = {
        length: pageContents.length,
        at: (i: number) => {
          return {
            name: () => 'page',
            pageNum: () => i + 1,
            content: () => {
              if (first) {
                first = false;
                return Promise.fulfilled(pageContents[i]);
              }
              return Promise.rejected<Page.Content>(null);
            }
          }
        }
      };
      var mock = createMock(builder);
      mock.expects('scale').once().withArgs([pageContents[0]], size);
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => {
        assert.strictEqual(Screen.Status.Interrupted, screen.status());
        assertScreenContent(screen, [pageContents[0]]);
        assert.strictEqual(1, screen.pages().length);
        mock.verify();
        done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
  });

  describe('the resize function', () => {
    it('call builder.build with same PageContent[] and new size', (done) => {
      var mock = createMock(builder);
      var setting: Screen.Setting = <Screen.Setting><any>{
        detectsSpreadPage: () => false,
        viewMode: () => Screen.ViewMode.OnePage,
        isSpreadPage: (content: Page.Content) => false,
        pageDirection: () => Screen.PageDirection.R2L,
      };
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => {
        mock.expects('scale').once().withArgs([pageContents[0]], {width: 1280, height: 960});
        screen.resize(1280, 960);
        mock.verify();
        done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
  });

  describe('the update function, when viewMode is OnePage', () => {
    var setting: Screen.Setting = <Screen.Setting><any>{
      detectsSpreadPage: () => true,
      viewMode: () => Screen.ViewMode.OnePage,
      isSpreadPage: (content: Page.Content) => true,
      pageDirection: () => Screen.PageDirection.R2L,
    };
    it('should not call setting.isSpreadPage function', (done) => {
      var mock = createMock(setting);
      mock.expects('isSpreadPage').never();
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builer.build with pages whose length equals to 1', (done) => {
      var mock = createMock(builder);
      mock.expects('scale').once().withArgs([pageContents[0]], size);
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => {
        assertScreenContent(screen, [pageContents[0]]);
        mock.verify();
        done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
  });
  describe('the update function, when viewMode is TwoPage, detectsSpreadPage is false', () => {
    var setting: Screen.Setting = <Screen.Setting><any>{
      detectsSpreadPage: () => false,
      viewMode: () => Screen.ViewMode.TwoPage,
      isSpreadPage: (content: Page.Content) => true,
      pageDirection: () => Screen.PageDirection.R2L,
    };
    it('should not call setting.isSpreadPage function', (done) => {
      var mock = createMock(setting);
      mock.expects('isSpreadPage').never();
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0, 
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 1 if the update with last page and read forward', (done) => {
      var len = pages.length;
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[len - 1]], size);
      screen.update(pages, {
        currentPageNum: len - 1,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 2 if the update with last page and read backward', (done) => {
      var len = pages.length;
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[len - 2], pageContents[len - 1]], size);
      screen.update(pages, {
        currentPageNum: len - 1,
        readingDirection: Screen.ReadingDirection.Backward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 2 if the update with first page and read forward', (done) => {
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[0], pageContents[1]], size);
      screen.update(pages, { currentPageNum: 0, totalPageNum: pages.length,
                             readingDirection: Screen.ReadingDirection.Forward})
        .then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 1 if the update with first page and read backward', (done) => {
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[0]], size);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Backward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
  });
  describe('the update function, when viewMode is TwoPage, detectsSpreadPage is true', () => {
    var setting: Screen.Setting = <Screen.Setting><any>{
      detectsSpreadPage: () => true,
      viewMode: () => Screen.ViewMode.TwoPage,
      isSpreadPage: (content: Page.Content) => true,
      pageDirection: () => Screen.PageDirection.R2L,
    };
    it('should call once setting.isSpreadPage function if isSpreadPage returns true', (done) => {
      var mock = createMock(setting);
      mock.expects('isSpreadPage').once().returns(true);
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('should call twice setting.isSpreadPage function if isSpreadPage returns false', (done) => {
      var mock = createMock(setting);
      mock.expects('isSpreadPage').twice().returns(false);
      var screen = Screen.createScreen(size, builder, setting);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 1 if the isSpreadPage returns true', (done) => {
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[0]], size);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 1 if the isSpreadPage returns true for second page', (done) => {
      var first = true;
      var setting: Screen.Setting = <Screen.Setting><any>{
        detectsSpreadPage: () => true,
        viewMode: () => Screen.ViewMode.TwoPage,
        isSpreadPage: (content: Page.Content) => {
          if (first) {
            first = false;
            return false;
          }
          return true;
        },
        pageDirection: () => Screen.PageDirection.R2L,
      };
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[0]], size);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
    it('calls builder.build with pages.length === 2 if the isSpreadPage returns false', (done) => {
      var first = true;
      var setting: Screen.Setting = <Screen.Setting><any>{
        detectsSpreadPage: () => true,
        viewMode: () => Screen.ViewMode.TwoPage,
        isSpreadPage: (content: Page.Content) => false,
        pageDirection: () => Screen.PageDirection.R2L,
      };
      var mock = createMock(builder);
      var screen = Screen.createScreen(size, builder, setting);
      mock.expects('scale').once().withArgs([pageContents[0], pageContents[1]], size);
      screen.update(pages, {
        currentPageNum: 0,
        readingDirection: Screen.ReadingDirection.Forward
      }).then(() => { mock.verify(); done();
      }).catch((error: any) => {
        done(error || new Error('Screen test failed'));
      });
    });
  });
});

