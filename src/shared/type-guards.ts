import type { ExtensionRuntimeMessage, RuntimeEvent } from './types';

export function normalizeRuntimeEvent(message: ExtensionRuntimeMessage): RuntimeEvent | undefined {
  if (message.type === 'closeHover') {
    return message;
  }

  if (message.type === 'showShape') {
    const detail = message.detail;

    if ('canvasHash' in detail && 'nodeHash' in detail) {
      return {
        type: 'showShape',
        detail: {
          canvasHash: detail.canvasHash,
          nodeHash: detail.nodeHash,
        },
      };
    }

    if ('hash' in detail && 'key' in detail) {
      return {
        type: 'showShape',
        detail: {
          canvasHash: detail.hash,
          nodeHash: detail.key,
        },
      };
    }
  }

  return undefined;
}
