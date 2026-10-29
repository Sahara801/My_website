# 🏃 Gloop's Endless Adventure

> A fast-paced, goofy HTML5 Canvas endless runner built from scratch with pure **Vanilla JavaScript**, **HTML5 Canvas**, and the **Web Audio API**. Built with **zero external image or audio files** — all graphics are rendered procedurally and all sound effects are synthesized in real time.

---

## 🎮 Play Live Demo (Try It in Your Browser)

Recruiters and visitors can launch and play the game directly on any device (Desktop, iPhone, Android, Tablet):

[![Play on Netlify](https://img.shields.io/badge/Play%20Live-Netlify%20Demo-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://frabjous-empanada-9a1bb7.netlify.app/)
[![Play on GitHub Pages](https://img.shields.io/badge/Play%20Live-GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)](https://sahara801.github.io/My_website/)

* **Primary Netlify Live Site:** [https://frabjous-empanada-9a1bb7.netlify.app/](https://frabjous-empanada-9a1bb7.netlify.app/)
* **GitHub Pages Mirror:** [https://sahara801.github.io/My_website/](https://sahara801.github.io/My_website/)

---

## ✨ Key Engineering & Technical Highlights

This project was built to demonstrate deep core web engineering principles without relying on third-party game engines (like Phaser, Pixi, or Unity):

### 1. 🎨 100% Procedural Graphics (Zero Image Downloads)
- Every sprite and animation (Gloop the blob, googly eyes with physics damping, seasonal obstacles, parallax rolling hills, and weather particles) is drawn mathematically using Canvas 2D Bézier curves, arcs, and gradients.
- **Dynamic Squash & Stretch:** Gloop elongates during jumps and squashes wide upon landing for a bouncy cartoon aesthetic.
- **Googly Eye Physics:** Gloop's pupils have momentum with spring-damping algorithms that react to jumping and running inertia.

### 2. 🎵 Real-Time Web Audio Synthesis (Zero MP3/WAV Downloads)
- Every jump, bounce, bonk, and collect sound is generated on-the-fly using the browser's native **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`, and frequency ramps).
- **Pitch Scaling:** As Gloop grows larger over time, his voice and sound frequencies automatically pitch down dynamically.

### 3. 📱 Dual-Platform Responsive Architecture
- **Desktop View:** Classic arcade cabinet frame with keyboard shortcuts (<kbd>Space</kbd> / <kbd>↑</kbd> to jump, double-tap for double-jump, <kbd>↓</kbd> to duck, <kbd>P</kbd> to pause, <kbd>M</kbd> to mute).
- **Mobile View (iOS & Android):** Dynamic `100dvh` fullscreen viewport, compact 1-row HUD, dedicated chubby touch buttons (`[🛡️ DUCK]` and `[🦘 JUMP]`), multi-touch screen zones, and landscape mode support.
- **Retina Resolution:** Automatically scales canvas buffers to `window.devicePixelRatio` for razor-sharp rendering on 4K and mobile OLED screens.

### 4. 🌦️ Dynamic Seasons & Weather System
- The game checks the user's real-world calendar month (`new Date().getMonth()`) to start in the real current season.
- Smoothly blends between **Spring** (drizzle & blossoms), **Summer** (monsoon & lightning storms), **Autumn** (wind gusts & falling leaves), and **Winter** (snowfall & icy frost).

### 5. ⏱️ 60 FPS Delta-Time Physics Loop
- Uses `requestAnimationFrame` with variable time-stepping (`dt`) clamped against tab-switch spikes to ensure consistent gameplay speed across 60Hz, 120Hz, and 144Hz displays.
- Hitbox calculations use conservative Axis-Aligned Bounding Box (AABB) intersection math with forgiveness padding for fair gameplay.

---

## 🕹️ Controls Guide

| Action | Desktop (Keyboard) | Mobile / Phone |
| :--- | :--- | :--- |
| **Jump** | <kbd>Space</kbd> or <kbd>↑ Arrow</kbd> | Tap **`[🦘 JUMP]`** or tap right 65% of screen |
| **Double Jump** | Double-tap <kbd>Space</kbd> or <kbd>↑</kbd> | Double-tap **`[🦘 JUMP]`** |
| **Duck / Slide** | Hold <kbd>↓ Arrow</kbd> | Hold **`[🛡️ DUCK]`** or hold left 35% of screen |
| **Pause / Resume** | <kbd>P</kbd> | Tap HUD Pause button |
| **Mute / Unmute** | <kbd>M</kbd> | Tap HUD Mute button |
| **Season Jump** | Keys <kbd>1</kbd>–<kbd>4</kbd> | Tap season indicator |

---

## 🚀 How to Run Locally

Because this game is completely self-contained with zero dependencies, you can run it in seconds:

### Method 1: Direct in Browser
Simply double-click [`index.html`](index.html) or [`gloop_runner.html`](gloop_runner.html) to open directly in Google Chrome, Microsoft Edge, Safari, Firefox, or Brave.

### Method 2: Local HTTP Server
```bash
# Using Python
python -m http.server 8000

# Open in browser:
http://localhost:8000
```

---

## 📂 Project Structure

```text
My_website/
├── index.html         # Main entry point (Gloop Endless Runner)
├── gloop_runner.html  # Standalone single-file game copy
├── netlify.toml       # Netlify build & redirect routing configuration
├── _redirects         # Netlify clean URL rewrite rules (/play, /game)
├── README.md          # Project documentation & portfolio overview
└── serene_tasks.html  # Archived mindful journaling web app
```

---

## 📄 License
Open source and available under the MIT License.
