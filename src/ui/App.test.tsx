import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DevtoolActions } from '../panel/devtool-actions';
import type { CanvasTree } from '../shared/types';
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
});
