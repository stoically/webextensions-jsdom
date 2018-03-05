### WebExtensions JSDOM

When testing [WebExtensions](https://developer.mozilla.org/Add-ons/WebExtensions) you might want to test your browser_action default_popup or background page/scripts inside [JSDOM](https://github.com/jsdom/jsdom). This package lets you easily do exactly that with just one command. It will automatically stub `window.browser` with [`sinon-chrome/webextensions`](https://github.com/acvetkov/sinon-chrome).


### Installation

```
npm install --save-dev webextensions-jsdom
```

### Usage

```js
const webExtensionsJSDOM = require('webextensions-jsdom');
const webExtension = await webExtensionsJSDOM.fromManifest('/absolute/path/to/manifest.json');
```

Given your `manifest.json` has a browser_action default_popup and background page or scripts, `webExtension` now has two properties:

`background`: with properties `dom`, `browser` and `destroy`  
`popup`: with properties `dom`, `browser` and `destroy`  

`dom` is a new JSDOM instance. `browser` is a new `sinon-chrome/webextensions` instance that is also exposed on `dom.window.browser`. And `destroy` is a function to clean up. More infos in the [API Docs](#api).


### Automatic wiring

If popup *and* background are defined and loaded then `runtime.sendMessage` in the popup is automatically wired with `runtime.onMessage` in the background. That makes it possible to e.g. "click" elements in the popup and then check if the background was called accordingly, making it ideal for feature-testing.


### API Fake

There's an option to automatically apply [`webextensions-api-fake`](https://github.com/stoically/webextensions-api-fake) to the `browser` stubs. It will imitate some of the WebExtensions API behavior (like an in-memory `storage`), so you don't have to manually define behavior. This is especially useful when feature-testing.


### Code Coverage

Code coverage with [nyc / istanbul](https://istanbul.js.org/) is supported if you execute the test using `webextensions-jsdom` with `nyc`. To get coverage-output you need to call the exposed `destroy` function after the `background` and/or `popup` are no longer needed. This should ideally be after each test.

If you want to know how that's possible you can [check out this excellent article by @freaktechnik](https://humanoids.be/log/2017/10/code-coverage-reports-for-webextensions/).


### Example

In your `manifest.json` you have default_popup and background page defined:

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

*Note: "scripts" are supported too.*


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
const expect = chai.expect;
chai.use(sinonChai);

const webExtensionsJSDOM = require('webextensions-jsdom');
const manifestPath = path.resolve(path.join(__dirname, 'path/to/manifest.json'));

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
      expect(webExtension.background.browser.onMessage.addListener).to.have.been.calledWithMatch({
        method: 'usefulMessage'
      });
    });
  });
});
```

There's a fully functional example in [`examples/random-container-tab`](examples/random-container-tab).



### API

#### Exported function fromManifest(path[, options])

* *path* `<string>`, required, absolute path to the `manifest.json` file
* *options* `<object>`, optional
  * *apiFake* `<boolean>` optional, if true automatically applies API fakes to the `browser` using `webextensions-api-fake`
  * *background* `<object>` optional, if false is given background wont be loaded
    * *beforeParse(window)* `<function>` optional, JSDOM beforeParse function
    * *afterBuild(background)* `<function>` optional, executed after the dom is build
  * *popup* `<object>` optional, if false is given popup wont be loaded
    * *beforeParse(window)* `<function>` optional, JSDOM beforeParse function
    * *afterBuild(popup)* `<function>` optional, executed after the dom is build


Returns an Promise that resolves with an object in case of success:

* *background* `<object>`
  * *dom* `<object>` the JSDOM object
  * *browser* `<object>` stubbed `browser` using `sinon-chrome/webextensions`
  * *destroy* `<function>` destroy the `dom` and potentially write coverage data if executed with `nyc`

* *popup* `<object>`
  * *dom* `<object>` the JSDOM object
  * *browser* `<object>` stubbed `browser` using `sinon-chrome/webextensions`
  * *destroy* `<function>` destroy the `dom` and potentially write coverage data if executed with `nyc`
  * *helper* `<object>`
    * *clickElementById(id)* `<function>` shortcut for `dom.window.document.getElementById(id).click();`, returns a promise

