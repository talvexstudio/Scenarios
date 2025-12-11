# Scenarios

Talvex Scenarios is a minimalist, browser-based review tool that combines an interactive Three.js massing viewer with a decision panel so designers and stakeholders can compare architectural options at a glance. The experience was built to plug in real glTF assets later, expose metrics pulled from BIM workflows, and now includes UI stubs for AI concept-image generation so visual studies can be triggered without leaving the app.

## Features
- **Three.js viewport** with OrbitControls, auto-spin toggle, ground plane, grid, and imported city context.
- **Option board** that lists GFA/efficiency/height, program mix, pros/cons, and updates UI + 3D when you switch between Options A–C.
- **AI concept image UI** that captures the current render, accepts prompts, and simulates generation so hooks are ready for backend integration.
- **Configuration workflow** (separate page) for uploading context and option files and storing data in localStorage for future loading.

## Getting Started
1. Clone the repo and install any static-server tool you prefer (no build step required).
2. Serve the folder locally, e.g. `python -m http.server 8000`, then visit `http://localhost:8000/index.html`.
3. For the configure wizard, open `configure.html` from the same server so styles remain shared.

## Controls & Usage
- **Viewport**: Left-click drag rotates, right-click (or Ctrl-drag) pans, scroll zooms. Toggle auto-spin via the button in the canvas.
- **Option select**: Use the dropdown to switch between Options A, B, and C; metrics and pros/cons update automatically.
- **AI generator**: Click 'Generate image' to open the modal; the current render is captured automatically, and the placeholder workflow demonstrates the future flow.
- **Configure page**: Add context/option GLBs and metrics JSON files; removal buttons appear once multiple options exist.