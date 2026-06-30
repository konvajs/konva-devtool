import type { InspectedPageBridge } from '../bridge/eval-bridge';
import '../inspected/window-contract';
import type { CanvasAttrs, CanvasBBox, CanvasTree, NodeHash, OverlayId } from '../shared/types';

type RuntimeMethod =
  | 'refresh'
  | 'hasCanvas'
  | 'getAttrs'
  | 'updateAttr'
  | 'getBBox'
  | 'showOverlay'
  | 'clearOverlay'
  | 'setMouseoverInspecting'
  | 'consoleNode'
  | 'dispose';

function callRuntime<TResult>(method: RuntimeMethod, args: unknown[]): TResult | undefined {
  const runtime = window.__KONVA_DEVTOOL__;
  const fn = runtime && runtime[method];

  if (typeof fn !== 'function') {
    return undefined;
  }

  return (fn as (...runtimeArgs: unknown[]) => TResult)(...args);
}

export interface RuntimeClient {
  install(): Promise<void>;
  refresh(): Promise<CanvasTree[]>;
  hasCanvas(hash: NodeHash): Promise<boolean>;
  getAttrs(hash: NodeHash): Promise<CanvasAttrs | undefined>;
  updateAttr(hash: NodeHash, name: string, value: unknown): Promise<void>;
  getBBox(hash: NodeHash): Promise<CanvasBBox>;
  showOverlay(hash: NodeHash, overlayId: OverlayId, color?: string): Promise<void>;
  clearOverlay(overlayId?: OverlayId): Promise<void>;
  setMouseoverInspecting(enabled: boolean): Promise<void>;
  consoleNode(hash: NodeHash, label?: string): Promise<void>;
}

function executeRuntime<TResult>(
  bridge: InspectedPageBridge,
  method: RuntimeMethod,
  args: unknown[] = []
): Promise<TResult | undefined> {
  return bridge.execute(callRuntime, [method, args] as const) as Promise<TResult | undefined>;
}

export function createRuntimeClient(bridge: InspectedPageBridge, loadRuntimeScript: () => Promise<string>): RuntimeClient {
  return {
    install: async () => {
      const source = await loadRuntimeScript();
      await bridge.evaluate<void>(source);
    },
    refresh: () => executeRuntime<CanvasTree[]>(bridge, 'refresh').then((result) => result ?? []),
    hasCanvas: (hash) => executeRuntime<boolean>(bridge, 'hasCanvas', [hash]).then(Boolean),
    getAttrs: (hash) => executeRuntime<CanvasAttrs>(bridge, 'getAttrs', [hash]),
    updateAttr: (hash, name, value) => executeRuntime<void>(bridge, 'updateAttr', [hash, name, value]).then(() => undefined),
    getBBox: (hash) => executeRuntime<CanvasBBox>(bridge, 'getBBox', [hash]).then((bbox) => {
      if (!bbox) {
        throw new Error(`No bbox returned for node ${hash}`);
      }
      return bbox;
    }),
    showOverlay: (hash, overlayId, color) =>
      executeRuntime<void>(bridge, 'showOverlay', [hash, overlayId, color]).then(() => undefined),
    clearOverlay: (overlayId) => executeRuntime<void>(bridge, 'clearOverlay', [overlayId]).then(() => undefined),
    setMouseoverInspecting: (enabled) =>
      executeRuntime<void>(bridge, 'setMouseoverInspecting', [enabled]).then(() => undefined),
    consoleNode: (hash, label) => executeRuntime<void>(bridge, 'consoleNode', [hash, label]).then(() => undefined),
  };
}
