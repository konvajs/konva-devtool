import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KonvaLikeNode } from './konva-types';
import { installKonvaDevtoolRuntime } from './runtime';

interface FakeNodeOptions {
  className: string;
  nodeType: string;
  attrs?: Record<string, unknown>;
  children?: MutableFakeNode[];
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

type MutableFakeNode = KonvaLikeNode & {
  attrs: Record<string, unknown>;
  children: MutableFakeNode[];
};

function createFakeNode(options: FakeNodeOptions): MutableFakeNode {
  const attrs = options.attrs ?? {};
  const children = options.children ?? [];
  const position = options.position ?? { x: 0, y: 0 };
  const size = options.size ?? { width: 0, height: 0 };

  return {
    className: options.className,
    nodeType: options.nodeType,
    attrs,
    children,
    visible: () => true,
    getChildren: () => children,
    getAttrs: () => attrs,
    setAttr: (name, value) => {
      attrs[name] = value;
    },
    getAbsolutePosition: () => position,
    getAbsoluteRotation: () => 0,
    getAbsoluteScale: () => ({ x: 1, y: 1 }),
    width: () => size.width,
    height: () => size.height,
  };
}

function installCanvasRoot(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'konvajs-content';
  root.getBoundingClientRect = () =>
    ({
      x: 10,
      y: 20,
      top: 20,
      left: 10,
      right: 210,
      bottom: 220,
      width: 200,
      height: 200,
      toJSON: () => undefined,
    }) as DOMRect;
  document.body.appendChild(root);
  window.__canvas_root__ = root;
  return root;
}

function installFakeCanvas(): { canvas: MutableFakeNode; layer: MutableFakeNode; shape: MutableFakeNode } {
  const shape = createFakeNode({
    className: 'Rect',
    nodeType: 'Shape',
    attrs: { fill: 'red', name: 'target' },
    position: { x: 5, y: 6 },
    size: { width: 40, height: 20 },
  });
  const layer = createFakeNode({
    className: 'Layer',
    nodeType: 'Group',
    children: [shape],
  });
  const canvas = createFakeNode({
    className: 'Stage',
    nodeType: 'Stage',
    children: [layer],
  });

  window.__canvas_instances__ = [canvas];
  return { canvas, layer, shape };
}

describe('Konva inspected runtime integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.__KONVA_DEVTOOL__;
    delete window.__canvas_instances__;
    delete window.__canvas_root__;
  });

  afterEach(() => {
    window.__KONVA_DEVTOOL__?.dispose();
    delete window.__KONVA_DEVTOOL__;
    delete window.__canvas_instances__;
    delete window.__canvas_root__;
    vi.restoreAllMocks();
  });

  it('lists nodes, shows selection overlays, edits attrs, and logs selected nodes', () => {
    installCanvasRoot();
    const { shape } = installFakeCanvas();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const runtime = installKonvaDevtoolRuntime(window);

    const [canvasTree] = runtime.refresh();
    const layerTree = canvasTree.children?.[0];
    const shapeTree = layerTree?.children?.[0];

    expect(canvasTree.type).toBe('renderer');
    expect(layerTree?.name).toBe('Layer');
    expect(shapeTree?.name).toBe('Rect');
    expect(shapeTree?.attrs).toMatchObject({ fill: 'red', name: 'target' });
    expect(runtime.hasCanvas(canvasTree.hash)).toBe(true);

    runtime.showOverlay(shapeTree?.hash ?? '', '__select__', 'rgba(1, 2, 3, 0.4)');
    const overlay = document.querySelector<HTMLElement>('.konva_devtool_rect[data-overlay-id="__select__"]');
    expect(overlay?.style.left).toBe('15px');
    expect(overlay?.style.top).toBe('26px');
    expect(overlay?.style.background).toBe('rgba(1, 2, 3, 0.4)');

    runtime.updateAttr(shapeTree?.hash ?? '', 'fill', 'blue');
    expect(shape.attrs.fill).toBe('blue');

    runtime.consoleNode(shapeTree?.hash ?? '', '<shape>');
    expect(log).toHaveBeenCalledWith('<shape>', shape);

    runtime.clearOverlay('__select__');
    expect(document.querySelector('.konva_devtool_rect[data-overlay-id="__select__"]')).toBeNull();
  });

  it('selects a hovered shape once and removes listeners when mouseover inspection is disabled', () => {
    installCanvasRoot();
    installFakeCanvas();
    const runtime = installKonvaDevtoolRuntime(window);
    const [canvasTree] = runtime.refresh();
    const shapeHash = canvasTree.children?.[0]?.children?.[0]?.hash;
    const selected: Array<{ canvasHash: string; nodeHash: string }> = [];
    const onShapeSelected = (event: Event) => {
      selected.push((event as CustomEvent<{ canvasHash: string; nodeHash: string }>).detail);
    };

    window.addEventListener('showShape', onShapeSelected);

    runtime.setMouseoverInspecting(true);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 30 }));
    expect(document.querySelector('.konva_devtool_rect[data-overlay-id="__hover__"]')).not.toBeNull();

    runtime.setMouseoverInspecting(false);
    window.dispatchEvent(new MouseEvent('click'));
    expect(selected).toEqual([]);
    expect(document.querySelector('.konva_devtool_rect[data-overlay-id="__hover__"]')).toBeNull();

    runtime.setMouseoverInspecting(true);
    runtime.setMouseoverInspecting(true);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 30 }));
    window.dispatchEvent(new MouseEvent('click'));

    expect(selected).toEqual([{ canvasHash: canvasTree.hash, nodeHash: shapeHash }]);

    window.removeEventListener('showShape', onShapeSelected);
  });
});
