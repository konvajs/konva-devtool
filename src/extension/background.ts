chrome.runtime.onMessage.addListener((request, sender) => {
  if (!request?.isKonva || !sender?.tab?.id) {
    return;
  }

  if (request.disabled) {
    chrome.action?.setIcon({
      tabId: sender.tab.id,
      path: 'icons/48-disabled.png',
    });
    return;
  }

  chrome.action?.setIcon({
    tabId: sender.tab.id,
    path: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
  });
});
