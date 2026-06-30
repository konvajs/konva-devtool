# Konva DevTool TypeScript Architecture Design

## Goal

Refactor `konva-devtool` into a modular TypeScript Chrome DevTools extension while preserving the current user-facing debugging workflow for Konva applications.

## Background

`konva-devtool` is a Chrome DevTools extension for inspecting Konva canvas applications. The current extension creates a DevTools panel, reads Konva layers and shapes from the inspected page, renders the shape tree in React, highlights selected shapes on the page, allows attrs editing, and prints selected nodes to the inspected page console.

The current implementation works, but most of the extension behavior is concentrated in `src/scripts/panel.js`. That file owns the Chrome DevTools eval bridge, inspected-page runtime functions, Konva tree extraction, DOM overlay rendering, mouseover shape selection, React mounting, and UI action wiring. Because these responsibilities share implicit `window` state and untyped action contracts, the code is hard to test, hard to change, and risky to migrate incrementally.

## Scope

This refactor will keep the product behavior intact and rebuild the internal architecture around typed modules.

In scope:

- Convert source files from JavaScript and JSX to TypeScript and TSX.
- Introduce typed extension entrypoints for DevTools page, panel page, background service worker, and content script.
- Replace the monolithic panel script with explicit modules for Chrome bridge, inspected-page runtime, panel controller, and React UI.
- Define typed data structures for canvas trees, node attrs, overlay boxes, bridge commands, and runtime events.
- Install a single inspected-page runtime at `window.__KONVA_DEVTOOL__`.
- Keep compatibility with existing `window.__canvas_instances__` and `window.__canvas_root__` conventions.
- Add focused automated tests for runtime data shaping and panel bridge behavior.
- Keep `devtools/` as the build output that users can load as an unpacked Chrome extension.

Out of scope:

- Redesigning the visible UI.
- Changing the extension manifest version.
- Adding support for non-Chrome browsers.
- Adding new Konva editing features beyond existing attrs editing.
- Publishing to the Chrome Web Store.

## Architecture

The refactor will organize the code into four layers.

### Extension Shell

The extension shell contains code that directly depends on Chrome extension APIs. It is responsible for lifecycle and wiring, not Konva inspection logic.

Files:

- `src/extension/devtools.ts`
- `src/extension/panel.ts`
- `src/extension/background.ts`
- `src/extension/content-script.ts`
- `src/extension/chrome-types.ts`

Responsibilities:

- Create the "Konva DevTool" DevTools panel.
- Forward `showShape` and `closeHover` events from the inspected page to extension runtime messages.
- Update the extension action icon based on Konva availability.
- Mount the React panel application.
- Reinitialize the panel controller when the inspected tab changes.

The interface exposed to the rest of the app should be small: extension modules construct adapters and pass them into the panel controller.

### Bridge Protocol

The bridge protocol defines how panel code executes typed commands in the inspected page.

Files:

- `src/bridge/eval-bridge.ts`
- `src/bridge/protocol.ts`
- `src/bridge/serialization.ts`

Responsibilities:

- Wrap `chrome.devtools.inspectedWindow.eval`.
- Execute inspected-page functions with JSON-serializable arguments.
- Normalize eval exceptions into typed errors.
- Define command and event types shared by panel and runtime.

Primary interface:

```ts
export interface InspectedPageBridge {
  execute<TArgs extends readonly unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
    args: TArgs
  ): Promise<TResult>;
}
```

The bridge keeps the implementation detail that functions are stringified for `inspectedWindow.eval`. Callers should not build eval strings directly.

### Inspected Page Runtime

The inspected-page runtime is installed into the page being debugged. It owns Konva-specific behavior and page overlays.

Files:

- `src/inspected/runtime.ts`
- `src/inspected/konva-index.ts`
- `src/inspected/overlay.ts`
- `src/inspected/mouseover-inspector.ts`
- `src/inspected/window-contract.ts`

Responsibilities:

- Discover Konva layers from `window.__canvas_instances__` or `window.Konva.stages`.
- Maintain a hash-to-node index for layers and shapes.
- Build a serializable canvas tree for the panel UI.
- Read and update node attrs.
- Compute bounding boxes including absolute position, scale, and rotation.
- Draw and clear page overlays.
- Enable mouseover selection in the inspected page.
- Dispatch `showShape` and `closeHover` events for the content script.

Primary runtime interface installed on `window.__KONVA_DEVTOOL__`:

```ts
export interface KonvaDevtoolRuntime {
  refresh(): CanvasTree[];
  hasCanvas(hash: string): boolean;
  getAttrs(hash: string): CanvasAttrs | undefined;
  updateAttr(hash: string, name: string, value: unknown): void;
  getBBox(hash: string): CanvasBBox;
  showOverlay(hash: string, overlayId: OverlayId, color?: string): void;
  clearOverlay(overlayId?: OverlayId): void;
  setMouseoverInspecting(enabled: boolean): void;
  consoleNode(hash: string, label?: string): void;
}
```

The runtime should be idempotent. Installing it multiple times after navigation or reload must not register duplicate listeners.

### Panel Controller and UI

The panel controller adapts runtime operations into actions consumed by React.

Files:

- `src/panel/controller.ts`
- `src/panel/devtool-actions.ts`
- `src/panel/runtime-client.ts`
- `src/ui/index.tsx`
- `src/ui/App.tsx`
- `src/ui/components/CanvasSelector.tsx`
- `src/ui/components/InspectorToolbar.tsx`
- `src/ui/components/CanvasTree.tsx`
- `src/ui/components/AttrsDrawer.tsx`
- `src/ui/tree-model.ts`

Responsibilities:

- Load and refresh canvas trees.
- Keep selected canvas and selected node state.
- Expose typed UI actions.
- Handle runtime events from content script messages.
- Render the existing tree, toolbar, status tag, attrs drawer, and console action.

Primary UI action interface:

```ts
export interface DevtoolActions {
  refreshCanvases(): Promise<CanvasTree[]>;
  checkCanvasAlive(hash: string): Promise<boolean>;
  showRect(hash: string, overlayId: OverlayId, color?: string): Promise<void>;
  clearRect(overlayId?: OverlayId): Promise<void>;
  getAttrs(hash: string): Promise<CanvasAttrs | undefined>;
  updateAttr(hash: string, name: string, value: unknown): Promise<void>;
  consoleElement(hash: string, label?: string): Promise<void>;
  setMouseoverInspecting(enabled: boolean): Promise<void>;
}
```

React components should use this interface only. They should not reference Chrome APIs, eval strings, or Konva globals.

## Data Model

Shared types live in `src/shared/types.ts`.

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
```

The current implementation uses `{ hash, key }` in `showShape` events. The new runtime should emit `{ canvasHash, nodeHash }` internally while the content script accepts both shapes during migration.

## Build Design

The current Vite build compiles only the UI bundle and copies plain JavaScript scripts into `devtools/`. The new build should typecheck and bundle every extension entrypoint.

Required outputs:

- `devtools/devtools.html`
- `devtools/panel.html`
- `devtools/manifest.json`
- `devtools/icons/*`
- `devtools/scripts/devtools.js`
- `devtools/scripts/panel.js`
- `devtools/scripts/background.js`
- `devtools/scripts/content-script.js`
- `devtools/ui/style.css`

The `panel.html` file should load the built panel script, and the panel script should mount React directly. It should no longer depend on a global `window.mount` from a separate UMD bundle.

## Compatibility

The refactor must preserve these page integration points:

- If `window.__canvas_instances__` exists and contains instances, use it.
- If no custom instances exist, read layers from `window.Konva.stages`.
- If `window.__canvas_root__` exists, use it as the overlay coordinate root.
- Otherwise use `document.querySelector('.konvajs-content')`.
- Keep overlay class name `konva_devtool_rect` so existing cleanup behavior remains compatible.

The runtime may write additional internal state under `window.__KONVA_DEVTOOL__`, but it should not require application code to change.

## Error Handling

- If no Konva instance exists, the panel should render the existing empty state.
- If a canvas hash is no longer alive, the controller should refresh canvas data and report the selected canvas as dead until a replacement is selected.
- If an attrs read or update targets a missing node, the runtime should return `undefined` or no-op instead of throwing into the panel UI.
- Eval bridge exceptions should include the original Chrome exception details when available.
- Runtime install should be idempotent after tab update and navigation events.

## Testing Strategy

Add a lightweight test setup for TypeScript modules.

Unit tests:

- `src/ui/tree-model.test.ts`: verifies tree data conversion and descendant counts.
- `src/inspected/konva-index.test.ts`: verifies fake Konva nodes are indexed into `CanvasTree` and invisible children are skipped.
- `src/inspected/overlay.test.ts`: verifies overlay style computation uses canvas root offsets, scale, and rotation.
- `src/bridge/eval-bridge.test.ts`: verifies successful eval resolution and typed exception rejection.
- `src/panel/controller.test.ts`: verifies refresh, selected canvas recovery, and mouseover toggle calls.

Build verification:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Manual verification:

- Load `konva-devtool/devtools` as an unpacked extension in Chrome.
- Open a Konva sample page.
- Confirm the panel lists layers and shapes.
- Hover tree nodes and confirm overlays appear.
- Select a shape and confirm fixed overlay appears.
- Enable mouseover inspection and click a page shape; confirm the tree selects the shape.
- Edit an attr and confirm the Konva node updates.
- Click console action and confirm the node logs in the inspected page console.

## Migration Plan

The implementation should migrate in stages:

1. Add TypeScript config, test runner, Chrome global types, and shared data types.
2. Extract pure UI tree model functions and tests.
3. Build the inspected-page runtime around fake Konva nodes and tests.
4. Build the eval bridge and runtime client.
5. Replace `panel.js` with the typed panel controller and React mount.
6. Convert extension shell scripts to TypeScript.
7. Update Vite build to bundle all entrypoints.
8. Remove obsolete global `window.mount` and copied source scripts.
9. Run automated verification and then manual extension verification.

## Risks

- Chrome extension pages have stricter CSP than normal web apps. The bridge still relies on `inspectedWindow.eval`, so serialization must remain inside the DevTools API rather than extension page `eval`.
- The current runtime mutates Konva layer `destroy` methods. The refactor should isolate this patch and guard against double-patching.
- Some applications may populate `window.__canvas_instances__` with non-layer custom renderers. Runtime discovery should keep the current `getRoot` and `getChildren` fallback behavior.
- Mouseover hit testing currently uses bounding boxes and ignores rotation in point matching. The refactor should preserve this behavior unless a later feature explicitly changes it.

## Acceptance Criteria

- All source entrypoints are TypeScript or TSX.
- React components compile without implicit `any` for their public props.
- No UI component calls `chrome.*`, `inspectedWindow.eval`, or `window.Konva`.
- The inspected-page runtime is accessible through `window.__KONVA_DEVTOOL__`.
- Existing extension behavior listed in the scope section still works.
- `npm run typecheck`, `npm run test`, and `npm run build` complete successfully.
- The generated `devtools/` directory can be loaded as an unpacked Chrome extension.
