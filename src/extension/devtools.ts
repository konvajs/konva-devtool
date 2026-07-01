let panelCreated = false;
let detectionInterval: number | undefined;

const KONVA_DETECTION_SCRIPT =
  '!!((window.__canvas_instances__ && window.__canvas_instances__.length) || (window.Konva && window.Konva.stages && window.Konva.stages.length))';

function updateActionIcon(disabled: boolean): void {
  chrome.runtime.sendMessage({
    isKonva: true,
    disabled,
  });
}

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

  panelCreated = true;

  if (detectionInterval) {
    window.clearInterval(detectionInterval);
    detectionInterval = undefined;
  }
}

function checkForKonva(): void {
  chrome.devtools.inspectedWindow.eval(KONVA_DETECTION_SCRIPT, (detected, exception) => {
    const isKonvaPage = Boolean(detected) && !exception;
    updateActionIcon(!isKonvaPage);

    if (isKonvaPage) {
      createPanel();
    }
  });
}

chrome.devtools.network.onNavigated.addListener(() => {
  checkForKonva();
});

checkForKonva();
detectionInterval = window.setInterval(checkForKonva, 1000);

export {};
