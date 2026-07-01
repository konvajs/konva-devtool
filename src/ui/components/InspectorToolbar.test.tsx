import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DevtoolActions } from '../../panel/devtool-actions';
import type { CanvasTree } from '../../shared/types';
import InspectorToolbar from './InspectorToolbar';

function createActions(): DevtoolActions {
  return {
    refreshCanvases: vi.fn().mockResolvedValue([]),
    checkCanvasAlive: vi.fn().mockResolvedValue(true),
    showRect: vi.fn().mockResolvedValue(undefined),
    clearRect: vi.fn().mockResolvedValue(undefined),
    getAttrs: vi.fn().mockResolvedValue({}),
    updateAttr: vi.fn().mockResolvedValue(undefined),
    consoleElement: vi.fn().mockResolvedValue(undefined),
    setMouseoverInspecting: vi.fn().mockResolvedValue(undefined),
  };
}

function stubMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderToolbar(props: {
  actions?: DevtoolActions;
  setData?: (data: CanvasTree[]) => void;
  setSelectedCanvasHash?: (hash: string) => void;
  mouseoverInspecting?: boolean;
  setMouseoverInspecting?: (enabled: boolean) => void;
} = {}): HTMLElement {
  stubMatchMedia();
  const container = document.createElement('div');
  const canvas: CanvasTree = { type: 'renderer', name: 'renderer', hash: 'canvas-1' };

  act(() => {
    ReactDOM.render(
      <InspectorToolbar
        actions={props.actions ?? createActions()}
        data={[canvas]}
        selectedCanvas={canvas}
        selectedCanvasHash={canvas.hash}
        setData={props.setData ?? vi.fn()}
        setSelectedCanvasHash={props.setSelectedCanvasHash ?? vi.fn()}
        mouseoverInspecting={props.mouseoverInspecting ?? false}
        setMouseoverInspecting={props.setMouseoverInspecting ?? vi.fn()}
      />,
      container
    );
  });

  return container;
}

describe('InspectorToolbar', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('uses an icon button to toggle page element inspection', () => {
    const setMouseoverInspecting = vi.fn();
    const container = renderToolbar({ setMouseoverInspecting });
    const inspectButton = container.querySelector<HTMLButtonElement>('button[aria-label="Inspect page element"]');

    expect(container.textContent).not.toContain('Enable Mouseover');
    expect(inspectButton).not.toBeNull();

    act(() => {
      inspectButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setMouseoverInspecting).toHaveBeenCalledWith(true);
  });

  it('marks the inspect button as active while page element inspection is enabled', () => {
    const container = renderToolbar({ mouseoverInspecting: true });

    expect(container.querySelector('button[aria-label="Inspect page element"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('refreshes canvases on demand and selects the first canvas when the current one disappears', async () => {
    const nextData: CanvasTree[] = [{ type: 'renderer', name: 'renderer', hash: 'canvas-2' }];
    const actions = createActions();
    vi.mocked(actions.refreshCanvases).mockResolvedValue(nextData);
    const setData = vi.fn();
    const setSelectedCanvasHash = vi.fn();
    const container = renderToolbar({ actions, setData, setSelectedCanvasHash });
    const refreshButton = container.querySelector<HTMLButtonElement>('button[aria-label="Refresh canvases"]');

    expect(refreshButton).not.toBeNull();

    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(actions.refreshCanvases).toHaveBeenCalledOnce();
    expect(setData).toHaveBeenCalledWith(nextData);
    expect(setSelectedCanvasHash).toHaveBeenCalledWith('canvas-2');
  });
});
