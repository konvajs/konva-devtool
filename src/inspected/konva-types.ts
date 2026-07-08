import type { CanvasAttrs, CanvasPoint, NodeHash } from '../shared/types';

export type KonvaContainer = Element | ShadowRoot;

export interface KonvaClientRectConfig {
  skipTransform?: boolean;
}

export interface KonvaTransform {
  point(point: CanvasPoint): CanvasPoint;
}

export interface KonvaLikeNode {
  _id?: string | number;
  className?: string;
  nodeType?: string;
  attrs?: CanvasAttrs;
  hash?: NodeHash;
  __dev_hash?: NodeHash;
  ancestor?: NodeHash;
  visible?: () => boolean;
  hasChildren?: () => boolean;
  getChildren?: () => KonvaLikeNode[];
  getLayers?: () => KonvaLikeNode[];
  getRoot?: () => { getChildren?: () => KonvaLikeNode[] };
  getStage?: () => { container?: () => KonvaContainer | null } | undefined;
  get?: (name: string) => unknown;
  getAttrs?: () => CanvasAttrs;
  setAttr?: (name: string, value: unknown) => void;
  getAbsolutePosition?: () => { x: number; y: number };
  getAbsoluteRotation?: () => number;
  getAbsoluteScale?: () => { x: number; y: number };
  getAbsoluteTransform?: () => KonvaTransform;
  getClientRect?: (config?: KonvaClientRectConfig) => { x?: number; y?: number; width?: number; height?: number } | undefined;
  container?: () => KonvaContainer | null;
  x?: () => number;
  y?: () => number;
  rotation?: () => number;
  scaleX?: () => number;
  scaleY?: () => number;
  width?: () => number;
  height?: () => number;
  destroy?: () => KonvaLikeNode;
  __konvaDevtoolDestroyPatched?: boolean;
}

export interface KonvaIndexEnvironment {
  getCanvasInstances(): KonvaLikeNode[];
  getPerformanceMemory(): number | undefined;
  getFps(): number | undefined;
  log(label: string, node: KonvaLikeNode | undefined): void;
}
