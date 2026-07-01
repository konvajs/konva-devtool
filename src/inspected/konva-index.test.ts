import { describe, expect, it, vi } from 'vitest';

import { createKonvaIndex } from './konva-index';
import type { KonvaLikeNode } from './konva-types';

function fakeNode(input: {
  className: string;
  nodeType?: string;
  id?: number;
  attrs?: Record<string, unknown>;
  visible?: boolean;
  children?: KonvaLikeNode[];
  position?: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
  size?: { width: number; height: number };
  clientRect?: { x: number; y: number; width: number; height: number };
  exposeGeometryMethods?: boolean;
}): KonvaLikeNode {
  const attrs = input.attrs ?? {};
  const exposeGeometryMethods = input.exposeGeometryMethods ?? true;

  return {
    _id: input.id,
    className: input.className,
    nodeType: input.nodeType ?? input.className,
    attrs,
    __dev_hash: undefined,
    ancestor: undefined,
    visible: () => input.visible ?? true,
    hasChildren: () => Boolean(input.children?.length),
    getChildren: () => input.children ?? [],
    getRoot: undefined,
    get: (name: string) => attrs[name],
    getAttrs: () => attrs,
    setAttr: (name: string, value: unknown) => {
      attrs[name] = value;
    },
    getAbsolutePosition: exposeGeometryMethods ? () => input.position ?? { x: 0, y: 0 } : undefined,
    getAbsoluteRotation: exposeGeometryMethods ? () => input.rotation ?? 0 : undefined,
    getAbsoluteScale: exposeGeometryMethods ? () => input.scale ?? { x: 1, y: 1 } : undefined,
    getClientRect: input.clientRect ? () => input.clientRect as { x: number; y: number; width: number; height: number } : undefined,
    width: exposeGeometryMethods ? () => input.size?.width ?? 10 : undefined,
    height: exposeGeometryMethods ? () => input.size?.height ?? 20 : undefined,
  };
}

describe('createKonvaIndex', () => {
  it('builds serializable canvas trees and skips invisible children', () => {
    const visibleShape = fakeNode({
      className: 'Rect',
      nodeType: 'Shape',
      id: 11,
      attrs: { name: 'visible-shape' },
    });
    const invisibleShape = fakeNode({
      className: 'Circle',
      nodeType: 'Shape',
      visible: false,
    });
    const layer = fakeNode({
      className: 'Layer',
      children: [visibleShape, invisibleShape],
    });

    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => 123,
      getFps: () => 60,
      log: vi.fn(),
    });

    const trees = index.refresh();

    expect(trees).toHaveLength(1);
    expect(trees[0]).toMatchObject({
      type: 'renderer',
      name: 'renderer',
      memory: 123,
      fps: 60,
    });
    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children?.[0]).toMatchObject({
      type: 'Rect',
      name: 'Rect',
      nodeType: 'Shape',
      id: 11,
      attrs: { name: 'visible-shape' },
    });
  });

  it('reads attrs, updates attrs, checks canvas life, and computes bbox', () => {
    const shape = fakeNode({
      className: 'Rect',
      nodeType: 'Shape',
      attrs: { fill: 'red' },
      position: { x: 8, y: 9 },
      rotation: 45,
      scale: { x: 2, y: 3 },
      size: { width: 40, height: 50 },
    });
    const layer = fakeNode({ className: 'Layer', children: [shape] });
    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => undefined,
      getFps: () => undefined,
      log: vi.fn(),
    });

    const [canvas] = index.refresh();
    const nodeHash = canvas.children?.[0].hash as string;

    expect(index.hasCanvas(canvas.hash)).toBe(true);
    expect(index.getAttrs(nodeHash)).toEqual({ fill: 'red' });

    index.updateAttr(nodeHash, 'fill', 'blue');

    expect(index.getAttrs(nodeHash)).toEqual({ fill: 'blue' });
    expect(index.getBBox(nodeHash)).toEqual({
      x: 8,
      y: 9,
      width: 40,
      height: 50,
      rotation: 45,
      scale: { x: 2, y: 3 },
      transform: 'scale(2, 3) rotate(45deg)',
      transformOrigin: 'top left',
    });
  });

  it('falls back to attrs geometry when custom nodes do not expose Konva geometry methods', () => {
    const effectTextShape = fakeNode({
      className: 'EffectTextShape',
      nodeType: 'Shape',
      attrs: {
        x: 702.5,
        y: 52.25,
        width: 714.75,
        height: 120,
        scaleX: 0.46,
        scaleY: 0.47,
        rotation: 12,
      },
      exposeGeometryMethods: false,
    });
    const layer = fakeNode({ className: 'Layer', children: [effectTextShape] });
    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => undefined,
      getFps: () => undefined,
      log: vi.fn(),
    });

    const [canvas] = index.refresh();
    const nodeHash = canvas.children?.[0].hash as string;

    expect(index.getBBox(nodeHash)).toEqual({
      x: 702.5,
      y: 52.25,
      width: 714.75,
      height: 120,
      rotation: 12,
      scale: { x: 0.46, y: 0.47 },
      transform: 'scale(0.46, 0.47) rotate(12deg)',
      transformOrigin: 'top left',
    });
  });

  it('prefers Konva client rects because they include parent transforms and custom shape bounds', () => {
    const transformedShape = fakeNode({
      className: 'EffectTextShape',
      nodeType: 'Shape',
      attrs: {
        x: 702.5,
        y: 52.25,
        width: 714.75,
        height: 120,
        scaleX: 0.46,
        scaleY: 0.47,
      },
      clientRect: {
        x: 324.8,
        y: 128.4,
        width: 329,
        height: 56.4,
      },
      exposeGeometryMethods: false,
    });
    const layer = fakeNode({ className: 'Layer', children: [transformedShape] });
    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => undefined,
      getFps: () => undefined,
      log: vi.fn(),
    });

    const [canvas] = index.refresh();
    const nodeHash = canvas.children?.[0].hash as string;

    expect(index.getBBox(nodeHash)).toEqual({
      x: 324.8,
      y: 128.4,
      width: 329,
      height: 56.4,
      rotation: 0,
      scale: { x: 1, y: 1 },
    });
  });

  it('returns protocol-safe attrs instead of raw object graphs', () => {
    const texture: Record<string, unknown> = { label: 'texture' };
    texture.self = texture;
    const attrs: Record<string, unknown> = {
      name: 'hero',
      x: 12,
      texture,
      deep: { a: { b: { c: { d: 'too deep' } } } },
      handler: () => undefined,
    };
    attrs.self = attrs;

    const shape = fakeNode({
      className: 'Image',
      nodeType: 'Shape',
      attrs,
    });
    const layer = fakeNode({ className: 'Layer', children: [shape] });
    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => undefined,
      getFps: () => undefined,
      log: vi.fn(),
    });

    const [canvas] = index.refresh();
    const nodeHash = canvas.children?.[0].hash as string;
    const treeAttrs = canvas.children?.[0].attrs as Record<string, unknown>;

    expect(treeAttrs).toEqual({
      name: 'hero',
      x: 12,
      texture: {
        label: 'texture',
        self: '[Circular]',
      },
      deep: {
        a: {
          b: {
            c: '[Object]',
          },
        },
      },
      handler: '[Function]',
      self: '[Circular]',
    });
    expect(index.getAttrs(nodeHash)).toEqual(treeAttrs);
    expect(() => JSON.stringify(canvas)).not.toThrow();
  });
});
