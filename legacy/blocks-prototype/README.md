# Blocks

Talvex Blocks is a browser-based parametric massing playground for quickly iterating on block studies with the same refined UI language as Talvex Scenarios. The application pairs a React + Three.js viewport with a collapsible systems sidebar for block parameters, metrics, and one-click exports, enabling architects to generate GFA insights and share-ready assets in minutes.

## Features

- React, Vite, and TypeScript foundation with Tailwind + shadcn tokens matching the Scenarios aesthetic
- Zustand-powered block store with sequential naming, per-block parameters, and first-block unit selection
- React Three Fiber + Drei viewport with stacked slabs, lighting, grid, and responsive orbit camera
- Live metrics for total GFA, per-program breakdown, and level counts with automatic unit conversion
- Export tools for GLB (via GLTFExporter) and JSON payloads (blocks + metrics) with timestamped filenames
- Floating metrics and export panels that mirror the Talvex Scenarios minimal UI
- Transform toolbar with Rhino-style move/rotate gizmo plus undo/redo history tracking
- Compact, collapsible block cards showing per-block area, duplicate/remove actions, and inline position controls

## Getting Started

1. Install dependencies: `npm install`
2. Start the Vite dev server: `npm run dev`
3. Open the provided localhost URL to view Talvex Blocks
4. Add or edit blocks from the right sidebar to see instant updates in the viewport and metrics

## Controls

- Orbit: left mouse drag
- Pan: middle mouse drag or shift + left drag
- Zoom: scroll wheel or pinch gesture
- Reset framing: double-click the canvas background to let OrbitControls ease back to the target
- Toggle gizmo mode: use the Move/Rotate buttons in the lower-left toolbar
- Undo / redo: `Ctrl + Z` / `Ctrl + R`
