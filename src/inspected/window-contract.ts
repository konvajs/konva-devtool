import type { KonvaLikeNode } from './konva-types';
import type { KonvaDevtoolRuntime } from './runtime';

declare global {
  interface Window {
    Konva?: {
      stages?: KonvaLikeNode[];
      Layer?: {
        prototype?: {
          destroy?: () => KonvaLikeNode;
        };
      };
    };
    __KONVA_DEVTOOL__?: KonvaDevtoolRuntime;
    __canvas_instances__?: KonvaLikeNode[] & {
      globalMap?: Record<string, KonvaLikeNode>;
    };
    __canvas_root__?: Element;
    __fps_value?: number;
  }
}

export {};
