# Talvex UI Merge Spec — Cohesive Shell (Scenarios + Blocks)

## Purpose
Ensure **Talvex Scenarios** and **Talvex Blocks** feel like one product:
- One app shell (header + layout rules)
- Shared typography / spacing / “Scandinavian minimal” tone
- No competing patterns across modules

This doc is **integration + alignment rules**.
For Blocks module UI structure, **`docs/ui/blocks-target-spec.md` is authoritative**.

---

## Repo reality (important)
This repo does **NOT** use `src/components`.

Current structure (examples):
- App shell: `src/app/App.tsx`
- Header: `src/app/components/TalvexHeader.tsx`
- Modules:
  - `src/modules/scenarios/ScenariosPage.tsx`
  - `src/modules/blocks/BlocksPage.tsx`
- Shared UI assets/icons: `src/shared/ui/icons.tsx`

(Keep all future guidance consistent with this.)

---

## Reference assets
Use these as visual targets:
- `docs/ui/Stitch/Scenarios.png` — Scenarios baseline look & tone
- `docs/ui/Stitch/Blocks.png` — Blocks baseline layout & hierarchy
- `docs/ui/blocks-target-spec.md` — Blocks UI structure and guardrails (authoritative)

---

## Non-negotiable principles
1. **Scenarios sets the visual language**
   - Typography scale, spacing rhythm, rounding, shadows, panel tone.
2. **Architectural / Scandinavian minimalism**
   - Clean hierarchy, calm surfaces, no heavy gradients, no noisy borders.
3. **Pattern reuse > new inventions**
   - Reuse existing card styles, button shapes, spacing tokens, and icon system.
4. **Do not break data contracts**
   - UI alignment must not require store/type changes unless explicitly approved.

---

## Navigation (module switching)
- Routing-based module switching:
  - `/scenarios` (default)
  - `/blocks`
- Header remains one shared shell.

No separate “module tabs” inside the right sidebar.

---

## Global layout rules (both modules)
### Main composition
- **Left:** 3D viewport (dominant, full height)
- **Right:** fixed-width sidebar (compact, scrollable content, sticky bottom action zone where applicable)

### Sizing & containment
- Sidebar width target: **~380–420px**, tuned per module content.
- Main split should feel consistent between modules (no sudden density changes).

---

## Blocks module UI rules (defers to blocks-target-spec)
Blocks must follow `docs/ui/blocks-target-spec.md` exactly. Key implications:

### Absolutely no right-sidebar tabs
- There are **NO TABS anywhere in Blocks**.
- Metrics must **NOT** be a sidebar tab.

### Metrics placement
- Metrics is a **floating panel on the left of the viewport**, separate from the sidebar.

### Sidebar content
- Sidebar contains only:
  - Title + divider
  - “Add New Block” dashed button
  - Block cards list (collapsible)
  - Sticky bottom action bar (Send / Save / Load)

(Everything above is enforced by the Blocks spec guardrails.)

---

## Scenarios module UI rules (keep current Scenarios patterns)
Scenarios keeps its right sidebar structure and tone:
- Option selector
- Metrics card(s)
- Pros / Cons lists
- “AI concept image” area and “Generate image” entry point (when present)

Do not introduce tab systems unless they already exist in the Scenarios implementation.

---

## Visual alignment checklist (acceptance criteria)
Implementation is correct when:
- Switching `/blocks` ↔ `/scenarios` feels like one cohesive product.
- Typography, rounding, shadow depth, and spacing rhythm feel consistent.
- Blocks module contains **zero tabs**, and Metrics remains a floating viewport panel.
- Shared icons/buttons follow the existing repo patterns (no new UI system).
- No store/type/renderer contract changes were needed for UI alignment.

---

## Notes
- `docs/ui/blocks-target-spec.md` wins if this doc conflicts with Blocks structure.
- Keep this doc focused on shell cohesion, not redesigning per-module information architecture.
