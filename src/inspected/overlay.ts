import type { CanvasBBox, OverlayId } from '../shared/types';

export type OverlayStyle = Record<string, string>;

function getCanvasRoot(): Element | null {
  const targetWindow = window as Window & { __canvas_root__?: Element };
  return targetWindow.__canvas_root__ ?? document.querySelector('.konvajs-content');
}

export function computeOverlayStyle(
  bbox: CanvasBBox,
  rootOffset: { x: number; y: number },
  color = 'rgba(135, 59, 244, 0.5)'
): OverlayStyle {
  return {
    position: 'absolute',
    width: `${bbox.width}px`,
    height: `${bbox.height}px`,
    top: `${bbox.y + rootOffset.y}px`,
    left: `${bbox.x + rootOffset.x}px`,
    background: color,
    border: '2px dashed rgb(135, 59, 244)',
    boxSizing: 'border-box',
    zIndex: '10000',
    transform: bbox.transform ?? '',
    transformOrigin: bbox.transformOrigin ?? '',
  };
}

export function showOverlay(bbox: CanvasBBox, overlayId: OverlayId, color?: string): void {
  const canvasRoot = getCanvasRoot();

  if (!canvasRoot) {
    return;
  }

  clearOverlay(overlayId);

  const rect = canvasRoot.getBoundingClientRect();
  const el = document.createElement('div');
  el.classList.add('konva_devtool_rect');
  el.dataset.overlayId = overlayId;
  Object.assign(el.style, computeOverlayStyle(bbox, { x: rect.x, y: rect.y }, color));
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
