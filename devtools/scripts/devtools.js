let n=!1,e;function t(){chrome.devtools.inspectedWindow.eval(`
    (function() {
      var elements = document.getElementsByClassName('konva_devtool_rect');
      [].forEach.apply(elements, [function (e) { e.remove(); }]);
      if (window.__KONVA_DEVTOOL__) {
        window.__KONVA_DEVTOOL__.clearOverlay();
        window.__KONVA_DEVTOOL__.setMouseoverInspecting(false);
      }
    })()
  `)}function s(){n||(chrome.devtools.panels.create("Konva DevTool","icons/32.png","panel.html",a=>{a.onHidden.addListener(t)}),chrome.runtime.sendMessage({isKonva:!0,disabled:!1}),n=!0,e&&(window.clearInterval(e),e=void 0))}function o(){chrome.devtools.inspectedWindow.eval("!!((window.__canvas_instances__ && window.__canvas_instances__.length) || (window.Konva && window.Konva.stages && window.Konva.stages.length))",()=>s())}chrome.devtools.network.onNavigated.addListener(()=>{n=!1,o()});o();e=window.setInterval(o,1e3);
