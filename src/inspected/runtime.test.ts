import { describe, expect, it } from 'vitest';

import { installKonvaDevtoolRuntime } from './runtime';

describe('installKonvaDevtoolRuntime', () => {
  it('installs one idempotent runtime on window', () => {
    const first = installKonvaDevtoolRuntime(window);
    const second = installKonvaDevtoolRuntime(window);

    expect(first).toBe(second);
    expect(window.__KONVA_DEVTOOL__).toBe(first);
  });
});
