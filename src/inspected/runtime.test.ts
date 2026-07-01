import { describe, expect, it } from 'vitest';

import { installKonvaDevtoolRuntime } from './runtime';

describe('installKonvaDevtoolRuntime', () => {
  it('installs one idempotent runtime on window', () => {
    const first = installKonvaDevtoolRuntime(window);
    const second = installKonvaDevtoolRuntime(window);

    expect(first).toBe(second);
    expect(window.__KONVA_DEVTOOL__).toBe(first);
  });

  it('allows a disposed runtime to be replaced on the same window', () => {
    const first = installKonvaDevtoolRuntime(window);

    first.dispose();
    const second = installKonvaDevtoolRuntime(window);

    expect(second).not.toBe(first);
    expect(window.__KONVA_DEVTOOL__).toBe(second);
  });
});
