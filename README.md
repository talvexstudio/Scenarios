# Scenarios

Talvex Scenarios is now the host interface of a unified Talvex application that ships two tightly-coupled modules: the Scenarios dashboard for reviewing immutable options and the Blocks workshop for building parametric block stacks. Both modules run inside a shared Vite + React + TypeScript shell, reuse a common Three.js massing renderer, share contracts/state via Zustand, and include stubs for AI concept-image generation so the full product pipeline can evolve without architectural rewrites.

## Features
- **Scenarios module** with decision panel, program metrics, auto-spin toggle, and shared renderer that visualizes immutable ScenarioOption snapshots.
- **Blocks module** ("Talvex Blocks") workshop that edits block parameters, previews the geometry in real time, enforces the 3-option limit, and can send/replace options in Scenarios.
- **TBK Save/Load workflow** that exports/imports pure parameter JSON snapshots; overwrite confirmation protects unsent edits.
- **AI concept image UI** stub that captures the current viewport, accepts prompts, and simulates a generation pipeline for future backend integration.
- **Shared domain layer** (types, unit helpers, metrics computation, renderer) plus Zustand stores for session-global units and options management.

## Getting Started
1. Install dependencies at the repo root: 
pm install.
2. Run the dev server with 
pm run dev and open the printed localhost URL (defaults to /scenarios).
3. Build production assets via 
pm run build (outputs to /dist).

## Controls & Usage
- **Viewport**: Left-drag rotates, right-drag (or Ctrl-drag) pans, scroll zooms; toggle auto-spin in either module's canvas.
- **Scenarios dashboard**: Use the dropdown to pick an option; metrics card and renderer update instantly. AI modal is available under "AI concept image".
- **Blocks workshop**: Adjust block dimensions/positions/functions in the table, preview the stack live, then Send (or replace) to Scenarios, or Save/Load .TBK snapshots.
- **TBK files**: Downloads default to YYYYMMDDhhmmss_Talvex_block.TBK; loading validates schema and replaces the workshop state after confirmation.
