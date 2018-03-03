const path = require('path');
const sinonChai = require('sinon-chai');
const chai = require('chai');
chai.should();
chai.use(sinonChai);

const webExtensionsJSDOM = require('webextensions-jsdom');
const manifestPath = path.resolve(path.join(__dirname, '../src'));

describe('Random Container Tab', () => {
  let webExtension;
  beforeEach(async () => {
    webExtension = await webExtensionsJSDOM.fromManifest(manifestPath, {apiFake: true});
  });

  describe('Clicking Create Random Container in the popup', () => {
    beforeEach(async () => {
      await webExtension.popup.helper.clickElementById('createRandomContainer');
    });

    it('should create a container in the browser', async () => {
      webExtension.background.browser.contextualIdentities.create.should.have.been.calledOnce;
    });

    describe('Then clicking Create Tab in last created Random Container', () => {
      beforeEach(async () => {
        await webExtension.popup.helper.clickElementById('createTabInLastRandomContainer');
      });

      it('should create a tab in the correct container', async () => {
        const createdRandomContainer = await webExtension.background.browser.contextualIdentities.create.firstCall.returnValue;
        webExtension.background.browser.tabs.create.should.have.been.calledWithMatch({
          cookieStoreId: createdRandomContainer.cookieStoreId
        });
      });
    });
  });
});