import { createEvalBridge } from '../bridge/eval-bridge';
import '../inspected/window-contract';
import { createDevtoolController } from '../panel/controller';
import { createRuntimeClient } from '../panel/runtime-client';
import { normalizeRuntimeEvent } from '../shared/type-guards';
import type { ExtensionRuntimeMessage, RuntimeEvent } from '../shared/types';
import { mountDevtool } from '../ui';
import { shouldReinstallRuntimeForTabUpdate } from './panel-lifecycle';

const bridge = createEvalBridge(chrome.devtools.inspectedWindow);
const runtimeClient = createRuntimeClient(bridge, async () => {
  const response = await fetch(chrome.runtime.getURL('scripts/inspected-runtime.js'));
  return response.text();
});
const controller = createDevtoolController(runtimeClient);
const runtimeEvents = {
  subscribe(handler: (event: RuntimeEvent) => void): () => void {
    const chromeHandler = (message: ExtensionRuntimeMessage) => {
      const event = normalizeRuntimeEvent(message);

      if (event) {
        handler(event);
      }
    };

    chrome.runtime.onMessage.addListener(chromeHandler);
    return () => chrome.runtime.onMessage.removeListener(chromeHandler);
  },
};

async function mount(): Promise<void> {
  const data = await controller.getInitialData();
  const container = document.getElementById('container');

  if (!container) {
    throw new Error('Konva DevTool panel container was not found');
  }

  mountDevtool(container, data, controller.actions, runtimeEvents);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!shouldReinstallRuntimeForTabUpdate(chrome.devtools.inspectedWindow.tabId, tabId, changeInfo)) {
    return;
  }

  void bridge.execute(() => window.__KONVA_DEVTOOL__?.dispose(), [] as const).finally(() => {
    void runtimeClient.install();
  });
});

void mount();
