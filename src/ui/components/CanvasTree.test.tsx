import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DevtoolActions } from '../../panel/devtool-actions';
import type { CanvasTree } from '../../shared/types';
import CanvasTreeView from './CanvasTree';

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

describe('CanvasTreeView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('uses the default overlay color when selecting a tree node', () => {
    stubMatchMedia();
    const actions = createActions();
    const container = document.createElement('div');
    const data: CanvasTree = {
      type: 'renderer',
      name: 'renderer',
      hash: 'canvas-1',
      children: [
        {
          type: 'shape',
          name: 'Rect',
          hash: 'shape-1',
        },
      ],
    };

    act(() => {
      ReactDOM.render(
        <CanvasTreeView
          actions={actions}
          data={data}
          selectedNodeHash="shape-1"
        />,
        container
      );
    });

    const selectOverlayCalls = vi.mocked(actions.showRect).mock.calls.filter(
      ([, overlayId]) => overlayId === '__select__'
    );

    expect(selectOverlayCalls).toEqual([['shape-1', '__select__']]);
  });
});
