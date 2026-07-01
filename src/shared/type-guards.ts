import type { ExtensionRuntimeMessage, RuntimeEvent } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeHash(value: unknown): value is string {
  return typeof value === 'string';
}

export function normalizeRuntimeEvent(message: ExtensionRuntimeMessage | unknown): RuntimeEvent | undefined {
  if (!isRecord(message)) {
    return undefined;
  }

  if (message.type === 'closeHover') {
    return { type: 'closeHover' };
  }

  if (message.type === 'showShape') {
    const detail = message.detail;

    if (!isRecord(detail)) {
      return undefined;
    }

    if (isNodeHash(detail.canvasHash) && isNodeHash(detail.nodeHash)) {
      return {
        type: 'showShape',
        detail: {
          canvasHash: detail.canvasHash,
          nodeHash: detail.nodeHash,
        },
      };
    }

    if (isNodeHash(detail.hash) && isNodeHash(detail.key)) {
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
