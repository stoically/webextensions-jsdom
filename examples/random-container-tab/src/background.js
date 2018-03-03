const createRandomContainer = async () => {
  const container = await browser.contextualIdentities.create({
    name: `Totally random container #${Math.floor(Math.random() * Math.floor(9000))}`,
    color: 'blue',
    icon: 'fingerprint'
  });
  await browser.storage.local.set({
    lastRandomContainer: container
  });
};

const createTabInLastRandomContainer = async () => {
  const {lastRandomContainer} = await browser.storage.local.get('lastRandomContainer');
  browser.tabs.create({
    cookieStoreId: lastRandomContainer.cookieStoreId
  });
};

browser.runtime.onMessage.addListener(async message => {
  switch (message.method) {
  case 'createRandomContainer':
    createRandomContainer();
    break;

  case 'createTabInLastRandomContainer':
    createTabInLastRandomContainer();
    break;
  }
});