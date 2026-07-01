import { describe, expect, it } from 'vitest';

import { shouldReinstallRuntimeForTabUpdate } from './panel-lifecycle';

describe('shouldReinstallRuntimeForTabUpdate', () => {
  it('only reinstalls after the inspected tab finishes loading', () => {
    expect(shouldReinstallRuntimeForTabUpdate(42, 42, { status: 'complete' })).toBe(true);
    expect(shouldReinstallRuntimeForTabUpdate(42, 7, { status: 'complete' })).toBe(false);
    expect(shouldReinstallRuntimeForTabUpdate(42, 42, { status: 'loading' })).toBe(false);
    expect(shouldReinstallRuntimeForTabUpdate(42, 42, {})).toBe(false);
  });
});
