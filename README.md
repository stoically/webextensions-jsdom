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

Based on what's given in your `manifest.json` this will create JSDOM instances with stubbed `browser` and load popup and/or background in it.

The resolved return value is an `<object>` with several properties:

* *background* `<object>`, with properties `dom`, `window`, `document`, `browser` and `destroy` (If background page or scripts are defined in the manifest)
* *popup* `<object>`, with properties `dom`, `window`, `document`, `browser` and `destroy` (If browserAction with default_popup is defined in the manifest)
* *destroy* `<function>`, shortcut to `background.destroy` and `popup.destroy`

`dom` is a new JSDOM instance. `window` is a shortcut to `dom.window`. `document` is a shortcut to `dom.window.document`. `browser` is a new `sinon-chrome/webextensions` instance that is also exposed on `dom.window.browser`. And `destroy` is a function to clean up. More infos in the [API docs](#api).

If you expose variables in your code on `window`, you can access them now, or trigger registered listeners by e.g. `browser.webRequest.onBeforeRequest.addListener.yield([arguments])`.


#### Chrome Extensions

Chrome Extensions are also supported. Just instruct WebExtensions JSDOM to create a `sinon-chrome/extensions` stub instead by passing `api: 'chrome'` to the options:

```js
await webExtensionsJSDOM.fromManifest('/absolute/path/to/manifest.json', {api: 'chrome'});
```

You get the same results but can use `chrome` instead of `browser`. However, the examples shown here are geared towards WebExtensions and use async/await syntax.

Note: You can't use the [Automatic wiring](#automatic-wiring) or [API Fake](#api-fake) with the chrome api (yet).


### Automatic wiring

If popup *and* background are defined and loaded then `runtime.sendMessage` in the popup is automatically wired with `runtime.onMessage` in the background if you pass the `wiring: true` option. That makes it possible to e.g. "click" elements in the popup and then check if the background was called accordingly, making it ideal for feature-testing.

```js
await webExtensionsJSDOM.fromManifest('/absolute/path/to/manifest.json', {wiring: true});
```


### API Fake

Passing `apiFake: true` in the options to `fromManifest` automatically applies [`webextensions-api-fake`](https://github.com/stoically/webextensions-api-fake) to the `browser` stubs. It will imitate some of the WebExtensions API behavior (like an in-memory `storage`), so you don't have to manually define behavior. This is especially useful when feature-testing.

```js
await webExtensionsJSDOM.fromManifest('/absolute/path/to/manifest.json', {apiFake: true});
```


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
    webExtension = await webExtensionsJSDOM.fromManifest(manifestPath, {wiring: true});
  });

  describe('Clicking in the popup', () => {
    beforeEach(async () => {
      await webExtension.popup.document.getElementById('doSomethingUseful').click();
    });

    it('should call the background', async () => {
      expect(webExtension.background.browser.onMessage.addListener).to.have.been.calledWithMatch({
        method: 'usefulMessage'
      });
    });
  });

  afterEach(async () => {
    await webExtension.destroy();
  })
});
```

There's a fully functional example in [`examples/random-container-tab`](examples/random-container-tab).



### API

#### Exported function fromManifest(path[, options])

* *path* `<string>`, required, absolute path to the `manifest.json` file
* *options* `<object>`, optional
  * *background* `<object|false>` optional, if `false` is given background wont be loaded
    * *jsdom* `<object>`, optional, this will set all given properties as [options for the JSDOM constructor](https://github.com/jsdom/jsdom#customizing-jsdom), an useful example might be [`beforeParse(window)`](https://github.com/jsdom/jsdom#intervening-before-parsing). Note: You can't set `resources` or `runScripts`.
    * *afterBuild(background)* `<function>` optional, executed directly after the background dom is build (might be useful to do things before the popup dom starts building)
  * *popup* `<object|false>` optional, if `false` is given popup wont be loaded
    * *jsdom* `<object>`, optional, this will set all given properties as [options for the JSDOM constructor](https://github.com/jsdom/jsdom#customizing-jsdom), an useful example might be [`beforeParse(window)`](https://github.com/jsdom/jsdom#intervening-before-parsing). Note: You can't set `resources` or `runScripts`.
    * *afterBuild(popup)* `<function>` optional, executed after the popup dom is build
  * *api* `<string>`, optional, if `chrome` is given it will create a `sinon-chrome/extensions` stub instead
  * *apiFake* `<boolean>` optional, if `true` automatically applies [API fakes](#api-fake) to the `browser` using [`webextensions-api-fake`](https://github.com/stoically/webextensions-api-fake)
  * *wiring* `<boolean>` optional, if `true` the [automatic wiring](#automatic-wiring) is enabled
  * *sinon* `<object>`, optional, a sinon instance, if given `sinon-chrome` will use it to create the stub. useful if you run into [problems with `sinon.match`](https://github.com/acvetkov/sinon-chrome/issues/67#issuecomment-370255632)


Returns a Promise that resolves with an object in case of success:

* *background* `<object>`
  * *dom* `<object>` the JSDOM object
  * *window* `<object>` shortcut to `dom.window`
  * *document* `<object>` shortcut to `dom.window.document`
  * *browser* `<object>` stubbed `browser` using `sinon-chrome/webextensions`
  * *destroy* `<function>` destroy the `dom` and potentially write coverage data if executed with `nyc`. Returns a Promise that resolves if destroying is done.

* *popup* `<object>`
  * *dom* `<object>` the JSDOM object
  * *window* `<object>` shortcut to `dom.window`
  * *document* `<object>` shortcut to `dom.window.document`
  * *browser* `<object>` stubbed `browser` using `sinon-chrome/webextensions`
  * *destroy* `<function>` destroy the `dom` and potentially write coverage data if executed with `nyc`. Returns a Promise that resolves if destroying is done.
  * *helper* `<object>`
    * *clickElementById(id)* `<function>` shortcut for `dom.window.document.getElementById(id).click();`, returns a promise

* *destroy* `<function>`, shortcut to call `background.destroy` and `popup.destroy`. Returns a Promise that resolves if destroying is done.
