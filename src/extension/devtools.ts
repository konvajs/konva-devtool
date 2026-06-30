let panelCreated = false;
let detectionInterval: number | undefined;

function removePageOverlays(): void {
  chrome.devtools.inspectedWindow.eval(`
    (function() {
      var elements = document.getElementsByClassName('konva_devtool_rect');
      [].forEach.apply(elements, [function (e) { e.remove(); }]);
      if (window.__KONVA_DEVTOOL__) {
        window.__KONVA_DEVTOOL__.clearOverlay();
        window.__KONVA_DEVTOOL__.setMouseoverInspecting(false);
      }
    })()
  `);
}

function createPanel(): void {
  if (panelCreated) {
    return;
  }

  chrome.devtools.panels.create('Konva DevTool', 'icons/32.png', 'panel.html', (panel) => {
    panel.onHidden.addListener(removePageOverlays);
  });

  chrome.runtime.sendMessage({
    isKonva: true,
    disabled: false,
  });
  panelCreated = true;

  if (detectionInterval) {
    window.clearInterval(detectionInterval);
    detectionInterval = undefined;
  }
}

function checkForKonva(): void {
  chrome.devtools.inspectedWindow.eval(
    '!!((window.__canvas_instances__ && window.__canvas_instances__.length) || (window.Konva && window.Konva.stages && window.Konva.stages.length))',
    () => createPanel()
  );
}

chrome.devtools.network.onNavigated.addListener(() => {
  panelCreated = false;
  checkForKonva();
});

checkForKonva();
detectionInterval = window.setInterval(checkForKonva, 1000);
