import { afterEach, describe, expect, it } from 'vitest';

import type { CanvasBBox } from '../shared/types';
import { clearOverlay, computeOverlayStyle, showOverlay } from './overlay';

describe('overlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('computes absolute overlay style from canvas root offset and transform', () => {
    const bbox: CanvasBBox = {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      rotation: 15,
      scale: { x: 2, y: 3 },
      transform: 'scale(2, 3) rotate(15deg)',
      transformOrigin: 'top left',
    };

    const style = computeOverlayStyle(bbox, { x: 100, y: 200 }, { x: 1, y: 1 });

    expect(style).toMatchObject({
      position: 'absolute',
      width: '30px',
      height: '40px',
      top: '220px',
      left: '110px',
      background: 'rgba(135, 59, 244, 0.5)',
      transform: 'scale(2, 3) rotate(15deg)',
      transformOrigin: 'top left',
    });
  });

  it('scales stage coordinates to the rendered canvas size', () => {
    const style = computeOverlayStyle(
      {
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      { x: 100, y: 200 },
      { x: 0.5, y: 0.25 }
    );

    expect(style).toMatchObject({
      left: '105px',
      top: '205px',
      width: '15px',
      height: '10px',
    });
  });

  it('creates and clears overlay elements', () => {
    const root = document.createElement('div');
    root.className = 'konvajs-content';
    root.getBoundingClientRect = () => ({
      x: 5,
      y: 6,
      width: 100,
      height: 100,
      top: 6,
      left: 5,
      right: 105,
      bottom: 106,
      toJSON: () => ({}),
    });
    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(root, 'offsetHeight', { value: 200, configurable: true });
    document.body.appendChild(root);

    showOverlay(
      { x: 1, y: 2, width: 3, height: 4, rotation: 0, scale: { x: 1, y: 1 } },
      '__hover__'
    );

    expect(document.querySelectorAll('.konva_devtool_rect')).toHaveLength(1);

    clearOverlay('__hover__');

    expect(document.querySelectorAll('.konva_devtool_rect')).toHaveLength(0);
  });

  it('finds a Konva content root inside an open shadow root', () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.className = 'konvajs-content';
    root.getBoundingClientRect = () => ({
      x: 25,
      y: 35,
      width: 100,
      height: 100,
      top: 35,
      left: 25,
      right: 125,
      bottom: 135,
      toJSON: () => ({}),
    });
    Object.defineProperty(root, 'offsetWidth', { value: 100, configurable: true });
    Object.defineProperty(root, 'offsetHeight', { value: 100, configurable: true });
    shadowRoot.appendChild(root);
    document.body.appendChild(host);

    showOverlay(
      { x: 1, y: 2, width: 3, height: 4, rotation: 0, scale: { x: 1, y: 1 } },
      '__hover__'
    );

    const overlay = document.querySelector<HTMLElement>('.konva_devtool_rect');
    expect(overlay?.style.left).toBe('26px');
    expect(overlay?.style.top).toBe('37px');
  });

  it('draws oriented overlays as polygons instead of axis-aligned divs', () => {
    const root = document.createElement('div');
    root.className = 'konvajs-content';
    root.getBoundingClientRect = () => ({
      x: 5,
      y: 6,
      width: 100,
      height: 100,
      top: 6,
      left: 5,
      right: 105,
      bottom: 106,
      toJSON: () => ({}),
    });
    Object.defineProperty(root, 'offsetWidth', { value: 100, configurable: true });
    Object.defineProperty(root, 'offsetHeight', { value: 100, configurable: true });
    document.body.appendChild(root);

    showOverlay(
      {
        x: 0,
        y: 20,
        width: 30,
        height: 30,
        rotation: 0,
        scale: { x: 1, y: 1 },
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 30 },
          { x: 20, y: 50 },
          { x: 0, y: 40 },
        ],
      },
      '__hover__'
    );

    const overlay = document.querySelector<SVGSVGElement>('svg.konva_devtool_rect');
    const polygon = overlay?.querySelector('polygon');

    expect(overlay).not.toBeNull();
    expect(overlay?.style.left).toBe('5px');
    expect(overlay?.style.top).toBe('26px');
    expect(overlay?.style.width).toBe('30px');
    expect(overlay?.style.height).toBe('30px');
    expect(overlay?.style.overflow).toBe('visible');
    expect(polygon?.getAttribute('points')).toBe('10,0 30,10 20,30 0,20');
    expect(polygon?.getAttribute('fill')).toBeNull();
    expect((polygon as SVGPolygonElement | null)?.style.fill).toBe('rgba(135, 59, 244, 0.5)');
  });

  it('accounts for page scroll when positioning document overlays', () => {
    Object.defineProperty(window, 'scrollX', { value: 50, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 70, configurable: true });
    const root = document.createElement('div');
    root.className = 'konvajs-content';
    root.getBoundingClientRect = () => ({
      x: 5,
      y: 6,
      width: 100,
      height: 100,
      top: 6,
      left: 5,
      right: 105,
      bottom: 106,
      toJSON: () => ({}),
    });
    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(root, 'offsetHeight', { value: 200, configurable: true });
    document.body.appendChild(root);

    showOverlay(
      { x: 1, y: 2, width: 3, height: 4, rotation: 0, scale: { x: 1, y: 1 } },
      '__hover__'
    );

    const overlay = document.querySelector<HTMLElement>('.konva_devtool_rect');
    expect(overlay?.style.left).toBe('55.5px');
    expect(overlay?.style.top).toBe('77px');
  });
});
