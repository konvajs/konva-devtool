function forwardWindowEvent(type: 'showShape' | 'closeHover'): void {
  window.addEventListener(type, (event) => {
    chrome.runtime.sendMessage({
      type,
      detail: event instanceof CustomEvent ? event.detail : undefined,
    });
  });
}

forwardWindowEvent('showShape');
forwardWindowEvent('closeHover');
