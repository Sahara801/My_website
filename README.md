# 🌻 Serene Tasks — Mindful Journal & To-Do

> A complete, responsive, single-page To-Do List web application with a warm, calming, rounded UI inspired by modern journaling apps. Built entirely with **semantic HTML5**, **modern CSS3**, and **vanilla JavaScript** (no external frameworks or heavy libraries).

---

## 🚀 Quick Start / How to Run

Because Serene Tasks is built with 100% vanilla web standards, you can run it immediately using any of these methods:

### Option 1: Double-Click (Direct in Browser)
Simply double-click [`index.html`](file:///c:/Users/lenovo/OneDrive%20-%20Tribhuvan%20University/Desktop/My_website/index.html) in your file manager to open it in Chrome, Edge, Safari, Firefox, or Brave.

### Option 2: Local HTTP Server (Recommended)
Running through a local web server ensures full support for local file drag-and-drop, Web Audio chime synthesis, and Browser Notifications API:

#### Using Python (Built into most systems):
```bash
python -m http.server 8000
```
Then visit: [http://localhost:8000](http://localhost:8000)

#### Using Node.js:
```bash
npx serve .
```

#### Using the bundled `.bat` launcher:
Run [`run_server.bat`](file:///c:/Users/lenovo/OneDrive%20-%20Tribhuvan%20University/Desktop/My_website/run_server.bat) to launch a local server immediately.

---

## 🎨 1. Design System & Aesthetics

Serene Tasks was designed from the ground up to feel warm, tactile, and peaceful—like writing in a thoughtfully crafted journal:

- **Colors (Defined as CSS Variables in `style.css`):**
  - **Page Background:** `#E0DBD9` (Dark mode: cozy charcoal `#191716`)
  - **App Surface:** `#F3F1EE` (Dark mode: espresso `#242220`)
  - **Cards:** `#FFFFFF` (Dark mode: `#2D2A28`)
  - **Primary (Marigold Yellow):** `#FDB92B`, Light tint `#FFC84F`, Hover `#E5A520`
  - **Success / Calm (Olive Green):** `#8AA12E`
  - **Danger / Sad (Clay Brown):** `#744337`
  - **Neutral / Anxious (Grey-Olive):** `#7A7562`
  - **Category Pastel Tints:**
    - Personal: Soft Pink `#F4D0CA`
    - Work: Calming Lavender `#DCD3FA`
    - Family: Warm Beige `#D3C9BA`
    - Health: Sage Green `#D9E6C3`
    - Study: Peach Gold `#FFE3B3`
  - **Text:** Primary `#1F1F1F`, Secondary `#5E5B58`, Muted `#8A8580`
- **Typography:**
  - Google Font: `Plus Jakarta Sans` with high contrast ratios (exceeding WCAG 4.5:1).
  - Large bold greetings (32px), massive stat numbers (72px), medium section headers (22px), and legible helpers (13–14px).
- **Shapes & Transitions:**
  - Very rounded corners: Cards `24px`, inputs `16px`, buttons & chips `9999px` pill-shaped.
  - Soft multi-stop shadows and smooth 200–250ms transitions with a gentle hover lift (`translateY(-2px)`).
  - Respects `prefers-reduced-motion` for accessibility.

---

## 📱 2. Responsive Layouts

### Desktop (1024px+)
- **Two-Panel Centered Layout:**
  - **Left Panel (65% width):** Interactive Week Strip, Dynamic Time-of-Day Hero Card, Quick Add categories scroller, Search & Sort toolbar, and full Task List.
  - **Right Panel (35% width):** Sticky companion dashboard featuring the Weekly Mindful Rhythm stat card, animated vertical pill bars (Emotions/Harmony chart), streak badge, and mindful quotes.
  - **Top Navigation Bar:** Quick navigation tabs for **Home**, **Calendar**, **Stats**, and **Profile**, plus live digital clock and user avatar.

### Mobile & Tablet (< 1024px)
- **Bottom Navigation Bar:**
  - [🏠 Home] [📅 Calendar] [🟡 Large Floating (+) Action Button] [📊 Stats] [👤 Profile]
- Mobile greeting bar with user avatar, personalized time greeting, and live date/time badge.
- Bottom sheet modal interactions for adding and editing tasks.

---

## 🌟 3. Complete Feature Breakdown

### Home Screen
- **Time-Based Greeting:** "Good morning", "Good afternoon", or "Good evening" synced with live local time, user name, and custom avatar emoji.
- **Interactive Week Strip:** Mon–Sun date circles with month navigation (`<` and `>`), a "Today" quick-jump button, dot indicators for days with scheduled tasks, and single-click date filtering.
- **Hero Card Carousel:**
  - *Dynamic Time-of-Day Card:* Changes visual tint and copy by time of day with a friendly animated smiling sun SVG illustration.
  - *Mindful Thought Card:* Daily intention quote and streak tracker.
- **Quick Add Row:** One-tap category chips (Personal, Work, Family, Health, Study) that launch the modal with the category pre-selected.
- **Filter Chips:** `All`, `Today`, `Upcoming`, `Completed`, `Overdue`, plus a "See all" reset link.
- **Search & Sort:** Live search across title, description, and categories; sort by Due Date (Earliest/Latest), Priority, Category, or Recently Added.

### Task Management
- **Rich Task Schema:** ID, Title, Description, Category, Priority (Low/Medium/High), Due Date, Due Time, Reminder (None, At time, 5m, 15m, 30m, 1h, 1d), Repeat (None, Daily, Weekly, Monthly), Subtasks checklist, Completed flag, Pinned flag, Timestamps.
- **Card Badges:** Category tint chip, Priority tag, Relative Date (`Today`, `Tomorrow`, `Yesterday`, or formatted date), Dynamic Countdown badge (`Due in 2h 15m` or `Overdue by 1h`).
- **Subtasks & Progress Bar:** Visual progress fill with inline checklist toggle.
- **Actions:** Pin to top, Edit, Duplicate, Delete, Mark complete / undo, Clear all completed.
- **HTML5 Drag-and-Drop:** Grab the `⋮⋮` handle to reorder tasks in real time with persisted list order.
- **Recurring Tasks:** Auto-generates the next instance (Daily `+1d`, Weekly `+7d`, Monthly `+1m`) when marked complete.

### Custom Alerts & Notifications (Zero Browser `alert()` / `confirm()`)
1. **Toast Notifications:** Fixed top-right (desktop) / top (mobile) with auto-dismiss (3.8s), close button, and an **[Undo]** button when deleting a task.
2. **Confirmation Dialogs:** Custom modal dialogs for task deletion, clearing completed tasks, and data reset.
3. **Harmonic Bell Chime:** Synthesized in real time using the browser's native **Web Audio API** (calming sine waves at 587Hz & 880Hz)—requires no external MP3 files!
4. **Reminder Alert Modal:** Prominent popup with 3 buttons: `✓ Mark Done`, `⏰ Snooze 10m`, and `Dismiss`.
5. **Browser Push Notifications:** Polite explanatory prompt with one-click permission request.
6. **Overdue Alert Banner:** Dismissible banner alerting you to overdue tasks with a direct "Review Now" shortcut.
7. **Confetti Celebration:** Canvas particle celebration animation when all tasks for today are completed!

### Monthly Calendar Screen
- Full monthly calendar grid with month navigation and "Today" button.
- Date cells display task indicators (colored dots).
- Selecting any day shows all tasks scheduled for that specific date below, with full task controls and an "+ Add for This Day" button.

### Stats Screen (Mindful Insights)
- Giant 72px counter: Completed tasks with motivational caption.
- **Vertical Pill Bars:** Visual harmony meters for **Completed %**, **Pending %**, **Overdue %**, and **Today's Goal %** with smooth CSS animations.
- Metric cards: Current Streak, Completion Rate, Pending Tasks, Overdue Count.
- **7-Day Bar Chart:** Dynamic activity histogram tracking completions over the past 7 days.
- Large yellow "+ Create a New Task" CTA button.

### Profile & Settings Screen
- Edit display name and choose from 8 cute avatar emojis (🌻, 🌿, 🌸, ☕, ✨, 🐱, 🎨, 🧘).
- **Theme Switcher:** Seamless toggle between Warm Light Journal cream and Cozy Dark espresso.
- **Time Format:** Toggle between 12-hour (AM/PM) and 24-hour display.
- **Sound Toggle:** Turn audio bell chime on or off.
- **Default Reminder Lead:** Set the default reminder time for new tasks.
- **Data Export & Import:** Download your entire task library as a JSON file (`serene-tasks-backup.json`) and restore it on any device.
- **Reset All Data:** Erase custom data with confirmation and restore fresh sample tasks.

---

## 🗂️ Project Structure

```text
My_website/
├── index.html        # Semantic HTML5 single-page application structure & modals
├── style.css         # Complete design system, animations, dark mode, responsive layouts
├── script.js         # Modular vanilla JS (State, Storage, Audio, Confetti, Reminders, Views)
├── README.md         # Comprehensive documentation and run guide
├── run_server.bat    # Optional Windows batch script to launch local server
└── launch_todo.bat   # Optional shortcut to launch in browser
```

---

## ♿ Accessibility & Standards

- **Semantic Elements:** `<header>`, `<main>`, `<section>`, `<aside>`, `<nav>`, `<article>`, `<button>`.
- **ARIA Attributes:** `role="tab"`, `role="dialog"`, `role="alertdialog"`, `role="status"`, `aria-selected`, `aria-modal="true"`.
- **Keyboard Navigation:** Full Tab/Shift+Tab focus trap in dialogs, `Esc` key to close modals.
- **Motion Sensitivity:** All animations disabled automatically when the user has `prefers-reduced-motion: reduce` enabled in their operating system.
