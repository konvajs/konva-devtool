import type { CanvasTree, NodeHash, OverlayId } from '../shared/types';
import type { DevtoolActions } from './devtool-actions';
import type { RuntimeClient } from './runtime-client';

export interface DevtoolController {
  actions: DevtoolActions;
  getInitialData(): Promise<CanvasTree[]>;
}

export function createDevtoolController(runtimeClient: RuntimeClient): DevtoolController {
  const actions: DevtoolActions = {
    refreshCanvases: () => runtimeClient.refresh(),
    async checkCanvasAlive(hash: NodeHash) {
      const alive = await runtimeClient.hasCanvas(hash);

      if (!alive) {
        await runtimeClient.refresh();
      }

      return alive;
    },
    showRect: (hash: NodeHash, overlayId: OverlayId, color?: string) => runtimeClient.showOverlay(hash, overlayId, color),
    clearRect: (overlayId?: OverlayId) => runtimeClient.clearOverlay(overlayId),
    getAttrs: (hash: NodeHash) => runtimeClient.getAttrs(hash),
    updateAttr: (hash: NodeHash, name: string, value: unknown) => runtimeClient.updateAttr(hash, name, value),
    consoleElement: (hash: NodeHash, label?: string) => runtimeClient.consoleNode(hash, label),
    setMouseoverInspecting: (enabled: boolean) => runtimeClient.setMouseoverInspecting(enabled),
  };

  return {
    actions,
    async getInitialData() {
      await runtimeClient.install();
      return runtimeClient.refresh();
    },
  };
}
