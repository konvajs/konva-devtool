import { describe, expect, it, vi } from 'vitest';

import { createEvalBridge } from './eval-bridge';

describe('createEvalBridge', () => {
  it('evaluates raw runtime script text', async () => {
    const evalMock = vi.fn((script: string, callback: (result: unknown) => void) => {
      expect(script).toBe('window.__KONVA_DEVTOOL_READY__ = true;');
      callback(true);
    });
    const bridge = createEvalBridge({ eval: evalMock });

    await expect(bridge.evaluate('window.__KONVA_DEVTOOL_READY__ = true;')).resolves.toBe(true);
  });

  it('executes serialized functions through inspectedWindow.eval', async () => {
    const evalMock = vi.fn((script: string, callback: (result: unknown) => void) => {
      expect(script).toContain('.apply(window');
      callback(42);
    });
    const bridge = createEvalBridge({ eval: evalMock });

    await expect(bridge.execute((value: number) => value + 1, [41] as const)).resolves.toBe(42);
  });

  it('rejects Chrome eval exceptions', async () => {
    const evalMock = vi.fn((_script: string, callback: (result: unknown, exception?: unknown) => void) => {
      callback(undefined, { value: 'boom' });
    });
    const bridge = createEvalBridge({ eval: evalMock });

    await expect(bridge.execute(() => 'unused', [] as const)).rejects.toMatchObject({
      name: 'InspectedWindowEvalError',
    });
  });
});
