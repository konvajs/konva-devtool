import { afterEach, describe, expect, it, vi } from 'vitest';

interface DevtoolsChromeMock {
  devtools: {
    inspectedWindow: {
      eval: ReturnType<typeof vi.fn>;
    };
    network: {
      onNavigated: {
        addListener: ReturnType<typeof vi.fn>;
      };
    };
    panels: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  runtime: {
    sendMessage: ReturnType<typeof vi.fn>;
  };
}

function installChromeMock(evalResult: boolean, exception?: unknown): {
  chromeMock: DevtoolsChromeMock;
  navigatedListeners: Array<() => void>;
} {
  const navigatedListeners: Array<() => void> = [];
  const chromeMock: DevtoolsChromeMock = {
    devtools: {
      inspectedWindow: {
        eval: vi.fn((_script: string, callback: (result: boolean, exception?: unknown) => void) => {
          callback(evalResult, exception);
        }),
      },
      network: {
        onNavigated: {
          addListener: vi.fn((listener: () => void) => navigatedListeners.push(listener)),
        },
      },
      panels: {
        create: vi.fn((_title: string, _icon: string, _page: string, callback: (panel: unknown) => void) => {
          callback({
            onHidden: {
              addListener: vi.fn(),
            },
          });
        }),
      },
    },
    runtime: {
      sendMessage: vi.fn(),
    },
  };

  vi.stubGlobal('chrome', chromeMock);
  return { chromeMock, navigatedListeners };
}

async function importDevtoolsEntry(): Promise<void> {
  vi.resetModules();
  await import('./devtools');
}

describe('devtools extension entry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not create the panel when Konva is not detected or eval fails', async () => {
    vi.useFakeTimers();
    const { chromeMock } = installChromeMock(false);

    await importDevtoolsEntry();

    expect(chromeMock.devtools.panels.create).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
    const { chromeMock: exceptionChromeMock } = installChromeMock(true, { value: 'blocked' });
    await importDevtoolsEntry();

    expect(exceptionChromeMock.devtools.panels.create).not.toHaveBeenCalled();
  });

  it('keeps one DevTools panel after navigation when Konva remains detected', async () => {
    vi.useFakeTimers();
    const { chromeMock, navigatedListeners } = installChromeMock(true);

    await importDevtoolsEntry();
    navigatedListeners.forEach((listener) => listener());

    expect(chromeMock.devtools.panels.create).toHaveBeenCalledTimes(1);
  });
});
