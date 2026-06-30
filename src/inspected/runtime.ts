import type { CanvasAttrs, CanvasBBox, CanvasTree, NodeHash, OverlayId } from '../shared/types';
import { createKonvaIndex } from './konva-index';
import type { KonvaLikeNode } from './konva-types';
import { createMouseoverInspector } from './mouseover-inspector';
import { clearOverlay, showOverlay } from './overlay';
import './window-contract';

type RuntimeWindow = Window & {
  console: Console;
  CustomEvent: typeof CustomEvent;
};

export interface KonvaDevtoolRuntime {
  refresh(): CanvasTree[];
  hasCanvas(hash: NodeHash): boolean;
  getAttrs(hash: NodeHash): CanvasAttrs | undefined;
  updateAttr(hash: NodeHash, name: string, value: unknown): void;
  getBBox(hash: NodeHash): CanvasBBox;
  showOverlay(hash: NodeHash, overlayId: OverlayId, color?: string): void;
  clearOverlay(overlayId?: OverlayId): void;
  setMouseoverInspecting(enabled: boolean): void;
  consoleNode(hash: NodeHash, label?: string): void;
  dispose(): void;
}

function patchDestroyTracking(targetWindow: Window, node: KonvaLikeNode): void {
  if (!node.destroy || node.__konvaDevtoolDestroyPatched) {
    return;
  }

  const originDestroy = node.destroy;
  node.destroy = function destroyWithDevtoolTracking() {
    const result = originDestroy.call(this);
    const instances = targetWindow.__canvas_instances__;
    const index = instances?.findIndex((instance) => instance === this) ?? -1;
    if (instances && index > -1) {
      instances.splice(index, 1);
    }
    return result;
  };
  node.__konvaDevtoolDestroyPatched = true;
}

function discoverCanvasInstances(targetWindow: Window): KonvaLikeNode[] {
  if (targetWindow.__canvas_instances__?.length) {
    targetWindow.__canvas_instances__.forEach((instance) => patchDestroyTracking(targetWindow, instance));
    return targetWindow.__canvas_instances__;
  }

  const layers: KonvaLikeNode[] = [];
  targetWindow.Konva?.stages?.forEach((stage) => {
    const stageLayers = stage.getLayers?.() ?? stage.getChildren?.() ?? [];
    stageLayers.forEach((layer) => {
      patchDestroyTracking(targetWindow, layer);
      layers.push(layer);
    });
  });
  targetWindow.__canvas_instances__ = layers;
  return layers;
}

function getCanvasRoot(targetWindow: Window): Element | null {
  return targetWindow.__canvas_root__ ?? targetWindow.document.querySelector('.konvajs-content');
}

function getUsedHeapSize(targetWindow: Window): number | undefined {
  const performanceWithMemory = targetWindow.performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
    };
  };
  return performanceWithMemory.memory?.usedJSHeapSize;
}

export function installKonvaDevtoolRuntime(targetWindow: Window = window): KonvaDevtoolRuntime {
  if (targetWindow.__KONVA_DEVTOOL__) {
    return targetWindow.__KONVA_DEVTOOL__;
  }
  const runtimeWindow = targetWindow as RuntimeWindow;

  const index = createKonvaIndex({
    getCanvasInstances: () => discoverCanvasInstances(targetWindow),
    getPerformanceMemory: () => getUsedHeapSize(targetWindow),
    getFps: () => targetWindow.__fps_value,
    log: (label, node) => runtimeWindow.console.log(label, node),
  });

  const mouseoverInspector = createMouseoverInspector({
    index,
    getCanvasRoot: () => getCanvasRoot(targetWindow),
    dispatchShapeSelected: (canvasHash, nodeHash) => {
      targetWindow.dispatchEvent(
        new runtimeWindow.CustomEvent('showShape', {
          detail: {
            canvasHash,
            nodeHash,
          },
        })
      );
    },
  });

  const runtime: KonvaDevtoolRuntime = {
    refresh: () => index.refresh(),
    hasCanvas: (hash) => index.hasCanvas(hash),
    getAttrs: (hash) => index.getAttrs(hash),
    updateAttr: (hash, name, value) => index.updateAttr(hash, name, value),
    getBBox: (hash) => index.getBBox(hash),
    showOverlay: (hash, overlayId, color) => showOverlay(index.getBBox(hash), overlayId, color),
    clearOverlay: (overlayId) => clearOverlay(overlayId),
    setMouseoverInspecting: (enabled) => mouseoverInspector.setEnabled(enabled),
    consoleNode: (hash, label) => index.consoleNode(hash, label),
    dispose: () => {
      mouseoverInspector.dispose();
      clearOverlay();
    },
  };

  targetWindow.__KONVA_DEVTOOL__ = runtime;
  return runtime;
}
