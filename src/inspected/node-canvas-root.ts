import type { KonvaLikeNode } from './konva-types';

function getKonvaContent(container: Element): Element {
  if (container.classList.contains('konvajs-content')) {
    return container;
  }

  const directChild = Array.from(container.children).find((child) => child.classList.contains('konvajs-content'));
  return directChild ?? container.querySelector('.konvajs-content') ?? container;
}

export function getNodeCanvasRoot(node: KonvaLikeNode | undefined, fallback?: Element | null): Element | null {
  const stageContainer = node?.getStage?.()?.container?.() ?? node?.container?.();

  if (stageContainer) {
    return getKonvaContent(stageContainer);
  }

  return fallback ?? null;
}
