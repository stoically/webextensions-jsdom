### WebExtensions JSDOM

When testing [WebExtensions](https://developer.mozilla.org/Add-ons/WebExtensions) you might want to test your browserAction popup or background page/scripts inside [JSDOM](https://github.com/jsdom/jsdom). This package lets you easily load popup and background in JSDOM and with that makes it possible to e.g. click elements in the popup and then check if the background was called accordingly. `runtime.sendMessage` in the popup is automatically wired with `runtime.onMessage` in the background. Loading only popup or background is also possible.

Loading popup or background in JSDOM will automatically stub `window.browser` with [`sinon-chrome/webextensions`](https://github.com/acvetkov/sinon-chrome). [If you want](#api) you can also automatically fake the `browser` API using [`webextensions-api-fake`](https://github.com/stoically/webextensions-api-fake).


### Installation

```
npm install --save-dev webextensions-jsdom
```

### Usage

```js
const webExtensionsJSDOM = require('webextensions-jsdom');
const webExtension = await webExtensionsJSDOM.fromManifest('/path/to/manifest.json');
```

Given your `manifest.json` has a default_popup and background page or scripts, `webExtension` now has two properties:

`background`: with properties `browser` , `dom` and `destroy`  
`popup`: with properties `browser`, `dom` and `destroy`  

`browser` is a new `sinon-chrome/webextensions` instance that is also exposed on `window.browser`. `dom` is a JSDOM instance. `destroy` is a function to clean up and maybe generate coverage. More infos in the [API Docs](#api).


### Code Coverage

Code coverage with [nyc / istanbul](https://istanbul.js.org/) is supported if you execute the test using `webextensions-jsdom` with `nyc`. To get coverage-output you need to call the exposed `destroy` function after the `webExtension.background` and/or `webExtension.popup` and the attached JSDOMs are no longer needed. This should ideally be after each test.

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
      expect(webExtension.background.browser.onMessage.addListener).to.have.been.calledWithMatch({
        method: 'usefulMessage'
      });
    });
  });
});
```

You can find a fully functional example in [`examples/random-container-tab`](examples/random-container-tab).



### API

#### Exported function fromManifest(path[, options])

* *path* `<string>`, required, path to the directory where the `manifest.json` is located in
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

