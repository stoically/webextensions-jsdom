document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('createRandomContainer').addEventListener('click', () => {
    browser.runtime.sendMessage({
      method: 'createRandomContainer'
    });
  });
  document.getElementById('createTabInLastRandomContainer').addEventListener('click', () => {
    browser.runtime.sendMessage({
      method: 'createTabInLastRandomContainer'
    });
  });
});