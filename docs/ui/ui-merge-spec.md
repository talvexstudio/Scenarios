# Talvex UI Merge Spec — Blocks Integrated into Scenarios

## Purpose
Integrate the **Talvex Blocks** module into the **Talvex Scenarios** host app so both feel like one cohesive product. Blocks becomes a “workshop” mode; Scenarios remains the dashboard/viewer. This doc defines UI alignment rules and acceptance criteria for implementation.

## Reference Screenshots
- `docs/ui/scenarios-shell.png` — baseline styling and layout reference (authoritative)
- `docs/ui/blocks-current.png` — current Blocks prototype (functional reference)
- `docs/ui/stitch/variant-*.png` — optional visual targets from Stitch (implementation inspiration)

## Design Principles (Non-negotiable)
1. **Scenarios is the source of truth for aesthetics**
   - Match its typography scale, spacing rhythm, rounded corners, shadows, and panel tone.
2. **Architectural / Scandinavian minimalism**
   - Clear hierarchy, calm UI, no heavy gradients, no noisy borders.
3. **Pro / compact density**
   - Reduce vertical padding where possible while maintaining clarity.
4. **Single app shell**
   - One header, one layout system, consistent component library.

## Navigation
- Provide module switching in a way consistent with Scenarios (routes or tabs):
  - `/scenarios` (default)
  - `/blocks`
- The header remains unchanged.

## Layout
### Main composition
- Left: 3D viewport (dominant)
- Right: fixed-width sidebar (compact)
- Sidebar width: **as narrow as possible while still readable** (target: ~360px; adjust to fit content).

### Sidebar structure (Blocks module)
- **One right sidebar** with **two tabs**:
  - **Blocks** tab (default)
  - **Metrics** tab
- Sticky bottom action bar inside the sidebar (always visible).

## Blocks Tab Requirements
### Top controls
- A small **Add Block** button at top of Blocks tab.
- Optional: a compact “Session units” indicator (read-only), since units are session-global.

### Blocks list interaction
- Blocks appear as **stacked cards** with **collapsible details** (accordion-like).
- Each block card header includes:
  - Block name (e.g., Block A)
  - Compact summary (e.g., `4,608 m² • 8 levels`)
  - Collapse chevron
- Card header also includes small actions:
  - Duplicate (button or icon)
  - Remove (button or icon; disabled if only 1 block if desired)

### Block controls (inside collapsible)
Controls must be consistent in styling (inputs/sliders/selects), aligned, compact.

Per block:
- Units dropdown **only for the first block**
  - Options: Metric (m), Imperial (ft)
  - Disabled/hidden for other blocks
- xSize slider + numeric input
- ySize slider + numeric input
- levels integer control (slider or stepper)
- levelHeight slider/stepper with **1 decimal precision**
- position X / Y / Z numeric inputs (step 1)
- defaultFunction dropdown:
  - Retail, Office, Residential, Mixed, Others

## Metrics Tab Requirements
Show real-time computed metrics for the current workshop model:
- Total GFA
- Total Levels
- GFA by function:
  - Retail, Office, Residential, Mixed, Others
- Display units follow session units (m² or ft²)
- Use subtle colored dots/markers consistent with the product (no neon)

## Sticky Bottom Action Bar (Blocks module)
Always visible at the bottom of sidebar:
1. Primary button: **Send to Scenarios**
2. Secondary button: **Save .TBK**
3. Tertiary button: **Load .TBK**

Behavioral notes:
- Send disabled if no valid blocks (or no geometry).
- Save disabled if no valid blocks.
- Load opens file picker.

## Modals / Dialogs
### Replace option modal (Scenarios capacity)
When sending and Scenarios already has **3 options**, show a modal:
- Title: “Replace an existing option?”
- Body: list of existing 3 options with name + key metrics
- Actions:
  - Replace selected option
  - Cancel

### Load overwrite confirmation
If loading a TBK would overwrite current workshop edits:
- Confirm: “Overwrite current Blocks model?”
- Actions: Overwrite / Cancel

## Visual Alignment Checklist (Acceptance Criteria)
Implementation is acceptable when:
- Sidebar cards, inputs, and typography match Scenarios visual language (same “family”).
- Controls are compact and aligned; no mismatched padding/rounding between modules.
- Tabs feel native (same style as Scenarios).
- Sticky action bar remains visible while scrolling block cards.
- No “prototype UI” artifacts remain (e.g., mismatched fonts, dark-only panels, inconsistent shadows).

## File / Asset Guidance
- Place Stitch mockups at: `docs/ui/stitch/variant-a.png`, etc.
- Use these images only as references; do not hardcode layout sizes from the images.

## Notes
- Blocks is a workshop; Scenarios options are immutable snapshots.
- Orbit interaction only in Scenarios option view.
- GLB export exists as an optional advanced feature; TBK saves params only.
