import { describe, expect, it, vi } from 'vitest';

import { createDevtoolController } from './controller';
import type { RuntimeClient } from './runtime-client';

function createRuntimeClient(): RuntimeClient {
  return {
    install: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue([{ type: 'renderer', name: 'renderer', hash: 'canvas-1' }]),
    hasCanvas: vi.fn().mockResolvedValue(true),
    getAttrs: vi.fn().mockResolvedValue({ fill: 'red' }),
    updateAttr: vi.fn().mockResolvedValue(undefined),
    getBBox: vi.fn().mockResolvedValue({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      scale: { x: 1, y: 1 },
    }),
    showOverlay: vi.fn().mockResolvedValue(undefined),
    clearOverlay: vi.fn().mockResolvedValue(undefined),
    setMouseoverInspecting: vi.fn().mockResolvedValue(undefined),
    consoleNode: vi.fn().mockResolvedValue(undefined),
  };
}

describe('createDevtoolController', () => {
  it('exposes UI actions backed by runtime client', async () => {
    const runtimeClient = createRuntimeClient();
    const controller = createDevtoolController(runtimeClient);

    await expect(controller.actions.refreshCanvases()).resolves.toEqual([
      { type: 'renderer', name: 'renderer', hash: 'canvas-1' },
    ]);
    await controller.actions.showRect('node-1', '__hover__');
    await controller.actions.updateAttr('node-1', 'fill', 'blue');
    await controller.actions.setMouseoverInspecting(true);

    expect(runtimeClient.showOverlay).toHaveBeenCalledWith('node-1', '__hover__');
    expect(runtimeClient.updateAttr).toHaveBeenCalledWith('node-1', 'fill', 'blue');
    expect(runtimeClient.setMouseoverInspecting).toHaveBeenCalledWith(true);
  });

  it('installs the inspected runtime before reading initial data', async () => {
    const runtimeClient = createRuntimeClient();
    const controller = createDevtoolController(runtimeClient);

    await expect(controller.getInitialData()).resolves.toEqual([
      { type: 'renderer', name: 'renderer', hash: 'canvas-1' },
    ]);

    const installOrder = vi.mocked(runtimeClient.install).mock.invocationCallOrder[0];
    const refreshOrder = vi.mocked(runtimeClient.refresh).mock.invocationCallOrder[0];
    expect(installOrder).toBeLessThan(refreshOrder);
  });

  it('refreshes canvases when selected canvas is no longer alive', async () => {
    const runtimeClient = createRuntimeClient();
    vi.mocked(runtimeClient.hasCanvas).mockResolvedValue(false);
    const controller = createDevtoolController(runtimeClient);

    await expect(controller.actions.checkCanvasAlive('dead-canvas')).resolves.toBe(false);

    expect(runtimeClient.refresh).toHaveBeenCalled();
  });
});
