const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const {WebExtensionsApiFake} = require('webextensions-api-fake');

const nextTick = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      process.nextTick(resolve);
    });
  });
};

class WebExtensionsJSDOM {
  constructor() {
    this.webExtensionsApiFake = new WebExtensionsApiFake;
    this.webExtension = {
      nextTick
    };
  }

  async buildDom(options = {}) {
    const jsdomOptions = Object.assign({
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole: (new jsdom.VirtualConsole).sendTo(console)
    }, options);

    const dom = await jsdom.JSDOM.fromFile(options.path, jsdomOptions);

    await new Promise(resolve => {
      dom.window.document.addEventListener('DOMContentLoaded', resolve);
    });
    await nextTick();

    return dom;
  }

  async buildBackground(backgroundPath, options = {}) {
    const browser = this.webExtensionsApiFake.createBrowser();
    const that = this;
    browser.contextMenus = browser.menus;
    const dom = await this.buildDom({
      path: backgroundPath,
      beforeParse(window) {
        window.browser = browser;
        that.webExtensionsApiFake.fakeApi(window.browser);

        if (options && options.beforeParse) {
          options.beforeParse(window);
        }
      }
    });
    this.webExtension.background = {
      browser,
      dom,
      document: dom.window.document
    };
    if (options && options.afterBuild) {
      await options.afterBuild(this.webExtension.background);
    }
    return this.webExtension.background;
  }

  async buildPopup(popupPath, options = {}) {
    const browser = this.webExtensionsApiFake.createBrowser();
    const that = this;
    browser.contextMenus = browser.menus;
    const dom = await this.buildDom({
      path: popupPath,
      beforeParse(window) {
        window.browser = browser;
        that.webExtensionsApiFake.fakeApi(window.browser);

        if (that.webExtension.background) {
          window.browser.runtime.sendMessage.callsFake(function() {
            const [result] = that.webExtension.background.browser.runtime.onMessage.addListener.yield(...arguments);
            return result;
          });
        }

        if (options && options.beforeParse) {
          options.beforeParse(window);
        }
      }
    });
    const helper = {
      async clickElementById(id) {
        dom.window.document.getElementById(id).click();
        await nextTick();
      }
    };
    this.webExtension.popup = {
      browser,
      dom,
      document: dom.window.document,
      helper
    };
    if (options && options.afterBuild) {
      await options.afterBuild(this.webExtension.popup);
    }
    return this.webExtension.popup;
  }
}

const fromManifest = async (manifestPath, options = {}) => {
  const webExtensionJSDOM = new WebExtensionsJSDOM;
  const manifestFilePath = path.resolve(manifestPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFilePath));

  const webExtension = {};
  if ((typeof options.background === 'undefined' || options.background) &&
      manifest.background && manifest.background.page) {
    const backgroundPath = path.resolve(manifestPath, manifest.background.page);
    webExtension.background = await webExtensionJSDOM.buildBackground(backgroundPath, options.background);
  }

  if ((typeof options.popup === 'undefined' || options.popup) &&
      manifest.browser_action && manifest.browser_action.default_popup) {
    const popupPath = path.resolve(manifestPath, manifest.browser_action.default_popup);
    webExtension.popup = await webExtensionJSDOM.buildPopup(popupPath, options.popup);
  }

  return webExtension;
};

module.exports = {
  fromManifest,
  WebExtensionsJSDOM
};