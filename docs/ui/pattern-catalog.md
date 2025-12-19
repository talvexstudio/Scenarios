# UI Pattern Catalog

## src/app/components/TalvexHeader.tsx – `TalvexHeader`
- Provides the global black header with Talvex logo, module-aware title, and "About" trigger.
- Keeps layout consistent across `/scenarios` and `/blocks`, so reuse whenever a page needs the product shell.

## src/shared/three/RendererHost.tsx – `RendererHost`
- Lifecycle host for the shared Three.js renderer: mounts canvas, wires models/context/auto-spin/selection, manages dispose.
- Use as the only way to embed the massing viewport in modules that need block/context visualization.

## src/modules/blocks/BlocksPage.tsx – `BlockCard`
- Represents a single block panel with summary, inline rename, parameter controls, duplicate/remove actions, and collapse.
- Reuse for any list of editable blocks where the same controls and visual hierarchy are required.

## src/modules/blocks/BlocksPage.tsx – `SliderControl`
- Generic label + slider with min/max endpoints and change handler (used for width/depth).
- Reuse for continuous numeric inputs needing the same minimal slider styling.

## src/modules/blocks/BlocksPage.tsx – `LevelsHeightRow`
- Paired controls for Levels (stepper) and Level Height (numeric input with unit suffix) under a shared label.
- Reuse whenever a dual-field row needs a minus/plus + numeric combo laid out identically.

## src/modules/blocks/BlocksPage.tsx – `ToolButton`
- Atom used by the Power Tools HUD for icon-only buttons with tooltip overlay and disabled state.
- Reuse for any icon action inside floating HUDs or compact toolbars requiring consistent hover/tooltip treatment.

## src/modules/blocks/BlocksPage.tsx – `PowerToolsHud`
- Floating widget that anchors bottom-left of the viewport, houses undo/redo + alignment tools with collapse state.
- Reuse when exposing scene-level utilities that should stay inside the viewport rather than in sidebars.

## src/modules/blocks/BlocksPage.tsx – `PositionRow`
- Three compact numeric inputs for X/Y/Z positions with axis labels and shared styling.
- Reuse for any XYZ coordinate editing block (position, offsets) to ensure consistent order and styling.

## src/modules/blocks/BlocksPage.tsx – `AnglesRow`
- Wrapper that renders three `AngleControl`s for rotation axes, mapping UI labels to stored fields.
- Reuse whenever block rotations need to be displayed/edited as degrees in the X/Y/Z grid.

## src/modules/blocks/BlocksPage.tsx – `AngleControl`
- Handles a single angle input: label, bordered input, normalization, and update callback.
- Reuse for other angle fields that require the same normalization and presentation.

## src/modules/blocks/BlocksPage.tsx – `MetricsPanel`
- Floating metrics card for Blocks: collapsible panel showing Total GFA, Levels, and GFA by function.
- Reuse for other viewport overlays that need Talvex’s metrics card styling and collapse affordance.

## src/modules/scenarios/ScenariosPage.tsx – `MetricsCard`
- Read-only option summary showing GFA, Levels, and per-program metrics with bold values.
- Reuse in any context where immutable scenario metrics need a compact card presentation.

## src/modules/scenarios/ScenariosPage.tsx – `ProsCons`
- Renders Pros/Cons bullet lists with uppercase labels and minimal spacing.
- Reuse for any evaluation narrative that needs the same hierarchy and bullet styling.

## src/modules/scenarios/ScenariosPage.tsx – `ContextMap`
- Leaflet map wrapper with marker + click handling for selecting context center.
- Reuse whenever the product needs a lightweight map picker with the same tile styling and event wiring.

## src/modules/scenarios/ScenariosPage.tsx – `MapClickHandler`
- Isolates Leaflet click/marker placement logic for the context map.
- Reuse when additional map layers or interactions need to reuse the standardized click behavior.

## src/modules/scenarios/ScenariosPage.tsx – `MapCenterUpdater`
- React helper that syncs Leaflet map view to lat/lon inputs (centers map when inputs change).
- Reuse when other map components must keep view, marker, and input state in lockstep.
