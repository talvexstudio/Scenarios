# Scenarios

Talvex Scenarios is the unified host experience for Talvex’s concept review workflow. It bundles two modules inside a single Vite + React + TypeScript shell:

- **Scenarios** for reviewing immutable options with metrics, AI image stubs, and context overlays.
- **Blocks** for authoring parametric block stacks, managing session-wide context, and pushing / replacing options.

Both modules share a Three.js renderer, Zustand stores, and the TBK interchange format so the product can evolve without architectural rewrites.

## Features
- **Scenarios dashboard** – option selector, metrics board, AI concept-image modal, and shared renderer that visualizes immutable `ScenarioOption` snapshots alongside OSM context massing.
- **Blocks workshop** – edit block dimensions, per-level stacks, program assignments, rotation/position axes, and use the floating Power Tools HUD (move/rotate, undo/redo, rename, etc.) to manage designs before sending them to Scenarios.
- **Multi-select + history** – ordered selections keep a stable reference block, selection syncs between viewport and cards, and the undo/redo stack (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) protects edits.
- **Rename & selection-safe editing** – inline renaming with auto-unique names, hover pencil affordance, and keyboard-scoped shortcuts so native text undo keeps working.
- **Context pipeline** – fetch Overpass footprints, convert to local coordinates, persist (with TBK) and render as muted massing in both modules.
- **TBK Save/Load** – download parameter-only TBK snapshots, load them with schema validation and overwrite confirmation; only the “present” state is serialized (history stays local).
- **Shared utilities** – domain types, unit conversions, metric computations, clone helpers, and renderer host keep Scenarios + Blocks consistent.

## Getting Started
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev` and open the printed localhost URL (default `/scenarios`).
3. Build production assets: `npm run build` (outputs to `/dist`).

## Controls & Usage
- **Viewport**: Left-drag rotates, right/Ctrl-drag pans, scroll zooms. Auto-spin toggle sits inside each canvas.
- **Scenarios**: Switch options via the dropdown, trigger “Configure options” or “Context” modals, and launch the AI concept image modal from the right panel.
- **Blocks**: Adjust sliders/inputs, rename via the pencil icon (Enter = commit, Esc = revert), use the Power Tools HUD for undo/redo, alignments, and stack helpers, then Send or replace options in Scenarios. Save/Load `.TBK` for offline editing.
- **Keyboard**: Ctrl/Cmd + Z (undo), Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (redo). Input fields suppress the global shortcuts so native text undo still works.
