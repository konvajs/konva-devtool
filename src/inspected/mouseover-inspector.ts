import type { CanvasBBox, NodeHash } from '../shared/types';
import type { KonvaIndex } from './konva-index';
import type { KonvaLikeNode } from './konva-types';
import { clearOverlay, showOverlay } from './overlay';

interface MouseoverInspectorOptions {
  index: KonvaIndex;
  getCanvasRoot(): Element | null;
  dispatchShapeSelected(canvasHash: NodeHash, nodeHash: NodeHash): void;
}

function containsPoint(bbox: CanvasBBox, x: number, y: number): boolean {
  return (
    bbox.x <= x &&
    bbox.x + bbox.width * bbox.scale.x >= x &&
    bbox.y <= y &&
    bbox.y + bbox.height * bbox.scale.y >= y
  );
}

function visit(node: KonvaLikeNode, visitor: (node: KonvaLikeNode) => void): void {
  visitor(node);
  node.getChildren?.().forEach((child) => visit(child, visitor));
}

export function createMouseoverInspector(options: MouseoverInspectorOptions): {
  setEnabled(enabled: boolean): void;
  dispose(): void;
} {
  let enabled = false;
  let lastNode: KonvaLikeNode | undefined;
  let clickHandler: (() => void) | undefined;

  function removeClickHandler(): void {
    if (clickHandler) {
      window.removeEventListener('click', clickHandler);
      clickHandler = undefined;
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const canvasRoot = options.getCanvasRoot();

    if (!canvasRoot) {
      return;
    }

    const rootRect = canvasRoot.getBoundingClientRect();
    const x = event.clientX - rootRect.x;
    const y = event.clientY - rootRect.y;
    const matches: KonvaLikeNode[] = [];

    options.index.refresh().forEach((canvas) => {
      const canvasNode = options.index.getNode(canvas.hash);
      if (!canvasNode) {
        return;
      }
      visit(canvasNode, (node) => {
        if (node.nodeType !== 'Shape' || !node.__dev_hash) {
          return;
        }
        const bbox = options.index.getBBox(node.__dev_hash);
        if (containsPoint(bbox, x, y)) {
          matches.push(node);
        }
      });
    });

    const nextNode = matches.sort((left, right) => {
      const leftSize = (left.width?.() ?? 0) + (left.height?.() ?? 0);
      const rightSize = (right.width?.() ?? 0) + (right.height?.() ?? 0);
      return leftSize - rightSize;
    })[0];

    if (!nextNode || nextNode === lastNode || !nextNode.__dev_hash || !nextNode.ancestor) {
      return;
    }

    clearOverlay('__hover__');
    removeClickHandler();
    showOverlay(options.index.getBBox(nextNode.__dev_hash), '__hover__');
    clickHandler = () => options.dispatchShapeSelected(nextNode.ancestor as NodeHash, nextNode.__dev_hash as NodeHash);
    window.addEventListener('click', clickHandler);
    lastNode = nextNode;
  }

  function setEnabled(nextEnabled: boolean): void {
    if (enabled === nextEnabled) {
      return;
    }

    enabled = nextEnabled;

    if (enabled) {
      window.addEventListener('mousemove', onMouseMove);
    } else {
      clearOverlay('__hover__');
      removeClickHandler();
      window.removeEventListener('mousemove', onMouseMove);
      lastNode = undefined;
    }
  }

  return {
    setEnabled,
    dispose() {
      setEnabled(false);
    },
  };
}
