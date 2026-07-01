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

    const style = computeOverlayStyle(bbox, { x: 100, y: 200 }, 'red');

    expect(style).toMatchObject({
      position: 'absolute',
      width: '30px',
      height: '40px',
      top: '220px',
      left: '110px',
      background: 'red',
      transform: 'scale(2, 3) rotate(15deg)',
      transformOrigin: 'top left',
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
    document.body.appendChild(root);

    showOverlay(
      { x: 1, y: 2, width: 3, height: 4, rotation: 0, scale: { x: 1, y: 1 } },
      '__hover__'
    );

    expect(document.querySelectorAll('.konva_devtool_rect')).toHaveLength(1);

    clearOverlay('__hover__');

    expect(document.querySelectorAll('.konva_devtool_rect')).toHaveLength(0);
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
    document.body.appendChild(root);

    showOverlay(
      { x: 1, y: 2, width: 3, height: 4, rotation: 0, scale: { x: 1, y: 1 } },
      '__hover__'
    );

    const overlay = document.querySelector<HTMLElement>('.konva_devtool_rect');
    expect(overlay?.style.left).toBe('56px');
    expect(overlay?.style.top).toBe('78px');
  });
});
