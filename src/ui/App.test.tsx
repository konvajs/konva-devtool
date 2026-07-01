import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DevtoolActions } from '../panel/devtool-actions';
import type { CanvasTree, RuntimeEvent } from '../shared/types';
import App from './App';

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

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('renders without a global chrome runtime object', () => {
    stubMatchMedia();
    vi.stubGlobal('chrome', undefined);
    const container = document.createElement('div');
    const data: CanvasTree[] = [{ type: 'renderer', name: 'renderer', hash: 'canvas-1' }];

    act(() => {
      ReactDOM.render(<App actions={createActions()} data={data} />, container);
    });

    expect(container.textContent).toContain('ALIVE');
  });

  it('finalizes page inspection after selecting a shape from the canvas', async () => {
    stubMatchMedia();
    const actions = createActions();
    const subscribers: Array<(event: RuntimeEvent) => void> = [];
    const runtimeEvents = {
      subscribe(handler: (event: RuntimeEvent) => void) {
        subscribers.push(handler);
        return vi.fn();
      },
    };
    const data: CanvasTree[] = [
      {
        type: 'renderer',
        name: 'renderer',
        hash: 'canvas-1',
        children: [
          {
            type: 'Group',
            name: 'Group',
            hash: 'group-1',
            children: [{ type: 'Rect', name: 'Rect', hash: 'rect-1' }],
          },
        ],
      },
    ];
    const container = document.createElement('div');

    act(() => {
      ReactDOM.render(<App actions={actions} data={data} runtimeEvents={runtimeEvents} />, container);
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Inspect page element"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(actions.setMouseoverInspecting).toHaveBeenLastCalledWith(true);

    vi.mocked(actions.clearRect).mockClear();
    vi.mocked(actions.showRect).mockClear();

    await act(async () => {
      subscribers[0]?.({ type: 'showShape', detail: { canvasHash: 'canvas-1', nodeHash: 'rect-1' } });
      await Promise.resolve();
    });

    expect(actions.setMouseoverInspecting).toHaveBeenLastCalledWith(false);
    expect(actions.clearRect).toHaveBeenCalledWith('__hover__');
    expect(actions.clearRect).toHaveBeenCalledWith('__select__');
    expect(actions.showRect).not.toHaveBeenCalledWith('rect-1', '__select__', expect.any(String));
    expect(actions.getAttrs).toHaveBeenCalledWith('rect-1');
  });
});
