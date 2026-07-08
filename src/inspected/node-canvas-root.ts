import type { KonvaContainer, KonvaLikeNode } from './konva-types';

const KONVA_CONTENT_SELECTOR = '.konvajs-content';

function isElement(container: KonvaContainer): container is Element {
  return container.nodeType === Node.ELEMENT_NODE;
}

function isShadowRoot(container: KonvaContainer): container is ShadowRoot {
  return container.nodeType === Node.DOCUMENT_FRAGMENT_NODE && 'host' in container;
}

function getKonvaContent(container: KonvaContainer): Element {
  if (isElement(container) && container.classList.contains('konvajs-content')) {
    return container;
  }

  const directChild = Array.from(container.children).find((child) => child.classList.contains('konvajs-content'));
  if (directChild) {
    return directChild;
  }

  const nestedContent = container.querySelector(KONVA_CONTENT_SELECTOR);
  if (nestedContent) {
    return nestedContent;
  }

  return isShadowRoot(container) ? container.host : container;
}

function findKonvaContent(root: Document | ShadowRoot): Element | null {
  const lightDomContent = root.querySelector(KONVA_CONTENT_SELECTOR);
  if (lightDomContent) {
    return lightDomContent;
  }

  for (const element of Array.from(root.querySelectorAll('*'))) {
    const shadowRoot = element.shadowRoot;
    if (!shadowRoot) {
      continue;
    }

    const shadowContent = findKonvaContent(shadowRoot);
    if (shadowContent) {
      return shadowContent;
    }
  }

  return null;
}

export function getCanvasRoot(targetWindow: Window = window): Element | null {
  return targetWindow.__canvas_root__ ?? findKonvaContent(targetWindow.document);
}

export function getNodeCanvasRoot(node: KonvaLikeNode | undefined, fallback?: Element | null): Element | null {
  const stageContainer = node?.getStage?.()?.container?.() ?? node?.container?.();

  if (stageContainer) {
    return getKonvaContent(stageContainer);
  }

  return fallback ?? null;
}
