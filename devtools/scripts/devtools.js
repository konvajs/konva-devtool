let a=!1,n;const i="!!((window.__canvas_instances__ && window.__canvas_instances__.length) || (window.Konva && window.Konva.stages && window.Konva.stages.length))";function c(e){chrome.runtime.sendMessage({isKonva:!0,disabled:e})}function d(){chrome.devtools.inspectedWindow.eval(`
    (function() {
      var elements = document.getElementsByClassName('konva_devtool_rect');
      [].forEach.apply(elements, [function (e) { e.remove(); }]);
      if (window.__KONVA_DEVTOOL__) {
        window.__KONVA_DEVTOOL__.clearOverlay();
        window.__KONVA_DEVTOOL__.setMouseoverInspecting(false);
      }
    })()
  `)}function l(){a||(chrome.devtools.panels.create("Konva DevTool","icons/32.png","panel.html",e=>{e.onHidden.addListener(d)}),a=!0,n&&(window.clearInterval(n),n=void 0))}function o(){chrome.devtools.inspectedWindow.eval(i,(e,s)=>{const t=Boolean(e)&&!s;c(!t),t&&l()})}chrome.devtools.network.onNavigated.addListener(()=>{o()});o();n=window.setInterval(o,1e3);
