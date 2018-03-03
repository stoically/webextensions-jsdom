### WebExtensions JSDOM

When testing [WebExtensions](https://developer.mozilla.org/Add-ons/WebExtensions) you might want to test your browserAction popup or background inside [JSDOM](https://github.com/jsdom/jsdom). This package lets you easily load popup and background in JSDOM and with that makes it possible to e.g. click elements in the popup and then check if the background was called accordingly. `runtime.sendMessage` in the popup is automatically wired with `runtime.onMessage` in the background. Loading only popup or background is also possible.

Loading popup or background in JSDOM will automatically stub and fake `window.browser` with [`webextensions-api-fake`](https://github.com/stoically/webextensions-api-fake), which is based on [`sinon-chrome/webextensions`](https://github.com/acvetkov/sinon-chrome).


### Installation

```
npm install --save-dev webextensions-jsdom
```

### Usage

```js
const webExtensionsJSDOM = require('webextensions-jsdom');
const webExtension = await webExtensionsJSDOM.fromManifest('/path/to/manifest/directory');
```

Given your `manifest.json` has a default_popup and background page `webExtension` now has two properties:

`webExtension.background`: with `browser` and `dom`  
`webExtension.popup`: with `browser` and `dom`



#### Example

In your `manifest.json` you have popup and background defined:

```json
{
  "browser_action": {
    "default_popup": "popup.html"
  },

  "background": {
    "page": "background.html"
  }
}
```

In your `popup.js` loaded from `popup.html` you have something like this:

```js
document.getElementById('doSomethingUseful').addEventListener('click', () => {
  browser.runtime.sendMessage({
    method: 'usefulMessage'
  });
});
```

and in your `background.js` loaded from the `background.html`

```js
browser.runtime.onMessage.addListener(message => {
  // do something useful with the message
});
```

To test this with `webextensions-jsdom` you can do (using `mocha`, `chai` and `sinon-chai` in this case):

```js
const path = require('path');
const sinonChai = require('sinon-chai');
const chai = require('chai');
chai.should();
chai.use(sinonChai);

const webExtensionsJSDOM = require('webextensions-jsdom');
const manifestPath = path.resolve(__dirname);

describe('Example', () => {
  let webExtension;
  beforeEach(async () => {
    webExtension = await webExtensionsJSDOM.fromManifest(manifestPath);
  });

  describe('Clicking in the popup', () => {
    beforeEach(async () => {
      await webExtension.popup.helper.clickElementById('doSomethingUseful');
    });

    it('should call the background', async () => {
      webExtension.background.browser.onMessage.addListener.should.have.been.calledOnce;
    });
  });
});
```

You can find a fully functional example in `examples/random-container-tab`. Loading the `src/manifest.json` in Firefox using `about:debugging` or `web-ext` adds a toolbar icon, clicking it reveals a popup with two buttons. One to create a random container which you click first, after that click the button to create a tab in the last created random container and it'll open a tab accordingly. In `test/feature.test.js` you find a feature test which you can execute by doing

```
npm install
npm test
```



### API

#### Exported function fromManifest(path[, options])

* *path* `<string>`, required, path to the directory where the `manifest.json` is located in
* *options* `<object>`, optional
  * *background* `<object>` optional, if false is given background wont be loaded
    * *beforeParse(window)* `<function>` optional, JSDOM beforeParse function
    * *afterBuild(background)* `<function>` optional, executed after the dom is build
  * *popup* `<object>` optional, if false is given popup wont be loaded
    * *beforeParse(window)* `<function>` optional, JSDOM beforeParse function
    * *afterBuild(popup)* `<function>` optional, executed after the dom is build


Returns an object:

* *background* `<object>`
  * *dom* `<object>` the JSDOM object
  * *browser* `<object>` a stubbed with `sinon-chrome` and api-faked with `webextensions-api-fake` `browser` object

* *popup* `<object>`
  * *dom* `<object>` the JSDOM object
  * *browser* `<object>` a stubbed with `sinon-chrome` and api-faked with `webextensions-api-fake` `browser` object
  * *helper* `<object>`
    * *clickElementById(id)* `<function>` shortcut for `dom.window.document.getElementById(id).click();`, returns a promise