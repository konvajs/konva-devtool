# Konva DevTool TypeScript Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `konva-devtool` as a modular TypeScript Chrome DevTools extension while preserving the existing Konva inspection workflow.

**Architecture:** The refactor splits the current monolithic `src/scripts/panel.js` into typed extension shell, bridge, inspected-page runtime, panel controller, and React UI modules. React components depend only on `DevtoolActions` and shared canvas data types; Chrome APIs and Konva globals stay behind adapters.

**Tech Stack:** TypeScript, React 17, Ant Design 4, Vite 3, Vitest, JSDOM, Chrome Extension Manifest V3.

---

## Source Design

Create and modify these files:

- Modify: `package.json` - add TypeScript, test, and build scripts and dev dependencies.
- Create: `tsconfig.json` - strict TypeScript config for browser extension and React code.
- Create: `vitest.config.ts` - unit test config with JSDOM.
- Modify: `vite.config.js` then rename to `vite.config.ts` - bundle extension entrypoints and copy static assets.
- Create: `src/shared/types.ts` - shared canvas, overlay, runtime event, and Chrome message types.
- Create: `src/shared/type-guards.ts` - runtime event normalization for legacy and new message shapes.
- Create: `src/ui/tree-model.ts` - pure conversion from `CanvasTree` to Ant Design tree data.
- Create: `src/ui/tree-model.test.ts` - tests for tree conversion and descendant counts.
- Rename: `src/ui/index.jsx` to `src/ui/index.tsx` - React panel mount entry.
- Rename: `src/ui/components/Devtool.jsx` to `src/ui/App.tsx` - typed app container.
- Rename: `src/ui/components/Tree.jsx` to `src/ui/components/CanvasTree.tsx` - typed tree view.
- Create: `src/ui/components/CanvasSelector.tsx` - typed canvas dropdown.
- Create: `src/ui/components/InspectorToolbar.tsx` - typed toolbar and status controls.
- Rename: `src/ui/components/AttrsDrawer.jsx` to `src/ui/components/AttrsDrawer.tsx` - typed attrs drawer.
- Delete after replacement: `src/ui/utils/index.js`.
- Create: `src/inspected/konva-types.ts` - narrow local types for Konva-like nodes.
- Create: `src/inspected/hash.ts` - deterministic hash helper for tests and runtime ids.
- Create: `src/inspected/konva-index.ts` - discovery, indexing, attrs, bbox, and console operations.
- Create: `src/inspected/konva-index.test.ts` - fake Konva node tests.
- Create: `src/inspected/overlay.ts` - overlay element creation, style computation, and cleanup.
- Create: `src/inspected/overlay.test.ts` - JSDOM overlay tests.
- Create: `src/inspected/mouseover-inspector.ts` - mouseover selection runtime.
- Create: `src/inspected/runtime.ts` - idempotent `window.__KONVA_DEVTOOL__` installer.
- Create: `src/inspected/entry.ts` - bundled inspected-page entrypoint evaluated in the page context.
- Create: `src/inspected/window-contract.ts` - global `Window` augmentation.
- Create: `src/bridge/eval-bridge.ts` - typed wrapper around `chrome.devtools.inspectedWindow.eval`.
- Create: `src/bridge/eval-bridge.test.ts` - eval bridge tests.
- Create: `src/bridge/protocol.ts` - bridge command and error types.
- Create: `src/bridge/serialization.ts` - function serialization helper.
- Create: `src/panel/runtime-client.ts` - typed client for `window.__KONVA_DEVTOOL__`.
- Create: `src/panel/devtool-actions.ts` - UI-facing action interface.
- Create: `src/panel/controller.ts` - panel state and action orchestration.
- Create: `src/panel/controller.test.ts` - controller tests with fake runtime client.
- Rename: `src/scripts/main.js` to `src/extension/devtools.ts`.
- Rename: `src/scripts/background.js` to `src/extension/background.ts`.
- Rename: `src/scripts/content-script.js` to `src/extension/content-script.ts`.
- Replace: `src/scripts/panel.js` with `src/extension/panel.ts`.
- Modify: `panel.html` - load bundled `scripts/panel.js`.
- Modify: `devtools.html` - load bundled `scripts/devtools.js`.
- Modify: `manifest.json` - point to bundled script names.
- Delete after verification: old `src/scripts/*.js` files.

Do not edit generated `devtools/` files by hand. They are build output.

## Execution Rules

- Keep commits small. Each task ends with a commit.
- Write the listed failing test before production code in that task.
- Verify the expected failure reason before writing implementation.
- Run task-local tests first, then broader verification.
- Do not change visible UI behavior unless a test or existing behavior requires it.
- Preserve compatibility with `window.__canvas_instances__`, `window.__canvas_root__`, `.konvajs-content`, and overlay class `konva_devtool_rect`.

### Task 1: TypeScript And Test Tooling

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/shared/types.ts`
- Create: `src/shared/type-guards.ts`

- [ ] **Step 1: Run the missing typecheck command**

Run:

```bash
npm run typecheck
```

Expected: FAIL with `Missing script: "typecheck"`.

- [ ] **Step 2: Install TypeScript test dependencies**

Run:

```bash
npm install --save-dev typescript@5.4.5 vitest@0.34.6 jsdom@22.1.0 @types/chrome@0.0.268 @types/react@17.0.75 @types/react-dom@17.0.25
```

Expected: `package.json` and `package-lock.json` update with the installed dev dependencies.

- [ ] **Step 3: Add scripts to `package.json`**

Add or replace these script entries:

```json
{
  "scripts": {
    "start": "cross-env ENV=development vite",
    "watch": "cross-env ENV=development vite build --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --environment jsdom",
    "test:watch": "vitest --environment jsdom",
    "build": "npm run typecheck && npm run test && cross-env ENV=production vite build",
    "preview": "vite preview",
    "commit": "lint-staged && git-cz"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react",
    "types": ["chrome", "vitest/globals"]
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"],
  "exclude": ["devtools", "node_modules"]
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

- [ ] **Step 6: Create shared types in `src/shared/types.ts`**

```ts
export type NodeHash = string;
export type OverlayId = '__hover__' | '__select__' | string;

export interface CanvasAttrs {
  [key: string]: unknown;
}

export interface CanvasBBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: {
    x: number;
    y: number;
  };
  transform?: string;
  transformOrigin?: string;
}

export interface CanvasTree {
  type: 'renderer' | 'group' | 'shape' | string;
  name: string;
  nodeType?: string;
  hash: NodeHash;
  id?: string | number;
  attrs?: CanvasAttrs;
  children?: CanvasTree[];
  count?: number;
  memory?: number;
  fps?: number;
}

export interface RuntimeShapeSelectedEvent {
  type: 'showShape';
  detail: {
    canvasHash: NodeHash;
    nodeHash: NodeHash;
  };
}

export interface RuntimeHoverClosedEvent {
  type: 'closeHover';
  detail?: Record<string, unknown>;
}

export type RuntimeEvent = RuntimeShapeSelectedEvent | RuntimeHoverClosedEvent;

export interface LegacyShapeSelectedMessage {
  type: 'showShape';
  detail: {
    hash: NodeHash;
    key: NodeHash;
  };
}

export type ExtensionRuntimeMessage = RuntimeEvent | LegacyShapeSelectedMessage;
```

- [ ] **Step 7: Create message normalization in `src/shared/type-guards.ts`**

```ts
import type { ExtensionRuntimeMessage, RuntimeEvent } from './types';

export function normalizeRuntimeEvent(message: ExtensionRuntimeMessage): RuntimeEvent | undefined {
  if (message.type === 'closeHover') {
    return message;
  }

  if (message.type === 'showShape') {
    const detail = message.detail;

    if ('canvasHash' in detail && 'nodeHash' in detail) {
      return message;
    }

    if ('hash' in detail && 'key' in detail) {
      return {
        type: 'showShape',
        detail: {
          canvasHash: detail.hash,
          nodeHash: detail.key,
        },
      };
    }
  }

  return undefined;
}
```

- [ ] **Step 8: Run tooling verification**

Run:

```bash
npm run typecheck
npm run test
```

Expected: both PASS. `npm run test` reports no test files or an empty passing suite depending on Vitest output.

- [ ] **Step 9: Commit tooling**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/shared/types.ts src/shared/type-guards.ts
git commit -m "chore: add typescript test tooling"
```

### Task 2: Pure UI Tree Model

**Files:**
- Create: `src/ui/tree-model.test.ts`
- Create: `src/ui/tree-model.ts`
- Delete after UI migration: `src/ui/utils/index.js`

- [ ] **Step 1: Write failing tests for tree conversion**

Create `src/ui/tree-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { CanvasTree } from '../shared/types';
import { buildTreeData, countDescendants } from './tree-model';

describe('tree-model', () => {
  const canvas: CanvasTree = {
    type: 'renderer',
    name: 'renderer',
    hash: 'canvas-1',
    children: [
      {
        type: 'Group',
        name: 'Group',
        hash: 'group-1',
        attrs: { name: 'hero' },
        children: [
          {
            type: 'Rect',
            name: 'Rect',
            nodeType: 'Shape',
            hash: 'rect-1',
            id: 7,
            attrs: { fill: 'red' },
          },
        ],
      },
    ],
  };

  it('counts descendants without mutating the input tree', () => {
    const before = JSON.stringify(canvas);

    expect(countDescendants(canvas)).toBe(2);
    expect(JSON.stringify(canvas)).toBe(before);
  });

  it('builds Ant Design tree data with renderer root metadata', () => {
    const tree = buildTreeData(canvas, true);

    expect(tree).toMatchObject({
      title: 'Layer',
      type: 'renderer',
      key: 'canvas-1',
      hash: 'canvas-1',
      num: 1,
      count: 2,
    });
    expect(tree.children?.[0]).toMatchObject({
      title: 'Group',
      type: 'group',
      key: 'group-1',
      attrs: { name: 'hero' },
      num: 1,
      count: 1,
    });
    expect(tree.children?.[0].children?.[0]).toMatchObject({
      title: 'Rect',
      type: 'shape',
      key: 'rect-1',
      id: 7,
      count: 0,
    });
  });
});
```

- [ ] **Step 2: Run the failing tree tests**

Run:

```bash
npm run test -- src/ui/tree-model.test.ts
```

Expected: FAIL with an import error for `./tree-model`.

- [ ] **Step 3: Implement `src/ui/tree-model.ts`**

```ts
import type { CanvasAttrs, CanvasTree, NodeHash } from '../shared/types';

export interface CanvasTreeData {
  title: string;
  type: 'renderer' | 'group' | 'shape';
  key: NodeHash;
  name: string;
  id?: string | number;
  hash: NodeHash;
  count: number;
  num: number;
  attrs?: CanvasAttrs;
  children?: CanvasTreeData[];
}

export function countDescendants(tree?: CanvasTree): number {
  if (!tree?.children?.length) {
    return 0;
  }

  return tree.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

export function buildTreeData(data: CanvasTree, isRoot = false): CanvasTreeData {
  const children = data.children?.map((child) => buildTreeData(child));
  const hasChildren = Boolean(children?.length);
  const normalizedType = isRoot ? 'renderer' : data.type === 'group' || data.type === 'Group' ? 'group' : 'shape';

  return {
    title: isRoot ? 'Layer' : data.type,
    type: normalizedType,
    key: data.hash,
    name: data.name,
    id: data.id,
    hash: data.hash,
    count: countDescendants(data),
    num: data.children?.length ?? 0,
    attrs: data.attrs,
    ...(hasChildren ? { children } : {}),
  };
}
```

- [ ] **Step 4: Run tree tests and typecheck**

Run:

```bash
npm run test -- src/ui/tree-model.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit tree model**

```bash
git add src/ui/tree-model.ts src/ui/tree-model.test.ts
git commit -m "feat: add typed canvas tree model"
```

### Task 3: Konva Index Runtime Core

**Files:**
- Create: `src/inspected/hash.ts`
- Create: `src/inspected/konva-types.ts`
- Create: `src/inspected/konva-index.test.ts`
- Create: `src/inspected/konva-index.ts`

- [ ] **Step 1: Write failing tests for Konva indexing**

Create `src/inspected/konva-index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { createKonvaIndex } from './konva-index';
import type { KonvaLikeNode } from './konva-types';

function fakeNode(input: {
  className: string;
  nodeType?: string;
  id?: number;
  attrs?: Record<string, unknown>;
  visible?: boolean;
  children?: KonvaLikeNode[];
  position?: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
  size?: { width: number; height: number };
}): KonvaLikeNode {
  const attrs = input.attrs ?? {};

  return {
    _id: input.id,
    className: input.className,
    nodeType: input.nodeType ?? input.className,
    attrs,
    __dev_hash: undefined,
    ancestor: undefined,
    visible: () => input.visible ?? true,
    hasChildren: () => Boolean(input.children?.length),
    getChildren: () => input.children ?? [],
    getRoot: undefined,
    get: (name: string) => attrs[name],
    getAttrs: () => attrs,
    setAttr: (name: string, value: unknown) => {
      attrs[name] = value;
    },
    getAbsolutePosition: () => input.position ?? { x: 0, y: 0 },
    getAbsoluteRotation: () => input.rotation ?? 0,
    getAbsoluteScale: () => input.scale ?? { x: 1, y: 1 },
    width: () => input.size?.width ?? 10,
    height: () => input.size?.height ?? 20,
  };
}

describe('createKonvaIndex', () => {
  it('builds serializable canvas trees and skips invisible children', () => {
    const visibleShape = fakeNode({
      className: 'Rect',
      nodeType: 'Shape',
      id: 11,
      attrs: { name: 'visible-shape' },
    });
    const invisibleShape = fakeNode({
      className: 'Circle',
      nodeType: 'Shape',
      visible: false,
    });
    const layer = fakeNode({
      className: 'Layer',
      children: [visibleShape, invisibleShape],
    });

    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => 123,
      getFps: () => 60,
      log: vi.fn(),
    });

    const trees = index.refresh();

    expect(trees).toHaveLength(1);
    expect(trees[0]).toMatchObject({
      type: 'renderer',
      name: 'renderer',
      memory: 123,
      fps: 60,
    });
    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children?.[0]).toMatchObject({
      type: 'Rect',
      name: 'Rect',
      nodeType: 'Shape',
      id: 11,
      attrs: { name: 'visible-shape' },
    });
  });

  it('reads attrs, updates attrs, checks canvas life, and computes bbox', () => {
    const shape = fakeNode({
      className: 'Rect',
      nodeType: 'Shape',
      attrs: { fill: 'red' },
      position: { x: 8, y: 9 },
      rotation: 45,
      scale: { x: 2, y: 3 },
      size: { width: 40, height: 50 },
    });
    const layer = fakeNode({ className: 'Layer', children: [shape] });
    const index = createKonvaIndex({
      getCanvasInstances: () => [layer],
      getPerformanceMemory: () => undefined,
      getFps: () => undefined,
      log: vi.fn(),
    });

    const [canvas] = index.refresh();
    const nodeHash = canvas.children?.[0].hash as string;

    expect(index.hasCanvas(canvas.hash)).toBe(true);
    expect(index.getAttrs(nodeHash)).toEqual({ fill: 'red' });

    index.updateAttr(nodeHash, 'fill', 'blue');

    expect(index.getAttrs(nodeHash)).toEqual({ fill: 'blue' });
    expect(index.getBBox(nodeHash)).toEqual({
      x: 8,
      y: 9,
      width: 40,
      height: 50,
      rotation: 45,
      scale: { x: 2, y: 3 },
      transform: 'scale(2, 3) rotate(45deg)',
      transformOrigin: 'top left',
    });
  });
});
```

- [ ] **Step 2: Run the failing Konva index tests**

Run:

```bash
npm run test -- src/inspected/konva-index.test.ts
```

Expected: FAIL with an import error for `./konva-index`.

- [ ] **Step 3: Create `src/inspected/konva-types.ts`**

```ts
import type { CanvasAttrs, NodeHash } from '../shared/types';

export interface KonvaLikeNode {
  _id?: string | number;
  className?: string;
  nodeType?: string;
  attrs?: CanvasAttrs;
  hash?: NodeHash;
  __dev_hash?: NodeHash;
  ancestor?: NodeHash;
  visible?: () => boolean;
  hasChildren?: () => boolean;
  getChildren?: () => KonvaLikeNode[];
  getLayers?: () => KonvaLikeNode[];
  getRoot?: () => { getChildren?: () => KonvaLikeNode[] };
  get?: (name: string) => unknown;
  getAttrs?: () => CanvasAttrs;
  setAttr?: (name: string, value: unknown) => void;
  getAbsolutePosition?: () => { x: number; y: number };
  getAbsoluteRotation?: () => number;
  getAbsoluteScale?: () => { x: number; y: number };
  width?: () => number;
  height?: () => number;
  destroy?: () => KonvaLikeNode;
  __konvaDevtoolDestroyPatched?: boolean;
}

export interface KonvaIndexEnvironment {
  getCanvasInstances(): KonvaLikeNode[];
  getPerformanceMemory(): number | undefined;
  getFps(): number | undefined;
  log(label: string, node: KonvaLikeNode | undefined): void;
}
```

- [ ] **Step 4: Create `src/inspected/hash.ts`**

```ts
let counter = 0;

export function createHash(prefix = 'kd'): string {
  counter += 1;
  return `${prefix}-${counter.toString(16)}`;
}

export function resetHashCounterForTests(): void {
  counter = 0;
}
```

- [ ] **Step 5: Implement `src/inspected/konva-index.ts`**

```ts
import type { CanvasAttrs, CanvasBBox, CanvasTree, NodeHash } from '../shared/types';
import { createHash } from './hash';
import type { KonvaIndexEnvironment, KonvaLikeNode } from './konva-types';

export interface KonvaIndex {
  refresh(): CanvasTree[];
  hasCanvas(hash: NodeHash): boolean;
  getNode(hash: NodeHash): KonvaLikeNode | undefined;
  getAttrs(hash: NodeHash): CanvasAttrs | undefined;
  updateAttr(hash: NodeHash, name: string, value: unknown): void;
  getBBox(hash: NodeHash): CanvasBBox;
  consoleNode(hash: NodeHash, label?: string): void;
}

function getNodeHash(node: KonvaLikeNode): NodeHash {
  if (!node.__dev_hash) {
    node.__dev_hash = createHash('node');
  }

  return node.__dev_hash;
}

function getCanvasRootChildren(canvas: KonvaLikeNode): KonvaLikeNode[] {
  const rootChildren = canvas.getRoot?.().getChildren?.();

  if (rootChildren) {
    return rootChildren;
  }

  return canvas.getChildren?.() ?? [];
}

function getVisibleChildren(node: KonvaLikeNode): KonvaLikeNode[] {
  return (node.getChildren?.() ?? []).filter((child) => child.visible?.() ?? true);
}

export function createKonvaIndex(env: KonvaIndexEnvironment): KonvaIndex {
  let globalMap: Record<NodeHash, KonvaLikeNode> = {};
  let canvases: KonvaLikeNode[] = [];

  function serializeNode(node: KonvaLikeNode, canvasHash: NodeHash): CanvasTree {
    const hash = getNodeHash(node);
    node.ancestor = canvasHash;
    globalMap[hash] = node;

    const children = getVisibleChildren(node).map((child) => serializeNode(child, canvasHash));
    const attrs = node.getAttrs?.() ?? node.attrs;
    const type = node.className ?? node.nodeType ?? 'group';

    return {
      type,
      name: type,
      nodeType: node.nodeType,
      hash,
      id: node._id ?? node.get?.('_id') as string | number | undefined,
      attrs,
      ...(children.length ? { children } : {}),
    };
  }

  function refresh(): CanvasTree[] {
    globalMap = {};
    canvases = env.getCanvasInstances();

    return canvases.map((canvas) => {
      const hash = canvas.hash ?? createHash('canvas');
      canvas.hash = hash;
      globalMap[hash] = canvas;

      return {
        type: 'renderer',
        name: 'renderer',
        nodeType: 'renderer',
        hash,
        children: getCanvasRootChildren(canvas).map((child) => serializeNode(child, hash)),
        memory: env.getPerformanceMemory(),
        fps: env.getFps(),
      };
    });
  }

  function getNode(hash: NodeHash): KonvaLikeNode | undefined {
    return globalMap[hash];
  }

  function getAttrs(hash: NodeHash): CanvasAttrs | undefined {
    const node = getNode(hash);
    return node?.getAttrs?.() ?? node?.attrs;
  }

  function updateAttr(hash: NodeHash, name: string, value: unknown): void {
    getNode(hash)?.setAttr?.(name, value);
  }

  function getBBox(hash: NodeHash): CanvasBBox {
    const node = getNode(hash);

    if (!node) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        scale: { x: 1, y: 1 },
      };
    }

    const position = node.getAbsolutePosition?.() ?? { x: 0, y: 0 };
    const rotation = node.getAbsoluteRotation?.() ?? 0;
    const scale = node.getAbsoluteScale?.() ?? { x: 1, y: 1 };
    const transform = `scale(${scale.x}, ${scale.y})${rotation ? ` rotate(${rotation}deg)` : ''}`;

    return {
      x: position.x,
      y: position.y,
      width: node.width?.() ?? 0,
      height: node.height?.() ?? 0,
      rotation,
      scale,
      transform,
      transformOrigin: 'top left',
    };
  }

  function hasCanvas(hash: NodeHash): boolean {
    return canvases.some((canvas) => canvas.hash === hash);
  }

  function consoleNode(hash: NodeHash, label = '<Click To Expand>'): void {
    env.log(label, getNode(hash));
  }

  return {
    refresh,
    hasCanvas,
    getNode,
    getAttrs,
    updateAttr,
    getBBox,
    consoleNode,
  };
}
```

- [ ] **Step 6: Run Konva index tests**

Run:

```bash
npm run test -- src/inspected/konva-index.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Konva index**

```bash
git add src/inspected/hash.ts src/inspected/konva-types.ts src/inspected/konva-index.ts src/inspected/konva-index.test.ts
git commit -m "feat: add typed konva index"
```

### Task 4: Page Overlay And Mouseover Runtime

**Files:**
- Create: `src/inspected/overlay.test.ts`
- Create: `src/inspected/overlay.ts`
- Create: `src/inspected/mouseover-inspector.ts`

- [ ] **Step 1: Write failing tests for overlay rendering**

Create `src/inspected/overlay.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import type { CanvasBBox } from '../shared/types';
import { clearOverlay, computeOverlayStyle, showOverlay } from './overlay';

describe('overlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('computes absolute overlay style from canvas root offset and transform', () => {
    const bbox: CanvasBBox = {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      rotation: 15,
      scale: { x: 2, y: 3 },
      transform: 'scale(2, 3) rotate(15deg)',
      transformOrigin: 'top left',
    };

    const style = computeOverlayStyle(bbox, { x: 100, y: 200 }, 'red');

    expect(style).toMatchObject({
      position: 'absolute',
      width: '30px',
      height: '40px',
      top: '220px',
      left: '110px',
      background: 'red',
      transform: 'scale(2, 3) rotate(15deg)',
      transformOrigin: 'top left',
    });
  });

  it('creates and clears overlay elements', () => {
    const root = document.createElement('div');
    root.className = 'konvajs-content';
    root.getBoundingClientRect = () => ({
      x: 5,
      y: 6,
      width: 100,
      height: 100,
      top: 6,
      left: 5,
      right: 105,
      bottom: 106,
      toJSON: () => ({}),
    });
    document.body.appendChild(root);

    showOverlay(
      { x: 1, y: 2, width: 3, height: 4, rotation: 0, scale: { x: 1, y: 1 } },
      '__hover__'
    );

    expect(document.querySelectorAll('.konva_devtool_rect')).toHaveLength(1);

    clearOverlay('__hover__');

    expect(document.querySelectorAll('.konva_devtool_rect')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the failing overlay tests**

Run:

```bash
npm run test -- src/inspected/overlay.test.ts
```

Expected: FAIL with an import error for `./overlay`.

- [ ] **Step 3: Implement `src/inspected/overlay.ts`**

```ts
import type { CanvasBBox, OverlayId } from '../shared/types';

export type OverlayStyle = Record<string, string>;

function getCanvasRoot(): Element | null {
  const targetWindow = window as Window & { __canvas_root__?: Element };
  return targetWindow.__canvas_root__ ?? document.querySelector('.konvajs-content');
}

export function computeOverlayStyle(
  bbox: CanvasBBox,
  rootOffset: { x: number; y: number },
  color = 'rgba(135, 59, 244, 0.5)'
): OverlayStyle {
  return {
    position: 'absolute',
    width: `${bbox.width}px`,
    height: `${bbox.height}px`,
    top: `${bbox.y + rootOffset.y}px`,
    left: `${bbox.x + rootOffset.x}px`,
    background: color,
    border: '2px dashed rgb(135, 59, 244)',
    boxSizing: 'border-box',
    zIndex: '10000',
    transform: bbox.transform ?? '',
    transformOrigin: bbox.transformOrigin ?? '',
  };
}

export function showOverlay(bbox: CanvasBBox, overlayId: OverlayId, color?: string): void {
  const canvasRoot = getCanvasRoot();

  if (!canvasRoot) {
    return;
  }

  clearOverlay(overlayId);

  const rect = canvasRoot.getBoundingClientRect();
  const el = document.createElement('div');
  el.classList.add('konva_devtool_rect');
  el.dataset.overlayId = overlayId;
  Object.assign(el.style, computeOverlayStyle(bbox, { x: rect.x, y: rect.y }, color));
  document.body.appendChild(el);
}

export function clearOverlay(overlayId?: OverlayId): void {
  const selector = overlayId
    ? `.konva_devtool_rect[data-overlay-id="${overlayId}"]`
    : '.konva_devtool_rect';

  document.querySelectorAll(selector).forEach((element) => {
    element.remove();
  });
}
```

- [ ] **Step 4: Implement `src/inspected/mouseover-inspector.ts`**

```ts
import type { CanvasBBox, NodeHash } from '../shared/types';
import type { KonvaIndex } from './konva-index';
import type { KonvaLikeNode } from './konva-types';
import { clearOverlay, showOverlay } from './overlay';

interface MouseoverInspectorOptions {
  index: KonvaIndex;
  getCanvasRoot(): Element | null;
  dispatchShapeSelected(canvasHash: NodeHash, nodeHash: NodeHash): void;
}

function containsPoint(bbox: CanvasBBox, x: number, y: number): boolean {
  return (
    bbox.x <= x &&
    bbox.x + bbox.width * bbox.scale.x >= x &&
    bbox.y <= y &&
    bbox.y + bbox.height * bbox.scale.y >= y
  );
}

function visit(node: KonvaLikeNode, visitor: (node: KonvaLikeNode) => void): void {
  visitor(node);
  node.getChildren?.().forEach((child) => visit(child, visitor));
}

export function createMouseoverInspector(options: MouseoverInspectorOptions): {
  setEnabled(enabled: boolean): void;
  dispose(): void;
} {
  let enabled = false;
  let lastNode: KonvaLikeNode | undefined;
  let clickHandler: (() => void) | undefined;

  function removeClickHandler(): void {
    if (clickHandler) {
      window.removeEventListener('click', clickHandler);
      clickHandler = undefined;
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const canvasRoot = options.getCanvasRoot();

    if (!canvasRoot) {
      return;
    }

    const rootRect = canvasRoot.getBoundingClientRect();
    const x = event.clientX - rootRect.x;
    const y = event.clientY - rootRect.y;
    const matches: KonvaLikeNode[] = [];

    options.index.refresh().forEach((canvas) => {
      const canvasNode = options.index.getNode(canvas.hash);
      if (!canvasNode) {
        return;
      }
      visit(canvasNode, (node) => {
        if (node.nodeType !== 'Shape' || !node.__dev_hash) {
          return;
        }
        const bbox = options.index.getBBox(node.__dev_hash);
        if (containsPoint(bbox, x, y)) {
          matches.push(node);
        }
      });
    });

    const nextNode = matches.sort((left, right) => {
      const leftSize = (left.width?.() ?? 0) + (left.height?.() ?? 0);
      const rightSize = (right.width?.() ?? 0) + (right.height?.() ?? 0);
      return leftSize - rightSize;
    })[0];

    if (!nextNode || nextNode === lastNode || !nextNode.__dev_hash || !nextNode.ancestor) {
      return;
    }

    clearOverlay('__hover__');
    removeClickHandler();
    showOverlay(options.index.getBBox(nextNode.__dev_hash), '__hover__');
    clickHandler = () => options.dispatchShapeSelected(nextNode.ancestor as NodeHash, nextNode.__dev_hash as NodeHash);
    window.addEventListener('click', clickHandler);
    lastNode = nextNode;
  }

  function setEnabled(nextEnabled: boolean): void {
    if (enabled === nextEnabled) {
      return;
    }

    enabled = nextEnabled;

    if (enabled) {
      window.addEventListener('mousemove', onMouseMove);
    } else {
      clearOverlay('__hover__');
      removeClickHandler();
      window.removeEventListener('mousemove', onMouseMove);
      lastNode = undefined;
    }
  }

  return {
    setEnabled,
    dispose() {
      setEnabled(false);
    },
  };
}
```

- [ ] **Step 5: Run overlay tests and typecheck**

Run:

```bash
npm run test -- src/inspected/overlay.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit overlay runtime**

```bash
git add src/inspected/overlay.ts src/inspected/overlay.test.ts src/inspected/mouseover-inspector.ts
git commit -m "feat: add inspected page overlay runtime"
```

### Task 5: Inspected Runtime Installer

**Files:**
- Create: `src/inspected/window-contract.ts`
- Create: `src/inspected/runtime.ts`
- Create: `src/inspected/entry.ts`

- [ ] **Step 1: Write failing runtime installation test**

Create `src/inspected/runtime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { installKonvaDevtoolRuntime } from './runtime';

describe('installKonvaDevtoolRuntime', () => {
  it('installs one idempotent runtime on window', () => {
    const first = installKonvaDevtoolRuntime(window);
    const second = installKonvaDevtoolRuntime(window);

    expect(first).toBe(second);
    expect(window.__KONVA_DEVTOOL__).toBe(first);
  });
});
```

- [ ] **Step 2: Run the failing runtime test**

Run:

```bash
npm run test -- src/inspected/runtime.test.ts
```

Expected: FAIL with an import error for `./runtime`.

- [ ] **Step 3: Create `src/inspected/window-contract.ts`**

```ts
import type { KonvaDevtoolRuntime } from './runtime';
import type { KonvaLikeNode } from './konva-types';

declare global {
  interface Window {
    Konva?: {
      stages?: KonvaLikeNode[];
      Layer?: {
        prototype?: {
          destroy?: () => KonvaLikeNode;
        };
      };
    };
    __KONVA_DEVTOOL__?: KonvaDevtoolRuntime;
    __canvas_instances__?: KonvaLikeNode[] & {
      globalMap?: Record<string, KonvaLikeNode>;
    };
    __canvas_root__?: Element;
    __fps_value?: number;
  }
}

export {};
```

- [ ] **Step 4: Implement `src/inspected/runtime.ts`**

```ts
import type { CanvasAttrs, CanvasBBox, CanvasTree, NodeHash, OverlayId } from '../shared/types';
import { createKonvaIndex } from './konva-index';
import type { KonvaLikeNode } from './konva-types';
import { createMouseoverInspector } from './mouseover-inspector';
import { clearOverlay, showOverlay } from './overlay';
import './window-contract';

export interface KonvaDevtoolRuntime {
  refresh(): CanvasTree[];
  hasCanvas(hash: NodeHash): boolean;
  getAttrs(hash: NodeHash): CanvasAttrs | undefined;
  updateAttr(hash: NodeHash, name: string, value: unknown): void;
  getBBox(hash: NodeHash): CanvasBBox;
  showOverlay(hash: NodeHash, overlayId: OverlayId, color?: string): void;
  clearOverlay(overlayId?: OverlayId): void;
  setMouseoverInspecting(enabled: boolean): void;
  consoleNode(hash: NodeHash, label?: string): void;
  dispose(): void;
}

function discoverCanvasInstances(targetWindow: Window): KonvaLikeNode[] {
  if (targetWindow.__canvas_instances__?.length) {
    return targetWindow.__canvas_instances__;
  }

  const layers: KonvaLikeNode[] = [];
  targetWindow.Konva?.stages?.forEach((stage) => {
    const stageLayers = stage.getLayers?.() ?? stage.getChildren?.() ?? [];
    stageLayers.forEach((layer) => layers.push(layer));
  });
  targetWindow.__canvas_instances__ = layers;
  return layers;
}

function getCanvasRoot(targetWindow: Window): Element | null {
  return targetWindow.__canvas_root__ ?? targetWindow.document.querySelector('.konvajs-content');
}

function getUsedHeapSize(targetWindow: Window): number | undefined {
  const performanceWithMemory = targetWindow.performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
    };
  };
  return performanceWithMemory.memory?.usedJSHeapSize;
}

export function installKonvaDevtoolRuntime(targetWindow: Window = window): KonvaDevtoolRuntime {
  if (targetWindow.__KONVA_DEVTOOL__) {
    return targetWindow.__KONVA_DEVTOOL__;
  }

  const index = createKonvaIndex({
    getCanvasInstances: () => discoverCanvasInstances(targetWindow),
    getPerformanceMemory: () => getUsedHeapSize(targetWindow),
    getFps: () => targetWindow.__fps_value,
    log: (label, node) => targetWindow.console.log(label, node),
  });

  const mouseoverInspector = createMouseoverInspector({
    index,
    getCanvasRoot: () => getCanvasRoot(targetWindow),
    dispatchShapeSelected: (canvasHash, nodeHash) => {
      targetWindow.dispatchEvent(
        new CustomEvent('showShape', {
          detail: {
            canvasHash,
            nodeHash,
          },
        })
      );
    },
  });

  const runtime: KonvaDevtoolRuntime = {
    refresh: () => index.refresh(),
    hasCanvas: (hash) => index.hasCanvas(hash),
    getAttrs: (hash) => index.getAttrs(hash),
    updateAttr: (hash, name, value) => index.updateAttr(hash, name, value),
    getBBox: (hash) => index.getBBox(hash),
    showOverlay: (hash, overlayId, color) => showOverlay(index.getBBox(hash), overlayId, color),
    clearOverlay: (overlayId) => clearOverlay(overlayId),
    setMouseoverInspecting: (enabled) => mouseoverInspector.setEnabled(enabled),
    consoleNode: (hash, label) => index.consoleNode(hash, label),
    dispose: () => {
      mouseoverInspector.dispose();
      clearOverlay();
    },
  };

  targetWindow.__KONVA_DEVTOOL__ = runtime;
  return runtime;
}
```

- [ ] **Step 5: Create bundled inspected runtime entry**

Create `src/inspected/entry.ts`:

```ts
import { installKonvaDevtoolRuntime } from './runtime';

installKonvaDevtoolRuntime(window);
```

- [ ] **Step 6: Run runtime tests**

Run:

```bash
npm run test -- src/inspected/runtime.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit runtime installer**

```bash
git add src/inspected/window-contract.ts src/inspected/runtime.ts src/inspected/runtime.test.ts src/inspected/entry.ts
git commit -m "feat: install inspected page runtime"
```

### Task 6: Eval Bridge And Runtime Client

**Files:**
- Create: `src/bridge/protocol.ts`
- Create: `src/bridge/serialization.ts`
- Create: `src/bridge/eval-bridge.test.ts`
- Create: `src/bridge/eval-bridge.ts`
- Create: `src/panel/runtime-client.ts`

- [ ] **Step 1: Write failing tests for eval bridge**

Create `src/bridge/eval-bridge.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the failing bridge tests**

Run:

```bash
npm run test -- src/bridge/eval-bridge.test.ts
```

Expected: FAIL with an import error for `./eval-bridge`.

- [ ] **Step 3: Create `src/bridge/protocol.ts`**

```ts
export class InspectedWindowEvalError extends Error {
  readonly exception: unknown;

  constructor(exception: unknown) {
    super('Failed to execute script in inspected window');
    this.name = 'InspectedWindowEvalError';
    this.exception = exception;
  }
}
```

- [ ] **Step 4: Create `src/bridge/serialization.ts`**

```ts
export function serializeFunctionCall<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => unknown,
  args: TArgs
): string {
  return `(${fn.toString()}).apply(window, ${JSON.stringify(args)})`;
}
```

- [ ] **Step 5: Implement `src/bridge/eval-bridge.ts`**

```ts
import { InspectedWindowEvalError } from './protocol';
import { serializeFunctionCall } from './serialization';

export interface InspectedWindowEvalAdapter {
  eval(script: string, callback: (result: unknown, exception?: unknown) => void): void;
}

export interface InspectedPageBridge {
  evaluate<TResult>(script: string): Promise<TResult>;
  execute<TArgs extends readonly unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
    args: TArgs
  ): Promise<TResult>;
}

export function createEvalBridge(adapter: InspectedWindowEvalAdapter): InspectedPageBridge {
  function evaluate<TResult>(script: string): Promise<TResult> {
    return new Promise((resolve, reject) => {
      adapter.eval(script, (result, exception) => {
        if (exception) {
          reject(new InspectedWindowEvalError(exception));
          return;
        }

        resolve(result as TResult);
      });
    });
  }

  return {
    evaluate,
    execute(fn, args) {
      return evaluate<Awaited<ReturnType<typeof fn>>>(serializeFunctionCall(fn, args));
    },
  };
}
```

- [ ] **Step 6: Implement `src/panel/runtime-client.ts`**

```ts
import type { InspectedPageBridge } from '../bridge/eval-bridge';
import type { CanvasAttrs, CanvasBBox, CanvasTree, NodeHash, OverlayId } from '../shared/types';
import '../inspected/window-contract';

type RuntimeMethod =
  | 'refresh'
  | 'hasCanvas'
  | 'getAttrs'
  | 'updateAttr'
  | 'getBBox'
  | 'showOverlay'
  | 'clearOverlay'
  | 'setMouseoverInspecting'
  | 'consoleNode'
  | 'dispose';

function callRuntime<TResult>(method: RuntimeMethod, args: unknown[]): TResult | undefined {
  const runtime = window.__KONVA_DEVTOOL__;
  const fn = runtime && runtime[method];

  if (typeof fn !== 'function') {
    return undefined;
  }

  return (fn as (...runtimeArgs: unknown[]) => TResult)(...args);
}

export interface RuntimeClient {
  install(): Promise<void>;
  refresh(): Promise<CanvasTree[]>;
  hasCanvas(hash: NodeHash): Promise<boolean>;
  getAttrs(hash: NodeHash): Promise<CanvasAttrs | undefined>;
  updateAttr(hash: NodeHash, name: string, value: unknown): Promise<void>;
  getBBox(hash: NodeHash): Promise<CanvasBBox>;
  showOverlay(hash: NodeHash, overlayId: OverlayId, color?: string): Promise<void>;
  clearOverlay(overlayId?: OverlayId): Promise<void>;
  setMouseoverInspecting(enabled: boolean): Promise<void>;
  consoleNode(hash: NodeHash, label?: string): Promise<void>;
}

export function createRuntimeClient(bridge: InspectedPageBridge, loadRuntimeScript: () => Promise<string>): RuntimeClient {
  return {
    install: async () => {
      const source = await loadRuntimeScript();
      await bridge.evaluate<void>(source);
    },
    refresh: () => bridge.execute(callRuntime, ['refresh', []] as const).then((result) => result ?? []),
    hasCanvas: (hash) => bridge.execute(callRuntime, ['hasCanvas', [hash]] as const).then(Boolean),
    getAttrs: (hash) => bridge.execute(callRuntime, ['getAttrs', [hash]] as const),
    updateAttr: (hash, name, value) => bridge.execute(callRuntime, ['updateAttr', [hash, name, value]] as const),
    getBBox: (hash) => bridge.execute(callRuntime, ['getBBox', [hash]] as const),
    showOverlay: (hash, overlayId, color) =>
      bridge.execute(callRuntime, ['showOverlay', [hash, overlayId, color]] as const),
    clearOverlay: (overlayId) => bridge.execute(callRuntime, ['clearOverlay', [overlayId]] as const),
    setMouseoverInspecting: (enabled) => bridge.execute(callRuntime, ['setMouseoverInspecting', [enabled]] as const),
    consoleNode: (hash, label) => bridge.execute(callRuntime, ['consoleNode', [hash, label]] as const),
  };
}
```

- [ ] **Step 7: Run bridge tests and typecheck**

Run:

```bash
npm run test -- src/bridge/eval-bridge.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit bridge and client**

```bash
git add src/bridge src/panel/runtime-client.ts
git commit -m "feat: add typed inspected window bridge"
```

### Task 7: Panel Controller And UI Migration

**Files:**
- Create: `src/panel/devtool-actions.ts`
- Create: `src/panel/controller.test.ts`
- Create: `src/panel/controller.ts`
- Rename: `src/ui/index.jsx` to `src/ui/index.tsx`
- Rename: `src/ui/components/Devtool.jsx` to `src/ui/App.tsx`
- Rename: `src/ui/components/Tree.jsx` to `src/ui/components/CanvasTree.tsx`
- Rename: `src/ui/components/HeadBar.jsx` to `src/ui/components/InspectorToolbar.tsx`
- Rename: `src/ui/components/AttrsDrawer.jsx` to `src/ui/components/AttrsDrawer.tsx`
- Create: `src/ui/components/CanvasSelector.tsx`

- [ ] **Step 1: Write failing tests for controller actions**

Create `src/panel/controller.test.ts`:

```ts
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

    expect(runtimeClient.showOverlay).toHaveBeenCalledWith('node-1', '__hover__', undefined);
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
```

- [ ] **Step 2: Run the failing controller tests**

Run:

```bash
npm run test -- src/panel/controller.test.ts
```

Expected: FAIL with an import error for `./controller`.

- [ ] **Step 3: Create `src/panel/devtool-actions.ts`**

```ts
import type { CanvasAttrs, CanvasTree, NodeHash, OverlayId } from '../shared/types';

export interface DevtoolActions {
  refreshCanvases(): Promise<CanvasTree[]>;
  checkCanvasAlive(hash: NodeHash): Promise<boolean>;
  showRect(hash: NodeHash, overlayId: OverlayId, color?: string): Promise<void>;
  clearRect(overlayId?: OverlayId): Promise<void>;
  getAttrs(hash: NodeHash): Promise<CanvasAttrs | undefined>;
  updateAttr(hash: NodeHash, name: string, value: unknown): Promise<void>;
  consoleElement(hash: NodeHash, label?: string): Promise<void>;
  setMouseoverInspecting(enabled: boolean): Promise<void>;
}
```

- [ ] **Step 4: Implement `src/panel/controller.ts`**

```ts
import type { CanvasTree, NodeHash, OverlayId } from '../shared/types';
import type { DevtoolActions } from './devtool-actions';
import type { RuntimeClient } from './runtime-client';

export interface DevtoolController {
  actions: DevtoolActions;
  getInitialData(): Promise<CanvasTree[]>;
}

export function createDevtoolController(runtimeClient: RuntimeClient): DevtoolController {
  const actions: DevtoolActions = {
    refreshCanvases: () => runtimeClient.refresh(),
    async checkCanvasAlive(hash: NodeHash) {
      const alive = await runtimeClient.hasCanvas(hash);

      if (!alive) {
        await runtimeClient.refresh();
      }

      return alive;
    },
    showRect: (hash: NodeHash, overlayId: OverlayId, color?: string) => runtimeClient.showOverlay(hash, overlayId, color),
    clearRect: (overlayId?: OverlayId) => runtimeClient.clearOverlay(overlayId),
    getAttrs: (hash: NodeHash) => runtimeClient.getAttrs(hash),
    updateAttr: (hash: NodeHash, name: string, value: unknown) => runtimeClient.updateAttr(hash, name, value),
    consoleElement: (hash: NodeHash, label?: string) => runtimeClient.consoleNode(hash, label),
    setMouseoverInspecting: (enabled: boolean) => runtimeClient.setMouseoverInspecting(enabled),
  };

  return {
    actions,
    async getInitialData() {
      await runtimeClient.install();
      return runtimeClient.refresh();
    },
  };
}
```

- [ ] **Step 5: Migrate React entry `src/ui/index.tsx`**

Rename `src/ui/index.jsx` to `src/ui/index.tsx` and replace its contents:

```tsx
import React from 'react';
import ReactDOM from 'react-dom';

import 'antd/dist/antd.css';
import App from './App';
import type { CanvasTree } from '../shared/types';
import type { DevtoolActions } from '../panel/devtool-actions';

export function mountDevtool(container: Element, data: CanvasTree[], actions: DevtoolActions): void {
  ReactDOM.render(<App data={data} actions={actions} />, container);
}
```

- [ ] **Step 6: Migrate app container `src/ui/App.tsx`**

Rename `src/ui/components/Devtool.jsx` to `src/ui/App.tsx` and replace its contents:

```tsx
import { Empty } from 'antd';
import React, { useEffect, useState } from 'react';

import type { DevtoolActions } from '../panel/devtool-actions';
import type { CanvasTree, NodeHash } from '../shared/types';
import { normalizeRuntimeEvent } from '../shared/type-guards';
import CanvasTreeView from './components/CanvasTree';
import InspectorToolbar from './components/InspectorToolbar';

interface AppProps {
  data: CanvasTree[];
  actions: DevtoolActions;
}

export default function App({ data: initialData, actions }: AppProps): JSX.Element {
  const [selectedNodeHash, setSelectedNodeHash] = useState<NodeHash>('');
  const [selectedCanvasHash, setSelectedCanvasHash] = useState<NodeHash>(initialData[0]?.hash ?? '');
  const [data, setData] = useState<CanvasTree[]>(initialData);
  const selectedCanvas = data.find((canvas) => canvas.hash === selectedCanvasHash);

  useEffect(() => {
    return () => {
      actions.clearRect();
    };
  }, [actions]);

  useEffect(() => {
    const handler = (message: unknown) => {
      const event = normalizeRuntimeEvent(message as never);

      if (event?.type === 'showShape') {
        setSelectedCanvasHash(event.detail.canvasHash);
        setSelectedNodeHash(event.detail.nodeHash);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  return (
    <div>
      <InspectorToolbar
        data={data}
        selectedCanvas={selectedCanvas}
        selectedCanvasHash={selectedCanvasHash}
        setData={setData}
        setSelectedCanvasHash={setSelectedCanvasHash}
        actions={actions}
      />
      <div style={{ marginTop: 48, position: 'relative', zIndex: 1 }}>
        {selectedCanvas ? (
          <CanvasTreeView actions={actions} data={selectedCanvas} selectedNodeHash={selectedNodeHash} />
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Migrate UI components**

Use the existing JSX markup from `Tree.jsx`, `HeadBar.jsx`, and `AttrsDrawer.jsx`, but change file extensions to `.tsx`, add typed props, and import `buildTreeData` from `../tree-model`. Preserve these behavior points:

```ts
actions.showRect(selectedKey, '__select__', 'rgba(29, 57, 196, 0.5)');
actions.showRect(node.hash, '__hover__');
actions.clearRect('__hover__');
actions.clearRect('__select__');
actions.setMouseoverInspecting(checked);
actions.consoleElement(selectedCanvas.hash);
```

Create `src/ui/components/CanvasSelector.tsx` for the dropdown:

```tsx
import { Select } from 'antd';
import React from 'react';

import type { CanvasTree, NodeHash } from '../../shared/types';

interface CanvasSelectorProps {
  data: CanvasTree[];
  selectedCanvasHash: NodeHash;
  onChange(hash: NodeHash): void;
}

export default function CanvasSelector({ data, selectedCanvasHash, onChange }: CanvasSelectorProps): JSX.Element {
  return (
    <Select
      bordered={false}
      size="small"
      options={data.map((canvas, index) => ({
        label: `Canvas ${index}`,
        value: canvas.hash,
      }))}
      value={selectedCanvasHash || undefined}
      onChange={onChange}
      style={{ width: '100%' }}
    />
  );
}
```

- [ ] **Step 8: Run controller and UI checks**

Run:

```bash
npm run test -- src/panel/controller.test.ts src/ui/tree-model.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit panel controller and UI**

```bash
git add src/panel src/ui
git commit -m "feat: migrate panel ui to typed actions"
```

### Task 8: Extension Shell And Vite Build

**Files:**
- Rename: `src/scripts/main.js` to `src/extension/devtools.ts`
- Rename: `src/scripts/background.js` to `src/extension/background.ts`
- Rename: `src/scripts/content-script.js` to `src/extension/content-script.ts`
- Replace: `src/scripts/panel.js` with `src/extension/panel.ts`
- Rename: `vite.config.js` to `vite.config.ts`
- Modify: `panel.html`
- Modify: `devtools.html`
- Modify: `manifest.json`

- [ ] **Step 1: Create extension shell files**

Create `src/extension/devtools.ts`:

```ts
let panelCreated = false;

function createPanel(): void {
  if (panelCreated) {
    return;
  }

  chrome.devtools.panels.create('Konva DevTool', 'icons/32.png', 'panel.html', (panel) => {
    panel.onHidden.addListener(() => {
      chrome.devtools.inspectedWindow.eval(`
        (function() {
          var elements = document.getElementsByClassName('konva_devtool_rect');
          [].forEach.apply(elements, [function (e) { e.remove(); }]);
          if (window.__KONVA_DEVTOOL__) {
            window.__KONVA_DEVTOOL__.clearOverlay();
            window.__KONVA_DEVTOOL__.setMouseoverInspecting(false);
          }
        })()
      `);
    });
  });

  chrome.runtime.sendMessage({
    isKonva: true,
    disabled: false,
  });
  panelCreated = true;
}

function checkForKonva(): void {
  chrome.devtools.inspectedWindow.eval(
    '!!((window.__canvas_instances__ && window.__canvas_instances__.length) || (window.Konva && window.Konva.stages && window.Konva.stages.length))',
    () => createPanel()
  );
}

chrome.devtools.network.onNavigated.addListener(() => {
  panelCreated = false;
  checkForKonva();
});

checkForKonva();
const interval = window.setInterval(() => {
  if (panelCreated) {
    window.clearInterval(interval);
    return;
  }
  checkForKonva();
}, 1000);
```

Create `src/extension/background.ts`:

```ts
chrome.runtime.onMessage.addListener((request, sender) => {
  if (!request?.isKonva || !sender?.tab?.id) {
    return;
  }

  if (request.disabled) {
    chrome.action?.setIcon({
      tabId: sender.tab.id,
      path: 'icons/48-disabled.png',
    });
    return;
  }

  chrome.action?.setIcon({
    tabId: sender.tab.id,
    path: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
  });
});
```

Create `src/extension/content-script.ts`:

```ts
function forwardWindowEvent(type: 'showShape' | 'closeHover'): void {
  window.addEventListener(type, (event) => {
    chrome.runtime.sendMessage({
      type,
      detail: event instanceof CustomEvent ? event.detail : undefined,
    });
  });
}

forwardWindowEvent('showShape');
forwardWindowEvent('closeHover');
```

- [ ] **Step 2: Create panel entry `src/extension/panel.ts`**

```ts
import { createEvalBridge } from '../bridge/eval-bridge';
import { createDevtoolController } from '../panel/controller';
import { createRuntimeClient } from '../panel/runtime-client';
import { mountDevtool } from '../ui';
import '../inspected/window-contract';

const bridge = createEvalBridge(chrome.devtools.inspectedWindow);
const runtimeClient = createRuntimeClient(bridge, async () => {
  const response = await fetch(chrome.runtime.getURL('scripts/inspected-runtime.js'));
  return response.text();
});
const controller = createDevtoolController(runtimeClient);

async function mount(): Promise<void> {
  const data = await controller.getInitialData();
  const container = document.getElementById('container');

  if (!container) {
    throw new Error('Konva DevTool panel container was not found');
  }

  mountDevtool(container, data, controller.actions);
}

chrome.tabs.onUpdated.addListener(() => {
  void bridge.execute(() => window.__KONVA_DEVTOOL__?.dispose(), [] as const).finally(() => {
    void runtimeClient.install();
  });
});

void mount();
```

- [ ] **Step 3: Update HTML files**

Modify `panel.html` so the body ends with:

```html
<body>
  <div id="container">loading...</div>
  <script type="module" src="./scripts/panel.js"></script>
</body>
```

Modify `devtools.html` so the body ends with:

```html
<body>
  <script type="module" src="./scripts/devtools.js"></script>
</body>
```

- [ ] **Step 4: Update `manifest.json` script paths**

Use:

```json
{
  "devtools_page": "devtools.html",
  "background": {
    "service_worker": "scripts/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "css": [],
      "js": ["scripts/content-script.js"]
    }
  ]
}
```

Keep the existing `name`, `description`, `version`, permissions, icons, CSP, and `action` fields.

- [ ] **Step 5: Replace Vite config**

Rename `vite.config.js` to `vite.config.ts` and use:

```ts
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const root = __dirname;
const production = process.env.ENV === 'production';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.ENV),
  },
  build: {
    outDir: path.resolve(root, 'devtools'),
    emptyOutDir: true,
    sourcemap: !production,
    rollupOptions: {
      input: {
        panel: path.resolve(root, 'src/extension/panel.ts'),
        devtools: path.resolve(root, 'src/extension/devtools.ts'),
        background: path.resolve(root, 'src/extension/background.ts'),
        'content-script': path.resolve(root, 'src/extension/content-script.ts'),
        'inspected-runtime': path.resolve(root, 'src/inspected/entry.ts'),
      },
      output: {
        entryFileNames: 'scripts/[name].js',
        chunkFileNames: 'scripts/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'ui/style.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: path.resolve(root, 'panel.html'), dest: path.resolve(root, 'devtools') },
        { src: path.resolve(root, 'devtools.html'), dest: path.resolve(root, 'devtools') },
        { src: path.resolve(root, 'icons'), dest: path.resolve(root, 'devtools') },
        { src: path.resolve(root, 'manifest.json'), dest: path.resolve(root, 'devtools') },
      ],
      watch: {},
    }),
  ],
});
```

- [ ] **Step 6: Run build verification**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: PASS. Confirm these files exist:

```bash
test -f devtools/scripts/panel.js
test -f devtools/scripts/devtools.js
test -f devtools/scripts/background.js
test -f devtools/scripts/content-script.js
test -f devtools/scripts/inspected-runtime.js
test -f devtools/panel.html
test -f devtools/devtools.html
test -f devtools/manifest.json
```

- [ ] **Step 7: Commit extension build**

```bash
git add src/extension src/scripts panel.html devtools.html manifest.json vite.config.ts vite.config.js devtools
git commit -m "feat: bundle typed extension entrypoints"
```

### Task 9: Remove Legacy Surfaces And Final Verification

**Files:**
- Delete: `src/scripts/main.js`
- Delete: `src/scripts/background.js`
- Delete: `src/scripts/content-script.js`
- Delete: `src/scripts/panel.js`
- Delete: `src/ui/utils/index.js`
- Verify: `devtools/`

- [ ] **Step 1: Remove legacy source files**

Run:

```bash
git rm src/scripts/main.js src/scripts/background.js src/scripts/content-script.js src/scripts/panel.js src/ui/utils/index.js
```

Expected: files are staged for deletion. If a file was already renamed by git, `git status --short` shows the rename instead of a separate deletion.

- [ ] **Step 2: Search for forbidden legacy references**

Run:

```bash
rg -n "window\\.mount|executeFuntionInInspectWindow|executeScriptInInspectWindow|src/scripts|ui\\.umd|__canvas_instances__\\.globalMap" src panel.html devtools.html manifest.json
```

Expected: no matches. References to `window.__canvas_instances__` without `.globalMap` are allowed for compatibility.

- [ ] **Step 3: Run full automated verification**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: PASS.

- [ ] **Step 4: Inspect generated manifest and panel HTML**

Run:

```bash
sed -n '1,180p' devtools/manifest.json
sed -n '1,120p' devtools/panel.html
sed -n '1,80p' devtools/devtools.html
```

Expected:

- `devtools/manifest.json` references `scripts/background.js` and `scripts/content-script.js`.
- `devtools/panel.html` references `./scripts/panel.js`.
- `devtools/devtools.html` references `./scripts/devtools.js`.
- `devtools/scripts/inspected-runtime.js` exists and is fetched by `src/extension/panel.ts`.

- [ ] **Step 5: Manual extension verification**

Run:

```bash
npm run build
```

Then load `konva-devtool/devtools` as an unpacked Chrome extension and verify:

- The "Konva DevTool" panel appears on a Konva page.
- The panel lists layers and shapes.
- Hovering a tree node shows a page overlay.
- Selecting a tree node shows a fixed page overlay.
- Enabling mouseover inspection and clicking a shape selects it in the tree.
- Editing an attr updates the Konva node.
- The console action logs the selected canvas or node in the inspected page console.
- Reloading the inspected page reconnects without duplicate hover listeners.

- [ ] **Step 6: Commit cleanup**

```bash
git add src panel.html devtools.html manifest.json vite.config.ts package.json package-lock.json devtools
git commit -m "refactor: remove legacy javascript extension surfaces"
```

## Final Review Checklist

- [ ] The design spec is covered by tasks 1-9.
- [ ] `src/shared/types.ts` contains the shared data model.
- [ ] `src/inspected/runtime.ts` installs `window.__KONVA_DEVTOOL__`.
- [ ] `devtools/scripts/inspected-runtime.js` is generated by Vite.
- [ ] UI components depend on `DevtoolActions`, not Chrome APIs or Konva globals.
- [ ] `vite.config.ts` bundles all extension entrypoints.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Generated `devtools/` can be loaded as an unpacked Chrome extension.
