import Backbone = require('backbone');

export = MenuSetting;

class MenuSetting extends Backbone.Model {
  constructor() {
    super();
    ['showFile', 'showDropbox', 'showGoogleDrive'].forEach((name: string) => {
      var visible = true;
      try {
        visible = window.localStorage.getItem('comicbed.menu.' + name) !== 'false';
      } catch (error) {
        // Use the default if browser storage is unavailable.
      }
      this.set(name, visible);
    });
  }

  isVisible(name: string): boolean {
    return this.get(name) !== false;
  }

  setVisible(name: string, visible: boolean): void {
    try {
      window.localStorage.setItem('comicbed.menu.' + name, String(visible));
    } catch (error) {
      // The setting still applies to the current view.
    }
    this.set(name, visible);
  }
}
