export type NodeHash = string;
export type OverlayId = '__hover__' | '__select__' | string;

export interface CanvasAttrs {
  [key: string]: unknown;
}

export interface CanvasBBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: {
    x: number;
    y: number;
  };
  transform?: string;
  transformOrigin?: string;
}

export interface CanvasTree {
  type: 'renderer' | 'group' | 'shape' | string;
  name: string;
  nodeType?: string;
  hash: NodeHash;
  id?: string | number;
  attrs?: CanvasAttrs;
  children?: CanvasTree[];
  count?: number;
  memory?: number;
  fps?: number;
}

export interface RuntimeShapeSelectedEvent {
  type: 'showShape';
  detail: {
    canvasHash: NodeHash;
    nodeHash: NodeHash;
  };
}

export interface RuntimeHoverClosedEvent {
  type: 'closeHover';
  detail?: Record<string, unknown>;
}

export type RuntimeEvent = RuntimeShapeSelectedEvent | RuntimeHoverClosedEvent;

export interface LegacyShapeSelectedMessage {
  type: 'showShape';
  detail: {
    hash: NodeHash;
    key: NodeHash;
  };
}

export type ExtensionRuntimeMessage = RuntimeEvent | LegacyShapeSelectedMessage;
