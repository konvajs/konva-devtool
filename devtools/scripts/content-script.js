function o(e){window.addEventListener(e,n=>{chrome.runtime.sendMessage({type:e,detail:n instanceof CustomEvent?n.detail:void 0})})}o("showShape");o("closeHover");
