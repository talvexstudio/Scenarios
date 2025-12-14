# Blocks UI Target Spec (authoritative)

This spec defines the exact UI structure for the **Talvex Blocks** module.
Implementation must match the visual hierarchy and layout shown in the reference screenshot.

There are **NO TABS** in the Blocks UI.

---

## Global Layout

- Header remains unchanged (Talvex shell).
- Main content area is split into:
  - **Left**: 3D viewport (full height)
  - **Right**: Blocks sidebar (fixed width)
- **Metrics panel** is a separate floating panel on the left, NOT part of the sidebar.

---

## Blocks Sidebar (right-hand panel)

### Sidebar dimensions
- Fixed width, compact, approximately **380–420px**
- White background, rounded outer corners
- Scrollable content area
- Sticky bottom action bar

---

### Top section
- Title centered: **“Blocks”**
- Thin underline divider beneath title
- Below title: a **full-width dashed button**:
  - Label: “Add New Block”
  - Rounded, light outline, subtle hover
  - Icon on the left (+)

---

### Block cards list
Blocks are displayed as **stacked cards**.

Each block card:

#### Collapsed state
- Rounded card
- Left: circular colored icon (program color)
- Center:
  - Block name (e.g. “Block A”)
  - Subtitle: “4,608 m² • 8 Levels”
- Right: chevron icon (expand/collapse)

#### Expanded state
Inside the card, show controls in this order:

1. **Duplicate / Remove row**
   - Duplicate on left
   - Remove on right
   - Small, secondary buttons/icons

2. **Units**
   - Dropdown: Metric (m) / Imperial (ft)
   - Only shown for the first block

3. **Width**
   - Slider
   - Numeric value aligned right

4. **Depth**
   - Slider
   - Numeric value aligned right

5. **Levels + Level Height**
   - Same row
   - Levels stepper (− / value / +)
   - Level Height numeric input with unit (m or ft)

6. **Position (x, y, z)**
   - Three numeric inputs in a single row
   - Compact, evenly spaced

7. **Program**
   - Dropdown
   - Options: Retail, Office, Residential, Mixed, Others

---

## Metrics Panel (LEFT floating panel)

This panel is **NOT inside the Blocks sidebar**.

### Position & behavior
- Floating panel on the **left side of the viewport**
- Rounded white card
- Slight shadow
- Has a **collapse chevron** in the top-right
- Can be collapsed/expanded

### Content (always visible when expanded)

#### Header
- Title: **“Metrics”**

#### Metrics shown
1. **Total GFA**
   - Large numeric value
   - Unit (m² / ft²)

2. **Total Levels**
   - Integer

3. **By Function**
   - Retail
   - Office
   - Residential
   - Mixed
   - Others
   - Each line shows:
     - Colored dot
     - Function name
     - Area value with unit

No efficiency, no extra metrics beyond the above.

---

## Bottom Action Bar (inside Blocks sidebar)

- Sticky to bottom of sidebar
- Always visible

### Button hierarchy
1. **Primary**
   - Full-width
   - Label: “Send to Scenarios →”

2. **Secondary row**
   - Two buttons side-by-side:
     - “Save .TBK”
     - “Load .TBK”

---

## Scope Guardrails (non-negotiable)

- UI-only refactor.
- DO NOT:
  - Add tabs
  - Move Metrics into the sidebar
  - Change stores, renderer, or data contracts
  - Add new controls or validation
- Only restructure JSX, Tailwind classes, and layout.

---

## Acceptance Criteria

The implementation is correct if:
- Metrics appear as a separate floating panel with a collapse chevron.
- Blocks sidebar contains only block controls and actions.
- No tabs exist anywhere in the Blocks UI.
- Visual hierarchy matches the reference screenshot exactly.
- Switching between Blocks and Scenarios feels like one cohesive product.

