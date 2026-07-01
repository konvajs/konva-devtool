import { describe, expect, it, vi } from 'vitest';

import { installKonvaDevtoolRuntime } from './runtime';

describe('installKonvaDevtoolRuntime', () => {
  it('replaces an existing runtime when the inspected script is re-evaluated', () => {
    const first = installKonvaDevtoolRuntime(window);
    const dispose = vi.spyOn(first, 'dispose');
    const second = installKonvaDevtoolRuntime(window);

    expect(dispose).toHaveBeenCalled();
    expect(second).not.toBe(first);
    expect(window.__KONVA_DEVTOOL__).toBe(second);
  });

  it('allows a disposed runtime to be replaced on the same window', () => {
    const first = installKonvaDevtoolRuntime(window);

    first.dispose();
    const second = installKonvaDevtoolRuntime(window);

    expect(second).not.toBe(first);
    expect(window.__KONVA_DEVTOOL__).toBe(second);
  });
});
