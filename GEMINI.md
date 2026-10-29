# Gloop Runner - Architecture & Engineering Rules

## 1. Single-File Pure Web Standards
- Maintain strict synchronization between `gloop_runner.html` and `index.html`.
- Zero external media assets: All audio must be synthesized via the Web Audio API; all sprites and backgrounds must be drawn procedurally via HTML5 2D Canvas.

## 2. Canvas Rendering & State Invariants
- **Idle Loop Required**: The game MUST initialize an active idle render loop (`startIdleLoop`) on DOM load so the world, background, and character are animated before player input.
- **Aspect Ratio Integrity**: Canvas rendering MUST use uniform scaling (`Math.min`) to prevent distortion or elongation across varying screen aspect ratios.
- **Edge-to-Edge Parallax**: Background sky and ground layers must render across the full calculated view bounds (`viewLeft` to `viewRight`) to eliminate side black pillar bars in landscape mode.

## 3. Mobile UI & Ergonomics
- **No Character Obscuration**: Never place overlay buttons on the left third of the screen where Gloop runs (`x = 180`).
- **Portrait Layout**: In portrait view, use the Handheld Arcade Console pattern (16:9 viewport on top, tactile controller deck below).
- **Landscape Layout**: In landscape view, dock thumb controls exclusively on the bottom-right edge, supporting two-handed full-screen tap zones (left half = duck, right half = jump).
- **HUD Formatting**: Ensure stats pills preserve distinct icons and legible labels on mobile viewports without duplicate or colliding text.
