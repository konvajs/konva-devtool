import type { CanvasBBox, OverlayId } from '../shared/types';

export type OverlayStyle = Record<string, string>;
export interface OverlayVector {
  x: number;
  y: number;
}

function getCanvasRoot(): Element | null {
  const targetWindow = window as Window & { __canvas_root__?: Element };
  return targetWindow.__canvas_root__ ?? document.querySelector('.konvajs-content');
}

export function computeOverlayStyle(
  bbox: CanvasBBox,
  rootOffset: OverlayVector,
  rootScale: OverlayVector = { x: 1, y: 1 },
  color = 'rgba(135, 59, 244, 0.5)'
): OverlayStyle {
  return {
    position: 'absolute',
    width: `${bbox.width * rootScale.x}px`,
    height: `${bbox.height * rootScale.y}px`,
    top: `${bbox.y * rootScale.y + rootOffset.y}px`,
    left: `${bbox.x * rootScale.x + rootOffset.x}px`,
    background: color,
    border: '2px dashed rgb(135, 59, 244)',
    boxSizing: 'border-box',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transform: bbox.transform ?? '',
    transformOrigin: bbox.transformOrigin ?? '',
  };
}

export function getRenderedScale(canvasRoot: Element, rect: DOMRect): OverlayVector {
  const layoutBox = canvasRoot as HTMLElement;
  const layoutWidth = layoutBox.offsetWidth || layoutBox.clientWidth || rect.width;
  const layoutHeight = layoutBox.offsetHeight || layoutBox.clientHeight || rect.height;

  return {
    x: layoutWidth ? rect.width / layoutWidth : 1,
    y: layoutHeight ? rect.height / layoutHeight : 1,
  };
}

export function showOverlay(bbox: CanvasBBox, overlayId: OverlayId, color?: string, root?: Element | null): void {
  clearOverlay(overlayId);

  const canvasRoot = root ?? getCanvasRoot();

  if (!canvasRoot) {
    return;
  }

  const rect = canvasRoot.getBoundingClientRect();
  const rootScale = getRenderedScale(canvasRoot, rect);
  const el = document.createElement('div');
  el.classList.add('konva_devtool_rect');
  el.dataset.overlayId = overlayId;
  Object.assign(
    el.style,
    computeOverlayStyle(bbox, { x: rect.x + window.scrollX, y: rect.y + window.scrollY }, rootScale, color)
  );
  document.body.appendChild(el);
}

export function clearOverlay(overlayId?: OverlayId): void {
  const selector = overlayId
    ? `.konva_devtool_rect[data-overlay-id="${overlayId}"]`
    : '.konva_devtool_rect';

  document.querySelectorAll(selector).forEach((element) => {
    element.remove();
  });
}
