import type { CanvasAttrs, NodeHash } from '../shared/types';

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
  getStage?: () => { container?: () => Element | null } | undefined;
  get?: (name: string) => unknown;
  getAttrs?: () => CanvasAttrs;
  setAttr?: (name: string, value: unknown) => void;
  getAbsolutePosition?: () => { x: number; y: number };
  getAbsoluteRotation?: () => number;
  getAbsoluteScale?: () => { x: number; y: number };
  getClientRect?: () => { x?: number; y?: number; width?: number; height?: number };
  container?: () => Element | null;
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
