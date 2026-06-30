import type { CanvasAttrs, CanvasTree, NodeHash, OverlayId } from '../shared/types';

export interface DevtoolActions {
  refreshCanvases(): Promise<CanvasTree[]>;
  checkCanvasAlive(hash: NodeHash): Promise<boolean>;
  showRect(hash: NodeHash, overlayId: OverlayId, color?: string): Promise<void>;
  clearRect(overlayId?: OverlayId): Promise<void>;
  getAttrs(hash: NodeHash): Promise<CanvasAttrs | undefined>;
  updateAttr(hash: NodeHash, name: string, value: unknown): Promise<void>;
  consoleElement(hash: NodeHash, label?: string): Promise<void>;
  setMouseoverInspecting(enabled: boolean): Promise<void>;
}
