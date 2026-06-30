import { createEvalBridge } from '../bridge/eval-bridge';
import '../inspected/window-contract';
import { createDevtoolController } from '../panel/controller';
import { createRuntimeClient } from '../panel/runtime-client';
import { mountDevtool } from '../ui';

const bridge = createEvalBridge(chrome.devtools.inspectedWindow);
const runtimeClient = createRuntimeClient(bridge, async () => {
  const response = await fetch(chrome.runtime.getURL('scripts/inspected-runtime.js'));
  return response.text();
});
const controller = createDevtoolController(runtimeClient);

async function mount(): Promise<void> {
  const data = await controller.getInitialData();
  const container = document.getElementById('container');

  if (!container) {
    throw new Error('Konva DevTool panel container was not found');
  }

  mountDevtool(container, data, controller.actions);
}

chrome.tabs.onUpdated.addListener(() => {
  void bridge.execute(() => window.__KONVA_DEVTOOL__?.dispose(), [] as const).finally(() => {
    void runtimeClient.install();
  });
});

void mount();
