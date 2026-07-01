import { describe, expect, it } from 'vitest';

import { normalizeRuntimeEvent } from './type-guards';
import type { ExtensionRuntimeMessage } from './types';

describe('normalizeRuntimeEvent', () => {
  it('ignores malformed runtime messages instead of throwing', () => {
    expect(
      normalizeRuntimeEvent({ type: 'showShape', detail: undefined } as unknown as ExtensionRuntimeMessage)
    ).toBeUndefined();
    expect(normalizeRuntimeEvent(undefined as unknown as ExtensionRuntimeMessage)).toBeUndefined();
  });

  it('normalizes legacy shape selection messages', () => {
    expect(normalizeRuntimeEvent({ type: 'showShape', detail: { hash: 'canvas', key: 'node' } })).toEqual({
      type: 'showShape',
      detail: {
        canvasHash: 'canvas',
        nodeHash: 'node',
      },
    });
  });
});
