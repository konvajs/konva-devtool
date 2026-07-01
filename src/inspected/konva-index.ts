import type { CanvasAttrs, CanvasBBox, CanvasPoint, CanvasTree, NodeHash } from '../shared/types';
import { serializeAttrs } from './attrs-serialization';
import { createHash } from './hash';
import type { KonvaIndexEnvironment, KonvaLikeNode } from './konva-types';

export interface KonvaIndex {
  refresh(): CanvasTree[];
  hasCanvas(hash: NodeHash): boolean;
  getNode(hash: NodeHash): KonvaLikeNode | undefined;
  getAttrs(hash: NodeHash): CanvasAttrs | undefined;
  updateAttr(hash: NodeHash, name: string, value: unknown): void;
  getBBox(hash: NodeHash): CanvasBBox;
  consoleNode(hash: NodeHash, label?: string): void;
}

function getNodeHash(node: KonvaLikeNode): NodeHash {
  if (!node.__dev_hash) {
    node.__dev_hash = createHash('node');
  }

  return node.__dev_hash;
}

function getCanvasRootChildren(canvas: KonvaLikeNode): KonvaLikeNode[] {
  const root = canvas.getRoot?.();
  const rootChildren = root?.getChildren?.();

  if (rootChildren) {
    return rootChildren.filter((child) => child.visible?.() ?? true);
  }

  return (canvas.getChildren?.() ?? []).filter((child) => child.visible?.() ?? true);
}

function getVisibleChildren(node: KonvaLikeNode): KonvaLikeNode[] {
  return (node.getChildren?.() ?? []).filter((child) => child.visible?.() ?? true);
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getNodeNumber(node: KonvaLikeNode, name: string): number | undefined {
  return getNumber(node.get?.(name)) ?? getNumber(node.attrs?.[name]);
}

function getNodePosition(node: KonvaLikeNode): { x: number; y: number } {
  return node.getAbsolutePosition?.() ?? {
    x: node.x?.() ?? getNodeNumber(node, 'x') ?? 0,
    y: node.y?.() ?? getNodeNumber(node, 'y') ?? 0,
  };
}

function getNodeRotation(node: KonvaLikeNode): number {
  return node.getAbsoluteRotation?.() ?? node.rotation?.() ?? getNodeNumber(node, 'rotation') ?? 0;
}

function getNodeScale(node: KonvaLikeNode): { x: number; y: number } {
  return node.getAbsoluteScale?.() ?? {
    x: node.scaleX?.() ?? getNodeNumber(node, 'scaleX') ?? 1,
    y: node.scaleY?.() ?? getNodeNumber(node, 'scaleY') ?? 1,
  };
}

function getNodeSize(node: KonvaLikeNode): { width: number; height: number } {
  return {
    width: node.width?.() ?? getNodeNumber(node, 'width') ?? 0,
    height: node.height?.() ?? getNodeNumber(node, 'height') ?? 0,
  };
}

interface NumericRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getNumericClientRect(node: KonvaLikeNode, config?: { skipTransform?: boolean }): NumericRect | undefined {
  const clientRect = node.getClientRect?.(config);

  if (!clientRect) {
    return undefined;
  }

  const x = getNumber(clientRect.x);
  const y = getNumber(clientRect.y);
  const width = getNumber(clientRect.width);
  const height = getNumber(clientRect.height);

  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }

  return { x, y, width, height };
}

function getPointsBBox(points: CanvasPoint[]): Pick<CanvasBBox, 'x' | 'y' | 'width' | 'height'> {
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

function getOrientedClientBBox(node: KonvaLikeNode): CanvasBBox | undefined {
  const transform = node.getAbsoluteTransform?.();
  const localRect = transform ? getNumericClientRect(node, { skipTransform: true }) : undefined;

  if (!transform || !localRect) {
    return undefined;
  }

  const points = [
    transform.point({ x: localRect.x, y: localRect.y }),
    transform.point({ x: localRect.x + localRect.width, y: localRect.y }),
    transform.point({ x: localRect.x + localRect.width, y: localRect.y + localRect.height }),
    transform.point({ x: localRect.x, y: localRect.y + localRect.height }),
  ];

  return {
    ...getPointsBBox(points),
    rotation: 0,
    scale: { x: 1, y: 1 },
    points,
  };
}

function getNodeClientBBox(node: KonvaLikeNode): CanvasBBox | undefined {
  const orientedBBox = getOrientedClientBBox(node);

  if (orientedBBox) {
    return orientedBBox;
  }

  const clientRect = getNumericClientRect(node);

  if (!clientRect) {
    return undefined;
  }

  return {
    ...clientRect,
    rotation: 0,
    scale: { x: 1, y: 1 },
  };
}

function getRawAttrs(node: KonvaLikeNode): CanvasAttrs | undefined {
  return node.getAttrs?.() ?? node.attrs;
}

function getSerializableAttrs(node: KonvaLikeNode): CanvasAttrs | undefined {
  return serializeAttrs(getRawAttrs(node));
}

export function createKonvaIndex(env: KonvaIndexEnvironment): KonvaIndex {
  let globalMap: Record<NodeHash, KonvaLikeNode> = {};
  let canvases: KonvaLikeNode[] = [];

  function serializeNode(node: KonvaLikeNode, canvasHash: NodeHash): CanvasTree {
    const hash = getNodeHash(node);
    node.ancestor = canvasHash;
    globalMap[hash] = node;

    const children = getVisibleChildren(node).map((child) => serializeNode(child, canvasHash));
    const attrs = getSerializableAttrs(node);
    const type = node.className ?? node.nodeType ?? 'group';

    return {
      type,
      name: type,
      nodeType: node.nodeType,
      hash,
      id: node._id ?? (node.get?.('_id') as string | number | undefined),
      attrs,
      ...(children.length ? { children } : {}),
    };
  }

  function refresh(): CanvasTree[] {
    globalMap = {};
    canvases = env.getCanvasInstances();

    return canvases.map((canvas) => {
      const hash = canvas.hash ?? createHash('canvas');
      canvas.hash = hash;
      globalMap[hash] = canvas;

      return {
        type: 'renderer',
        name: 'renderer',
        nodeType: 'renderer',
        hash,
        children: getCanvasRootChildren(canvas).map((child) => serializeNode(child, hash)),
        memory: env.getPerformanceMemory(),
        fps: env.getFps(),
      };
    });
  }

  function getNode(hash: NodeHash): KonvaLikeNode | undefined {
    return globalMap[hash];
  }

  function getAttrs(hash: NodeHash): CanvasAttrs | undefined {
    const node = getNode(hash);
    return node ? getSerializableAttrs(node) : undefined;
  }

  function updateAttr(hash: NodeHash, name: string, value: unknown): void {
    getNode(hash)?.setAttr?.(name, value);
  }

  function getBBox(hash: NodeHash): CanvasBBox {
    const node = getNode(hash);

    if (!node) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scale: { x: 1, y: 1 },
      };
    }

    const clientBBox = getNodeClientBBox(node);

    if (clientBBox) {
      return clientBBox;
    }

    const position = getNodePosition(node);
    const rotation = getNodeRotation(node);
    const scale = getNodeScale(node);
    const size = getNodeSize(node);
    const transform = `scale(${scale.x}, ${scale.y})${rotation ? ` rotate(${rotation}deg)` : ''}`;

    return {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      rotation,
      scale,
      transform,
      transformOrigin: 'top left',
    };
  }

  function hasCanvas(hash: NodeHash): boolean {
    return canvases.some((canvas) => canvas.hash === hash);
  }

  function consoleNode(hash: NodeHash, label = '<Click To Expand>'): void {
    env.log(label, getNode(hash));
  }

  return {
    refresh,
    hasCanvas,
    getNode,
    getAttrs,
    updateAttr,
    getBBox,
    consoleNode,
  };
}
