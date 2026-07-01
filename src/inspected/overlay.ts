import type { CanvasBBox, CanvasPoint, OverlayId } from '../shared/types';

export type OverlayStyle = Record<string, string>;
export interface OverlayVector {
  x: number;
  y: number;
}

const OVERLAY_COLOR = 'rgba(135, 59, 244, 0.5)';
const OVERLAY_BORDER_COLOR = 'rgb(135, 59, 244)';

function getCanvasRoot(): Element | null {
  const targetWindow = window as Window & { __canvas_root__?: Element };
  return targetWindow.__canvas_root__ ?? document.querySelector('.konvajs-content');
}

function scalePoint(point: CanvasPoint, rootOffset: OverlayVector, rootScale: OverlayVector): CanvasPoint {
  return {
    x: point.x * rootScale.x + rootOffset.x,
    y: point.y * rootScale.y + rootOffset.y,
  };
}

function getPointBounds(points: CanvasPoint[]): { x: number; y: number; width: number; height: number } {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getScaledOverlayPoints(bbox: CanvasBBox, rootOffset: OverlayVector, rootScale: OverlayVector): CanvasPoint[] {
  return (bbox.points ?? []).map((point) => scalePoint(point, rootOffset, rootScale));
}

export function computeOverlayStyle(
  bbox: CanvasBBox,
  rootOffset: OverlayVector,
  rootScale: OverlayVector = { x: 1, y: 1 }
): OverlayStyle {
  const scaledPoints = getScaledOverlayPoints(bbox, rootOffset, rootScale);

  if (scaledPoints.length) {
    const bounds = getPointBounds(scaledPoints);

    return {
      position: 'absolute',
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      top: `${bounds.y}px`,
      left: `${bounds.x}px`,
      background: 'transparent',
      overflow: 'visible',
      zIndex: '2147483647',
      pointerEvents: 'none',
    };
  }

  return {
    position: 'absolute',
    width: `${bbox.width * rootScale.x}px`,
    height: `${bbox.height * rootScale.y}px`,
    top: `${bbox.y * rootScale.y + rootOffset.y}px`,
    left: `${bbox.x * rootScale.x + rootOffset.x}px`,
    background: OVERLAY_COLOR,
    border: `2px dashed ${OVERLAY_BORDER_COLOR}`,
    boxSizing: 'border-box',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transform: bbox.transform ?? '',
    transformOrigin: bbox.transformOrigin ?? '',
  };
}

function createPolygonOverlay(
  bbox: CanvasBBox,
  overlayId: OverlayId,
  rootOffset: OverlayVector,
  rootScale: OverlayVector
): SVGSVGElement {
  const scaledPoints = getScaledOverlayPoints(bbox, rootOffset, rootScale);
  const bounds = getPointBounds(scaledPoints);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const localPoints = scaledPoints.map((point) => `${point.x - bounds.x},${point.y - bounds.y}`).join(' ');

  svg.classList.add('konva_devtool_rect');
  svg.setAttribute('data-overlay-id', overlayId);
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  Object.assign(svg.style, computeOverlayStyle(bbox, rootOffset, rootScale));

  polygon.setAttribute('points', localPoints);
  polygon.setAttribute('stroke', OVERLAY_BORDER_COLOR);
  polygon.setAttribute('stroke-width', '2');
  polygon.setAttribute('stroke-dasharray', '6 4');
  polygon.setAttribute('vector-effect', 'non-scaling-stroke');
  polygon.style.fill = OVERLAY_COLOR;
  svg.appendChild(polygon);

  return svg;
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

export function showOverlay(bbox: CanvasBBox, overlayId: OverlayId, root?: Element | null): void {
  clearOverlay(overlayId);

  const canvasRoot = root ?? getCanvasRoot();

  if (!canvasRoot) {
    return;
  }

  const rect = canvasRoot.getBoundingClientRect();
  const rootScale = getRenderedScale(canvasRoot, rect);
  const rootOffset = { x: rect.x + window.scrollX, y: rect.y + window.scrollY };
  const el = bbox.points?.length
    ? createPolygonOverlay(bbox, overlayId, rootOffset, rootScale)
    : document.createElement('div');

  if (!bbox.points?.length) {
    el.classList.add('konva_devtool_rect');
    el.setAttribute('data-overlay-id', overlayId);
    Object.assign(
      el.style,
      computeOverlayStyle(bbox, rootOffset, rootScale)
    );
  }
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
