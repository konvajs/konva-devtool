import { createContext, runInContext } from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';

import type { InspectedPageBridge } from '../bridge/eval-bridge';
import { createRuntimeClient } from './runtime-client';

declare global {
  interface Window {
    __runtimeClientInstallCount__?: number;
  }
}

function createEvaluatingBridge(): InspectedPageBridge {
  const inspectedGlobal = {
    window: {
      __runtimeClientInstallCount__: undefined as number | undefined,
    },
  };
  const context = createContext(inspectedGlobal);

  return {
    async evaluate<TResult>(script: string): Promise<TResult> {
      runInContext(script, context);
      window.__runtimeClientInstallCount__ = inspectedGlobal.window.__runtimeClientInstallCount__;
      return undefined as TResult;
    },
    async execute<TArgs extends readonly unknown[], TResult>(): Promise<TResult> {
      return undefined as TResult;
    },
  };
}

describe('createRuntimeClient', () => {
  afterEach(() => {
    delete window.__runtimeClientInstallCount__;
  });

  it('can install the same bundled runtime source more than once in one inspected page', async () => {
    const source = `
      let runtimeClientInstallMarker = 1;
      window.__runtimeClientInstallCount__ = (window.__runtimeClientInstallCount__ ?? 0) + runtimeClientInstallMarker;
    `;
    const client = createRuntimeClient(createEvaluatingBridge(), async () => source);

    await client.install();
    await expect(client.install()).resolves.toBeUndefined();

    expect(window.__runtimeClientInstallCount__).toBe(2);
  });
});
