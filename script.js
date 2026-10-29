/**
 * ============================================================================
 * SERENE TASKS — JAVASCRIPT APPLICATION CORE
 * A mindful, calming, rounded To-Do List & Journaling web application
 * Vanilla JavaScript (No frameworks), LocalStorage persistence
 * ============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. CONSTANTS & CONFIGURATION
     -------------------------------------------------------------------------- */
  const STORAGE_KEYS = {
    TASKS: 'serene_tasks_data',
    PROFILE: 'serene_profile_data',
    STREAK: 'serene_streak_data'
  };

  const CATEGORIES = ['Personal', 'Work', 'Family', 'Health', 'Study'];

  const REMINDER_OFFSETS_MS = {
    'none': null,
    'at-time': 0,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };

  // Inspirational mindful journaling quotes
  const MINDFUL_QUOTES = [
    "Small daily disciplines repeated consistently lead to great achievements.",
    "One breath, one step. Focus on gentle progress today, not exhausting perfection.",
    "Your mind is for having ideas, not holding them. Unburden your thoughts.",
    "Peace comes from accepting today's pace and doing what you can with love.",
    "Celebrate every small checkmark; steady steps climb mountains.",
    "A quiet mind creates a vibrant life. Take time to pause today."
  ];

  /* --------------------------------------------------------------------------
     2. APPLICATION STATE
     -------------------------------------------------------------------------- */
  const state = {
    tasks: [],
    profile: {
      name: 'Maya',
      avatar: '🌻',
      theme: 'light',
      timeFormat: '12h',
      soundEnabled: true,
      defaultReminder: '15m'
    },
    streak: {
      count: 3,
      lastCompletedDate: null
    },
    currentView: 'home', // 'home' | 'calendar' | 'stats' | 'profile'
    activeFilter: 'all',  // 'all' | 'today' | 'upcoming' | 'completed' | 'overdue' | 'date'
    filterDateStr: null,  // YYYY-MM-DD when filtering by a specific date
    searchQuery: '',
    sortBy: 'date-asc',   // 'date-asc' | 'date-desc' | 'priority-desc' | 'category' | 'created-desc'
    weekOffset: 0,        // offset in weeks for week strip (0 = this week)
    calendarDate: new Date(), // current viewed month in calendar
    selectedCalendarDateStr: null, // YYYY-MM-DD
    modalSubtasks: [],    // temporary subtasks buffer in Add/Edit modal
    editingTaskId: null,
    undoAction: null,     // { type, task, index }
    draggedTaskId: null
  };

  /* --------------------------------------------------------------------------
     3. AUDIO SYNTHESIZER (WEB AUDIO API - ZERO EXTERNAL ASSETS)
     -------------------------------------------------------------------------- */
  class SoundEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    /**
     * Plays a warm, harmonic 2-tone chime (calming mindfulness bell)
     */
    playChime() {
      if (!state.profile.soundEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [587.33, 880.00]; // D5 and A5 notes

        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          // Envelope: gentle bell attack and soft decaying release
          gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 1.3);
        });
      } catch (err) {
        console.warn('Audio chime playback omitted:', err);
      }
    }

    /**
     * Plays a cheerful celebratory sound on completing tasks
     */
    playCompleteSound() {
      if (!state.profile.soundEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chords = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

        chords.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);

          gain.gain.setValueAtTime(0.001, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.08 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.6);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.7);
        });
      } catch (e) {
        // audio optional
      }
    }
  }

  const sound = new SoundEngine();

  /* --------------------------------------------------------------------------
     4. DATE & TIME UTILITIES
     -------------------------------------------------------------------------- */
  const DateUtils = {
    /**
     * Format a Date into 'YYYY-MM-DD'
     */
    toISODate(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    /**
     * Today's 'YYYY-MM-DD'
     */
    todayISO() {
      return this.toISODate(new Date());
    },

    /**
     * Parse date and time into a Date object safely
     */
    getDueTimestamp(dueDateStr, dueTimeStr) {
      if (!dueDateStr) return null;
      const time = dueTimeStr || '23:59';
      return new Date(`${dueDateStr}T${time}:00`);
    },

    /**
     * Human relative date string (Today, Tomorrow, Yesterday, or Mon, 3 Nov)
     */
    formatRelativeDate(dueDateStr) {
      if (!dueDateStr) return 'No due date';
      const today = this.todayISO();
      
      const targetDate = new Date(dueDateStr + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';

      return targetDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    },

    /**
     * Formats time based on user 12h/24h preference
     */
    formatTime(timeStr, formatPref) {
      if (!timeStr) return '';
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return timeStr;

      if (formatPref === '24h') {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      // 12-hour format
      const period = h >= 12 ? 'PM' : 'AM';
      const hours12 = h % 12 || 12;
      return `${hours12}:${String(m).padStart(2, '0')} ${period}`;
    },

    /**
     * Friendly countdown ("Due in 2h 15m", "Overdue by 1h", etc.)
     */
    getCountdownLabel(dueDateStr, dueTimeStr, isCompleted) {
      if (isCompleted) return { text: 'Done', isOverdue: false };
      if (!dueDateStr) return null;

      const due = this.getDueTimestamp(dueDateStr, dueTimeStr);
      if (!due || isNaN(due.getTime())) return null;

      const now = new Date();
      const diffMs = due.getTime() - now.getTime();
      const isOverdue = diffMs < 0;
      const absDiff = Math.abs(diffMs);

      const minutes = Math.floor(absDiff / (1000 * 60));
      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

      let timeText = '';
      if (days > 1) {
        timeText = `${days} days`;
      } else if (days === 1) {
        timeText = `1 day`;
      } else if (hours >= 1) {
        const remainingMin = minutes % 60;
        timeText = remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
      } else {
        timeText = `${Math.max(1, minutes)}m`;
      }

      return {
        text: isOverdue ? `Overdue by ${timeText}` : `Due in ${timeText}`,
        isOverdue: isOverdue
      };
    },

    /**
     * Check if a task is overdue
     */
    isOverdue(dueDateStr, dueTimeStr, isCompleted) {
      if (isCompleted || !dueDateStr) return false;
      const due = this.getDueTimestamp(dueDateStr, dueTimeStr);
      if (!due || isNaN(due.getTime())) return false;
      return due.getTime() < Date.now();
    },

    /**
     * Start of week (Monday) for a given date offset
     */
    getMondayOfWeek(d, weekOffset = 0) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  };

  /* --------------------------------------------------------------------------
     5. STORAGE ENGINE (LOCALSTORAGE WITH SAMPLE PRELOAD & SAFETY)
     -------------------------------------------------------------------------- */
  const Storage = {
    getInitialTasks() {
      const today = DateUtils.todayISO();
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = DateUtils.toISODate(tomorrowDate);

      return [
        {
          id: 'task-sample-1',
          title: 'Morning mindful breathing & meditation 🧘',
          description: 'Sit in stillness for 10 minutes. Focus on steady, deep belly breaths.',
          category: 'Health',
          priority: 'High',
          dueDate: today,
          dueTime: '08:30',
          reminder: '15m',
          repeat: 'daily',
          subtasks: [
            { id: 'sub-1', text: '10-minute breathwork session', completed: true },
            { id: 'sub-2', text: 'Jot down 3 things I am grateful for', completed: true }
          ],
          completed: true,
          pinned: true,
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          completedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          reminderTriggered: true
        },
        {
          id: 'task-sample-2',
          title: 'Review weekly roadmap & write thoughtful notes 💼',
          description: 'Go over sprint deliverables and leave encouraging feedback for teammates.',
          category: 'Work',
          priority: 'High',
          dueDate: today,
          dueTime: '15:00',
          reminder: '30m',
          repeat: 'weekly',
          subtasks: [
            { id: 'sub-3', text: 'Review pull requests', completed: true },
            { id: 'sub-4', text: 'Update project timeline in Notion', completed: false }
          ],
          completed: false,
          pinned: true,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          completedAt: null,
          reminderTriggered: false
        },
        {
          id: 'task-sample-3',
          title: 'Pick up fresh lavender & seasonal produce 🌸',
          description: 'Visit the local farmers market for chamomile tea, fresh fruits, and flowers.',
          category: 'Personal',
          priority: 'Medium',
          dueDate: today,
          dueTime: '17:30',
          reminder: '1h',
          repeat: 'none',
          subtasks: [
            { id: 'sub-5', text: 'Fresh sourdough loaf', completed: false },
            { id: 'sub-6', text: 'Chamomile herbs & honey', completed: false }
          ],
          completed: false,
          pinned: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          reminderTriggered: false
        },
        {
          id: 'task-sample-4',
          title: 'Family weekend dinner & movie night 🏡',
          description: 'Cook homemade pasta and unwind with family and favorite film.',
          category: 'Family',
          priority: 'Medium',
          dueDate: tomorrow,
          dueTime: '19:00',
          reminder: '1d',
          repeat: 'weekly',
          subtasks: [],
          completed: false,
          pinned: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          reminderTriggered: false
        }
      ];
    },

    loadTasks() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (!raw) {
          const sample = this.getInitialTasks();
          this.saveTasks(sample);
          return sample;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        return this.getInitialTasks();
      } catch (err) {
        console.error('Corrupted tasks in localStorage; resetting to samples:', err);
        const sample = this.getInitialTasks();
        this.saveTasks(sample);
        return sample;
      }
    },

    saveTasks(tasks) {
      try {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      } catch (err) {
        console.error('Failed to save tasks to localStorage:', err);
        Toasts.show('Storage quota exceeded or unavailable', 'danger');
      }
    },

    loadProfile() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Object.assign({}, state.profile, parsed);
        }
      } catch (e) {
        console.warn('Profile load fallback:', e);
      }
      return state.profile;
    },

    saveProfile(profile) {
      try {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      } catch (e) {
        console.error('Failed to save profile:', e);
      }
    },

    loadStreak() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return { count: 3, lastCompletedDate: DateUtils.todayISO() };
    },

    saveStreak(streak) {
      try {
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
      } catch (e) {}
    }
  };

  /* --------------------------------------------------------------------------
     6. NOTIFICATIONS & TOASTS SYSTEM
     -------------------------------------------------------------------------- */
  const Toasts = {
    container: document.getElementById('toast-container'),

    show(message, type = 'info', undoCallback = null) {
      if (!this.container) return;

      const toast = document.createElement('div');
      toast.className = `toast-item toast-${type}`;
      toast.setAttribute('role', 'status');

      const body = document.createElement('div');
      body.className = 'toast-body';
      body.innerHTML = `<span>${message}</span>`;

      if (undoCallback) {
        const undoBtn = document.createElement('button');
        undoBtn.className = 'toast-undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.onclick = (e) => {
          e.stopPropagation();
          undoCallback();
          this.remove(toast);
        };
        body.appendChild(undoBtn);
      }

      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close-btn';
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = () => this.remove(toast);

      toast.appendChild(body);
      toast.appendChild(closeBtn);
      this.container.appendChild(toast);

      // Auto-dismiss after 3.8s
      const timer = setTimeout(() => {
        this.remove(toast);
      }, 3800);

      toast.dataset.timer = timer;
    },

    remove(toast) {
      if (!toast) return;
      if (toast.dataset.timer) clearTimeout(Number(toast.dataset.timer));
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }
  };

  /* --------------------------------------------------------------------------
     7. CUSTOM CONFIRMATION MODAL (NO WINDOW.ALERT OR CONFIRM)
     -------------------------------------------------------------------------- */
  const ConfirmDialog = {
    modal: document.getElementById('confirm-modal'),
    title: document.getElementById('confirm-title'),
    desc: document.getElementById('confirm-desc'),
    cancelBtn: document.getElementById('confirm-cancel-btn'),
    proceedBtn: document.getElementById('confirm-proceed-btn'),
    pendingAction: null,

    open(options) {
      // options: { title, desc, confirmText, isDanger, onConfirm }
      this.title.textContent = options.title || 'Are you sure?';
      this.desc.textContent = options.desc || 'This action cannot be undone.';
      this.proceedBtn.textContent = options.confirmText || 'Proceed';

      if (options.isDanger !== false) {
        this.proceedBtn.className = 'btn-danger-pill';
      } else {
        this.proceedBtn.className = 'btn-primary-pill';
      }

      this.pendingAction = options.onConfirm;
      this.modal.classList.remove('hidden');
      this.proceedBtn.focus();
    },

    close() {
      this.modal.classList.add('hidden');
      this.pendingAction = null;
    },

    init() {
      this.cancelBtn.addEventListener('click', () => this.close());
      this.proceedBtn.addEventListener('click', () => {
        if (typeof this.pendingAction === 'function') {
          this.pendingAction();
        }
        this.close();
      });
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
          this.close();
        }
      });
    }
  };

  /* --------------------------------------------------------------------------
     8. CONFETTI CELEBRATION ENGINE
     -------------------------------------------------------------------------- */
  const Confetti = {
    canvas: document.getElementById('confetti-canvas'),
    ctx: null,
    particles: [],
    animationId: null,

    init() {
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', () => this.resize());
        this.resize();
      }
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    fire() {
      if (!this.canvas || !this.ctx) return;
      this.resize();
      sound.playCompleteSound();

      const colors = ['#FDB92B', '#8AA12E', '#F4D0CA', '#DCD3FA', '#D9E6C3', '#FFC84F'];
      this.particles = [];

      for (let i = 0; i < 90; i++) {
        this.particles.push({
          x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 200,
          y: window.innerHeight * 0.35 + (Math.random() - 0.5) * 100,
          w: Math.random() * 9 + 5,
          h: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 10,
          vy: Math.random() * -8 - 3,
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
          opacity: 1,
          decay: Math.random() * 0.015 + 0.008
        });
      }

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.loop();
    },

    loop() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let alive = false;
      for (const p of this.particles) {
        if (p.opacity > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3; // gravity
          p.vx *= 0.98;
          p.rotation += p.vRot;
          p.opacity -= p.decay;

          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = Math.max(0, p.opacity);
          this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          this.ctx.restore();
        }
      }

      if (alive) {
        this.animationId = requestAnimationFrame(() => this.loop());
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  /* --------------------------------------------------------------------------
     9. REMINDER ENGINE (POLLING & NOTIFICATIONS)
     -------------------------------------------------------------------------- */
  const ReminderEngine = {
    activeReminderModal: document.getElementById('reminder-alert-modal'),
    taskTitleElem: document.getElementById('reminder-task-title'),
    timeInfoElem: document.getElementById('reminder-time-info'),
    currentRemindingTask: null,

    init() {
      // Buttons
      document.getElementById('reminder-btn-done').addEventListener('click', () => {
        if (this.currentRemindingTask) {
          TaskOperations.toggleComplete(this.currentRemindingTask.id);
          this.close();
        }
      });

      document.getElementById('reminder-btn-snooze').addEventListener('click', () => {
        if (this.currentRemindingTask) {
          const task = state.tasks.find(t => t.id === this.currentRemindingTask.id);
          if (task) {
            // Add 10 min snooze
            const now = new Date(Date.now() + 10 * 60 * 1000);
            task.reminderTriggered = false;
            task.dueTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            Storage.saveTasks(state.tasks);
            Toasts.show('Reminder snoozed for 10 minutes ⏰', 'info');
          }
          this.close();
        }
      });

      document.getElementById('reminder-btn-dismiss').addEventListener('click', () => {
        this.close();
      });

      // Polling interval every 30 seconds
      setInterval(() => this.check(), 30000);
      window.addEventListener('focus', () => this.check());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.check();
      });

      // Initial check after short delay
      setTimeout(() => this.check(), 2500);
    },

    check() {
      const now = Date.now();
      let dueTasksCount = 0;

      for (const task of state.tasks) {
        if (task.completed || task.reminder === 'none' || task.reminderTriggered) continue;
        if (!task.dueDate) continue;

        const dueTimestamp = DateUtils.getDueTimestamp(task.dueDate, task.dueTime);
        if (!dueTimestamp || isNaN(dueTimestamp.getTime())) continue;

        const offsetMs = REMINDER_OFFSETS_MS[task.reminder] || 0;
        const triggerTime = dueTimestamp.getTime() - offsetMs;

        // If trigger time reached (within a reasonable 1 hour window)
        if (now >= triggerTime && now - triggerTime < 3600000) {
          task.reminderTriggered = true;
          Storage.saveTasks(state.tasks);
          this.triggerAlert(task);
          dueTasksCount++;
          break; // alert one at a time
        }
      }

      this.updateOverdueBanner();
    },

    triggerAlert(task) {
      this.currentRemindingTask = task;
      sound.playChime();

      // Show in-app banner modal
      this.taskTitleElem.textContent = task.title;
      const formattedTime = DateUtils.formatTime(task.dueTime, state.profile.timeFormat);
      this.timeInfoElem.textContent = `Due ${DateUtils.formatRelativeDate(task.dueDate)}${formattedTime ? ' at ' + formattedTime : ''}`;
      this.activeReminderModal.classList.remove('hidden');

      // Native browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Serene Tasks Reminder 🔔', {
            body: `${task.title} - ${this.timeInfoElem.textContent}`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23FDB92B"/></svg>'
          });
        } catch (e) {}
      }
    },

    close() {
      this.activeReminderModal.classList.add('hidden');
      this.currentRemindingTask = null;
    },

    updateOverdueBanner() {
      const banner = document.getElementById('overdue-banner');
      const textElem = document.getElementById('overdue-banner-text');
      if (!banner || !textElem) return;

      const overdueCount = state.tasks.filter(t => DateUtils.isOverdue(t.dueDate, t.dueTime, t.completed)).length;
      if (overdueCount > 0 && state.currentView === 'home' && state.activeFilter !== 'overdue') {
        textElem.textContent = `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} — Let's attend to them gently.`;
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  };

  /* --------------------------------------------------------------------------
     10. TASK OPERATIONS (CRUD, REPEAT, REORDER, UNDO)
     -------------------------------------------------------------------------- */
  const TaskOperations = {
    addTask(taskData) {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        title: taskData.title.trim(),
        description: taskData.description ? taskData.description.trim() : '',
        category: taskData.category || 'Personal',
        priority: taskData.priority || 'Medium',
        dueDate: taskData.dueDate || '',
        dueTime: taskData.dueTime || '',
        reminder: taskData.reminder || 'none',
        repeat: taskData.repeat || 'none',
        subtasks: taskData.subtasks || [],
        completed: false,
        pinned: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        reminderTriggered: false
      };

      state.tasks.unshift(newTask);
      Storage.saveTasks(state.tasks);
      Toasts.show('Task added with mindfulness ✨', 'info');
      Render.all();
      return newTask;
    },

    updateTask(id, updateData) {
      const taskIndex = state.tasks.findIndex(t => t.id === id);
      if (taskIndex === -1) return;

      const oldTask = state.tasks[taskIndex];
      // Reset reminderTriggered if date or time changed
      let resetReminder = false;
      if (updateData.dueDate !== oldTask.dueDate || updateData.dueTime !== oldTask.dueTime) {
        resetReminder = true;
      }

      state.tasks[taskIndex] = Object.assign({}, oldTask, updateData, {
        reminderTriggered: resetReminder ? false : oldTask.reminderTriggered
      });

      Storage.saveTasks(state.tasks);
      Toasts.show('Task updated 🌱', 'info');
      Render.all();
    },

    deleteTask(id, showUndo = true) {
      const index = state.tasks.findIndex(t => t.id === id);
      if (index === -1) return;

      const [removedTask] = state.tasks.splice(index, 1);
      Storage.saveTasks(state.tasks);

      if (showUndo) {
        state.undoAction = { type: 'delete', task: removedTask, index };
        Toasts.show(`Task "${removedTask.title.slice(0, 24)}..." deleted`, 'danger', () => {
          TaskOperations.undo();
        });
      }

      Render.all();
    },

    duplicateTask(id) {
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;

      const clone = JSON.parse(JSON.stringify(task));
      clone.id = 'task-' + Date.now();
      clone.title = `${task.title} (Copy)`;
      clone.completed = false;
      clone.completedAt = null;
      clone.createdAt = new Date().toISOString();
      clone.subtasks.forEach(s => s.completed = false);

      state.tasks.unshift(clone);
      Storage.saveTasks(state.tasks);
      Toasts.show('Task duplicated 📋', 'info');
      Render.all();
    },

    togglePin(id) {
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;
      task.pinned = !task.pinned;
      Storage.saveTasks(state.tasks);
      Render.all();
      Toasts.show(task.pinned ? 'Task pinned to top 📌' : 'Task unpinned', 'info');
    },

    toggleComplete(id) {
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;

      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;

      if (task.completed) {
        // Also check all subtasks
        task.subtasks.forEach(s => s.completed = true);

        // Handle recurring tasks: create next occurrence!
        if (task.repeat && task.repeat !== 'none' && task.dueDate) {
          this.createNextRecurringTask(task);
        }

        // Streak check
        this.updateStreakOnCompletion();

        sound.playCompleteSound();
        Toasts.show('Task completed 🎉', 'success');

        // Check if all today's tasks are done for celebratory confetti!
        this.checkTodayAllCompleted();
      } else {
        Toasts.show('Task marked active', 'info');
      }

      Storage.saveTasks(state.tasks);
      Render.all();
    },

    createNextRecurringTask(task) {
      const currentDate = new Date(task.dueDate + 'T00:00:00');
      let nextDate = new Date(currentDate);

      if (task.repeat === 'daily') {
        nextDate.setDate(currentDate.getDate() + 1);
      } else if (task.repeat === 'weekly') {
        nextDate.setDate(currentDate.getDate() + 7);
      } else if (task.repeat === 'monthly') {
        nextDate.setMonth(currentDate.getMonth() + 1);
      }

      const nextTask = JSON.parse(JSON.stringify(task));
      nextTask.id = 'task-' + Date.now() + '-rec';
      nextTask.dueDate = DateUtils.toISODate(nextDate);
      nextTask.completed = false;
      nextTask.completedAt = null;
      nextTask.reminderTriggered = false;
      nextTask.createdAt = new Date().toISOString();
      nextTask.subtasks.forEach(s => s.completed = false);

      state.tasks.unshift(nextTask);
      Toasts.show(`Next recurring instance set for ${DateUtils.formatRelativeDate(nextTask.dueDate)} 🔁`, 'info');
    },

    toggleSubtask(taskId, subtaskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      const subtask = task.subtasks.find(s => s.id === subtaskId);
      if (!subtask) return;

      subtask.completed = !subtask.completed;

      // If all subtasks are done, keep task completed status responsive
      const allSubtasksDone = task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
      if (allSubtasksDone && !task.completed) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        sound.playCompleteSound();
        Toasts.show('All subtasks completed! 🎉', 'success');
        this.checkTodayAllCompleted();
      }

      Storage.saveTasks(state.tasks);
      Render.all();
    },

    clearAllCompleted() {
      const completedCount = state.tasks.filter(t => t.completed).length;
      if (completedCount === 0) {
        Toasts.show('No completed tasks to clear', 'info');
        return;
      }

      ConfirmDialog.open({
        title: 'Clear Completed Tasks?',
        desc: `Are you sure you want to remove all ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`,
        confirmText: 'Clear All Done',
        isDanger: true,
        onConfirm: () => {
          state.tasks = state.tasks.filter(t => !t.completed);
          Storage.saveTasks(state.tasks);
          Toasts.show(`Cleared ${completedCount} completed tasks 🧹`, 'info');
          Render.all();
        }
      });
    },

    undo() {
      if (!state.undoAction) return;
      if (state.undoAction.type === 'delete') {
        state.tasks.splice(state.undoAction.index, 0, state.undoAction.task);
        Storage.saveTasks(state.tasks);
        Toasts.show('Action undone ✨', 'info');
        state.undoAction = null;
        Render.all();
      }
    },

    updateStreakOnCompletion() {
      const today = DateUtils.todayISO();
      if (state.streak.lastCompletedDate === today) return; // already counted today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = DateUtils.toISODate(yesterday);

      if (state.streak.lastCompletedDate === yesterdayStr) {
        state.streak.count += 1;
      } else if (!state.streak.lastCompletedDate) {
        state.streak.count = 1;
      } else {
        // Streak restart
        state.streak.count = 1;
      }

      state.streak.lastCompletedDate = today;
      Storage.saveStreak(state.streak);
    },

    checkTodayAllCompleted() {
      const today = DateUtils.todayISO();
      const todaysTasks = state.tasks.filter(t => t.dueDate === today);
      if (todaysTasks.length >= 2 && todaysTasks.every(t => t.completed)) {
        Confetti.fire();
        Toasts.show("Wonderful! You completed all today's tasks 🌟", 'success');
      }
    }
  };

  /* --------------------------------------------------------------------------
     11. VIEW RENDERING ENGINE
     -------------------------------------------------------------------------- */
  const Render = {
    all() {
      this.headerAndClock();
      this.weekStrip();
      this.heroCard();
      this.taskList();
      this.companionStats();
      this.calendarView();
      this.statsView();
      this.profileView();
      ReminderEngine.updateOverdueBanner();
    },

    headerAndClock() {
      const now = new Date();
      const hours = now.getHours();

      // Time salutation
      let salutation = 'Good morning';
      let heroTitle = "Let's start your day";
      let timeOfDayClass = 'morning';

      if (hours >= 12 && hours < 17) {
        salutation = 'Good afternoon';
        heroTitle = 'Keep your steady flow';
        timeOfDayClass = 'afternoon';
      } else if (hours >= 17 || hours < 5) {
        salutation = 'Good evening';
        heroTitle = 'Reflect & wind down';
        timeOfDayClass = 'evening';
      }

      // Greetings
      const salutationElem = document.getElementById('time-salutation');
      if (salutationElem) salutationElem.textContent = salutation;

      const userNameElem = document.getElementById('greeting-username');
      if (userNameElem) userNameElem.textContent = state.profile.name || 'Friend';

      // Header Live Clocks
      const timeFormatted = DateUtils.formatTime(
        `${String(hours).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        state.profile.timeFormat
      );

      const desktopClockText = document.getElementById('live-clock-text');
      if (desktopClockText) desktopClockText.textContent = timeFormatted;

      const mobileTimeText = document.getElementById('mobile-time-text');
      if (mobileTimeText) mobileTimeText.textContent = timeFormatted;

      const mobileDateText = document.getElementById('mobile-date-text');
      if (mobileDateText) {
        mobileDateText.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      // Avatar updates
      const topbarEmoji = document.getElementById('topbar-avatar-emoji');
      if (topbarEmoji) topbarEmoji.textContent = state.profile.avatar;

      const mobileEmoji = document.getElementById('mobile-avatar-emoji');
      if (mobileEmoji) mobileEmoji.textContent = state.profile.avatar;

      // Update hero card appearance
      const heroCard = document.getElementById('hero-dynamic-card');
      const heroHeading = document.getElementById('hero-heading');
      if (heroCard && heroHeading) {
        heroCard.classList.remove('morning', 'afternoon', 'evening');
        heroCard.classList.add(timeOfDayClass);
        heroHeading.textContent = heroTitle;
      }
    },

    weekStrip() {
      const container = document.getElementById('week-days-container');
      const label = document.getElementById('week-strip-label');
      if (!container || !label) return;

      const monday = DateUtils.getMondayOfWeek(new Date(), state.weekOffset);
      const todayISO = DateUtils.todayISO();

      // Label month and year for monday
      label.textContent = monday.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      container.innerHTML = '';
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = DateUtils.toISODate(d);
        const dayNumber = d.getDate();
        const isToday = iso === todayISO;
        const isSelected = state.activeFilter === 'date' && state.filterDateStr === iso;

        // Check if any tasks on this day
        const hasTasks = state.tasks.some(t => t.dueDate === iso);

        const pill = document.createElement('button');
        pill.className = `week-day-pill ${isToday ? 'is-today' : ''} ${isSelected ? 'active' : ''} ${hasTasks ? 'has-tasks' : ''}`;
        pill.setAttribute('role', 'tab');
        pill.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        pill.title = `${dayNames[i]}, ${d.toLocaleDateString()}`;

        pill.innerHTML = `
          <span class="day-name">${dayNames[i]}</span>
          <span class="day-number">${dayNumber}</span>
          <span class="day-task-dot" aria-hidden="true"></span>
        `;

        pill.addEventListener('click', () => {
          if (state.activeFilter === 'date' && state.filterDateStr === iso) {
            // Unfilter
            state.activeFilter = 'all';
            state.filterDateStr = null;
          } else {
            state.activeFilter = 'date';
            state.filterDateStr = iso;
          }
          this.updateFilterChips();
          this.taskList();
        });

        container.appendChild(pill);
      }
    },

    heroCard() {
      const todayISO = DateUtils.todayISO();
      const pendingToday = state.tasks.filter(t => t.dueDate === todayISO && !t.completed).length;

      const heroSubtext = document.getElementById('hero-subtext');
      if (heroSubtext) {
        if (pendingToday === 0) {
          heroSubtext.textContent = "All your tasks for today are clear. Peaceful day!";
        } else {
          heroSubtext.textContent = `You have ${pendingToday} task${pendingToday > 1 ? 's' : ''} pending today.`;
        }
      }

      const streakCount = document.getElementById('hero-streak-count');
      if (streakCount) {
        streakCount.textContent = `${state.streak.count} day${state.streak.count !== 1 ? 's' : ''}`;
      }
    },

    taskList() {
      const listElem = document.getElementById('task-list');
      const emptyState = document.getElementById('empty-state');
      const countPill = document.getElementById('total-visible-count');
      if (!listElem) return;

      const filtered = this.getFilteredTasks();
      if (countPill) countPill.textContent = filtered.length;

      listElem.innerHTML = '';

      if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      filtered.forEach((task) => {
        const card = this.createTaskCardElement(task);
        listElem.appendChild(card);
      });
    },

    getFilteredTasks() {
      let result = [...state.tasks];

      // 1. Status Filter
      const todayISO = DateUtils.todayISO();
      if (state.activeFilter === 'today') {
        result = result.filter(t => t.dueDate === todayISO);
      } else if (state.activeFilter === 'upcoming') {
        result = result.filter(t => t.dueDate && t.dueDate > todayISO && !t.completed);
      } else if (state.activeFilter === 'completed') {
        result = result.filter(t => t.completed);
      } else if (state.activeFilter === 'overdue') {
        result = result.filter(t => DateUtils.isOverdue(t.dueDate, t.dueTime, t.completed));
      } else if (state.activeFilter === 'date' && state.filterDateStr) {
        result = result.filter(t => t.dueDate === state.filterDateStr);
      }

      // 2. Search Query
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase().trim();
        result = result.filter(t =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q)
        );
      }

      // 3. Sorting
      result.sort((a, b) => {
        // Pinned tasks always stay on top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        if (state.sortBy === 'date-asc') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const aTime = a.dueDate + (a.dueTime || '23:59');
          const bTime = b.dueDate + (b.dueTime || '23:59');
          return aTime.localeCompare(bTime);
        } else if (state.sortBy === 'date-desc') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const aTime = a.dueDate + (a.dueTime || '00:00');
          const bTime = b.dueDate + (b.dueTime || '00:00');
          return bTime.localeCompare(aTime);
        } else if (state.sortBy === 'priority-desc') {
          const weights = { High: 3, Medium: 2, Low: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        } else if (state.sortBy === 'category') {
          return a.category.localeCompare(b.category);
        } else if (state.sortBy === 'created-desc') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
      });

      return result;
    },

    createTaskCardElement(task) {
      const li = document.createElement('li');
      li.className = `task-card ${task.completed ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}`;
      li.dataset.taskId = task.id;
      li.draggable = true;

      const isOverdue = DateUtils.isOverdue(task.dueDate, task.dueTime, task.completed);
      if (isOverdue) li.classList.add('overdue');

      // Countdown & Date
      const countdown = DateUtils.getCountdownLabel(task.dueDate, task.dueTime, task.completed);
      const relativeDate = DateUtils.formatRelativeDate(task.dueDate);
      const formattedTime = DateUtils.formatTime(task.dueTime, state.profile.timeFormat);

      // Subtask progress
      const totalSubs = task.subtasks.length;
      const doneSubs = task.subtasks.filter(s => s.completed).length;
      const subtaskPercent = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

      li.innerHTML = `
        <div class="task-card-main">
          <!-- Custom Checkbox -->
          <button class="task-checkbox-btn" aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
            <svg class="checkbox-tick-icon" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>

          <!-- Details -->
          <div class="task-details">
            <div class="task-header-row">
              <h4 class="task-title">${this.escapeHTML(task.title)}</h4>
              <span class="task-drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
            </div>

            ${task.description ? `<p class="task-desc">${this.escapeHTML(task.description)}</p>` : ''}

            <!-- Badges -->
            <div class="task-meta-row">
              <span class="badge badge-cat-${task.category.toLowerCase()}">${task.category}</span>
              <span class="badge badge-prio-${task.priority.toLowerCase()}">${task.priority} Priority</span>

              ${task.dueDate ? `
                <span class="badge badge-due">
                  📅 ${relativeDate}${formattedTime ? ' • ' + formattedTime : ''}
                </span>
              ` : ''}

              ${countdown ? `
                <span class="badge ${countdown.isOverdue ? 'badge-overdue' : 'badge-due'}">
                  ${countdown.text}
                </span>
              ` : ''}

              ${task.repeat && task.repeat !== 'none' ? `
                <span class="badge badge-repeat">🔁 ${task.repeat}</span>
              ` : ''}

              ${task.pinned ? `<span class="badge badge-pinned">📌 Pinned</span>` : ''}
            </div>

            <!-- Subtasks Block if present -->
            ${totalSubs > 0 ? `
              <div class="task-subtasks-block">
                <div class="subtask-progress-head">
                  <span>Subtasks</span>
                  <span>${doneSubs}/${totalSubs} (${subtaskPercent}%)</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" style="width: ${subtaskPercent}%;"></div>
                </div>
                <ul class="subtask-items-list">
                  ${task.subtasks.map(sub => `
                    <li class="subtask-item ${sub.completed ? 'done' : ''}">
                      <input type="checkbox" id="sub-${sub.id}" ${sub.completed ? 'checked' : ''} data-subtask-id="${sub.id}" />
                      <span>${this.escapeHTML(sub.text)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Action buttons row -->
            <div class="task-actions-row">
              <button class="action-pill-btn btn-pin" title="${task.pinned ? 'Unpin' : 'Pin to top'}">
                ${task.pinned ? 'Unpin' : '📌 Pin'}
              </button>
              <button class="action-pill-btn btn-edit" title="Edit Task">✏️ Edit</button>
              <button class="action-pill-btn btn-duplicate" title="Duplicate">📋 Copy</button>
              <button class="action-pill-btn btn-delete" title="Delete Task">🗑️ Delete</button>
            </div>

          </div>
        </div>
      `;

      // Event Listeners for Task Card
      const checkBtn = li.querySelector('.task-checkbox-btn');
      checkBtn.addEventListener('click', () => TaskOperations.toggleComplete(task.id));

      const pinBtn = li.querySelector('.btn-pin');
      pinBtn.addEventListener('click', () => TaskOperations.togglePin(task.id));

      const editBtn = li.querySelector('.btn-edit');
      editBtn.addEventListener('click', () => TaskModal.openEdit(task.id));

      const dupeBtn = li.querySelector('.btn-duplicate');
      dupeBtn.addEventListener('click', () => TaskOperations.duplicateTask(task.id));

      const delBtn = li.querySelector('.btn-delete');
      delBtn.addEventListener('click', () => {
        ConfirmDialog.open({
          title: 'Delete this task?',
          desc: `Remove "${task.title}"? You can undo this action from the toast.`,
          confirmText: 'Delete Task',
          isDanger: true,
          onConfirm: () => TaskOperations.deleteTask(task.id, true)
        });
      });

      // Subtask checkboxes
      li.querySelectorAll('.subtask-item input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', (e) => {
          e.stopPropagation();
          const subId = input.dataset.subtaskId;
          TaskOperations.toggleSubtask(task.id, subId);
        });
      });

      // Drag and Drop
      this.attachDragAndDrop(li, task.id);

      return li;
    },

    attachDragAndDrop(element, taskId) {
      element.addEventListener('dragstart', (e) => {
        state.draggedTaskId = taskId;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
      });

      element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
        state.draggedTaskId = null;
      });

      element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      element.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetTaskId = taskId;
        const sourceTaskId = state.draggedTaskId;

        if (sourceTaskId && sourceTaskId !== targetTaskId) {
          const fromIdx = state.tasks.findIndex(t => t.id === sourceTaskId);
          const toIdx = state.tasks.findIndex(t => t.id === targetTaskId);

          if (fromIdx !== -1 && toIdx !== -1) {
            const [movedItem] = state.tasks.splice(fromIdx, 1);
            state.tasks.splice(toIdx, 0, movedItem);
            Storage.saveTasks(state.tasks);
            Render.taskList();
            Toasts.show('Tasks reordered ↕️', 'info');
          }
        }
      });
    },

    companionStats() {
      const stats = this.computeTaskMetrics();

      const compCount = document.getElementById('companion-completed-count');
      if (compCount) compCount.textContent = stats.completedCount;

      const rateBadge = document.getElementById('companion-completion-rate');
      if (rateBadge) rateBadge.textContent = `${stats.completionRate}% rate`;

      const streakText = document.getElementById('companion-streak-text');
      if (streakText) streakText.textContent = `${state.streak.count} days continuous streak`;

      // Fill vertical pill bars
      this.animatePillBar('bar-fill-completed', 'bar-val-completed', stats.completedPercent);
      this.animatePillBar('bar-fill-pending', 'bar-val-pending', stats.pendingPercent);
      this.animatePillBar('bar-fill-overdue', 'bar-val-overdue', stats.overduePercent);
      this.animatePillBar('bar-fill-today', 'bar-val-today', stats.todayProgressPercent);

      // Random mindful quote
      const quoteElem = document.getElementById('companion-quote');
      if (quoteElem && !quoteElem.dataset.set) {
        quoteElem.textContent = `"${MINDFUL_QUOTES[Math.floor(Math.random() * MINDFUL_QUOTES.length)]}"`;
        quoteElem.dataset.set = 'true';
      }
    },

    animatePillBar(barId, valId, percent) {
      const bar = document.getElementById(barId);
      const val = document.getElementById(valId);
      if (bar) bar.style.height = `${Math.min(100, Math.max(0, percent))}%`;
      if (val) val.textContent = `${percent}%`;
    },

    computeTaskMetrics() {
      const total = state.tasks.length;
      const completed = state.tasks.filter(t => t.completed).length;
      const pending = state.tasks.filter(t => !t.completed).length;
      const overdue = state.tasks.filter(t => DateUtils.isOverdue(t.dueDate, t.dueTime, t.completed)).length;

      const today = DateUtils.todayISO();
      const todaysTasks = state.tasks.filter(t => t.dueDate === today);
      const todaysDone = todaysTasks.filter(t => t.completed).length;
      const todayProgress = todaysTasks.length > 0 ? Math.round((todaysDone / todaysTasks.length) * 100) : 0;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
      const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0;

      return {
        total,
        completedCount: completed,
        pendingCount: pending,
        overdueCount: overdue,
        completionRate,
        completedPercent,
        pendingPercent,
        overduePercent,
        todayProgressPercent: todayProgress
      };
    },

    calendarView() {
      const monthYearTitle = document.getElementById('cal-month-year-title');
      const grid = document.getElementById('cal-days-grid');
      if (!monthYearTitle || !grid) return;

      const calDate = state.calendarDate;
      const year = calDate.getFullYear();
      const month = calDate.getMonth();

      monthYearTitle.textContent = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // First day of month and total days
      const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      grid.innerHTML = '';
      const todayISO = DateUtils.todayISO();

      if (!state.selectedCalendarDateStr) {
        state.selectedCalendarDateStr = todayISO;
      }

      // Previous month padding days
      for (let i = firstDay - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell other-month';
        cell.textContent = d;
        grid.appendChild(cell);
      }

      // Days of current month
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const iso = DateUtils.toISODate(dateObj);
        const isToday = iso === todayISO;
        const isSelected = iso === state.selectedCalendarDateStr;

        // Check if any tasks on this day
        const dayTasks = state.tasks.filter(t => t.dueDate === iso);
        const hasTasks = dayTasks.length > 0;

        const cell = document.createElement('button');
        cell.className = `cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'selected' : ''}`;
        cell.innerHTML = `
          <span>${d}</span>
          ${hasTasks ? `
            <div class="cal-dots-wrap">
              <span class="cal-dot"></span>
              ${dayTasks.length > 1 ? '<span class="cal-dot"></span>' : ''}
            </div>
          ` : ''}
        `;

        cell.addEventListener('click', () => {
          state.selectedCalendarDateStr = iso;
          this.calendarView();
        });

        grid.appendChild(cell);
      }

      // Render tasks for selected date
      this.calendarSelectedTasks();
    },

    calendarSelectedTasks() {
      const titleElem = document.getElementById('cal-selected-day-title');
      const listElem = document.getElementById('cal-selected-task-list');
      const emptyElem = document.getElementById('cal-empty-state');
      if (!listElem) return;

      const dateStr = state.selectedCalendarDateStr || DateUtils.todayISO();
      const relative = DateUtils.formatRelativeDate(dateStr);
      titleElem.textContent = `Tasks for ${relative} (${dateStr})`;

      const tasksOnDate = state.tasks.filter(t => t.dueDate === dateStr);
      listElem.innerHTML = '';

      if (tasksOnDate.length === 0) {
        emptyElem.classList.remove('hidden');
      } else {
        emptyElem.classList.add('hidden');
        tasksOnDate.forEach(task => {
          const card = this.createTaskCardElement(task);
          listElem.appendChild(card);
        });
      }
    },

    statsView() {
      const metrics = this.computeTaskMetrics();

      const totalComp = document.getElementById('stats-total-completed');
      if (totalComp) totalComp.textContent = metrics.completedCount;

      const streakVal = document.getElementById('stats-streak-val');
      if (streakVal) streakVal.textContent = state.streak.count;

      const compRate = document.getElementById('stats-completion-rate');
      if (compRate) compRate.textContent = `${metrics.completionRate}%`;

      const pendVal = document.getElementById('stats-pending-val');
      if (pendVal) pendVal.textContent = metrics.pendingCount;

      const overVal = document.getElementById('stats-overdue-val');
      if (overVal) overVal.textContent = metrics.overdueCount;

      // Animate large pill bars
      this.animatePillBar('stats-bar-completed', 'stats-bar-val-completed', metrics.completedPercent);
      this.animatePillBar('stats-bar-pending', 'stats-bar-val-pending', metrics.pendingPercent);
      this.animatePillBar('stats-bar-overdue', 'stats-bar-val-overdue', metrics.overduePercent);
      this.animatePillBar('stats-bar-today', 'stats-bar-val-today', metrics.todayProgressPercent);

      // Render 7-day bar chart
      this.renderWeeklyBarChart();
    },

    renderWeeklyBarChart() {
      const container = document.getElementById('weekly-barchart');
      if (!container) return;

      container.innerHTML = '';
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      // Past 7 days
      const daysData = [];
      let maxCount = 1;

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = DateUtils.toISODate(d);
        const dayName = dayLabels[d.getDay()];

        const completedOnDay = state.tasks.filter(t => {
          if (!t.completedAt) return false;
          return t.completedAt.startsWith(iso);
        }).length;

        if (completedOnDay > maxCount) maxCount = completedOnDay;

        daysData.push({
          iso,
          name: dayName,
          count: completedOnDay,
          isToday: iso === DateUtils.todayISO()
        });
      }

      daysData.forEach(item => {
        const heightPercent = Math.round((item.count / maxCount) * 100);
        const col = document.createElement('div');
        col.className = 'barchart-col';
        col.innerHTML = `
          <span class="barchart-count">${item.count}</span>
          <div class="barchart-bar-track">
            <div class="barchart-bar-fill ${item.isToday ? 'highlight' : ''}" style="height: ${Math.max(8, heightPercent)}%;"></div>
          </div>
          <span class="barchart-day">${item.name}</span>
        `;
        container.appendChild(col);
      });
    },

    profileView() {
      const nameInput = document.getElementById('settings-name-input');
      if (nameInput) nameInput.value = state.profile.name || '';

      const profileNameDisplay = document.getElementById('profile-display-name');
      if (profileNameDisplay) profileNameDisplay.textContent = state.profile.name || 'Friend';

      const bigAvatarEmoji = document.getElementById('profile-big-avatar-emoji');
      if (bigAvatarEmoji) bigAvatarEmoji.textContent = state.profile.avatar;

      // Select active avatar option in picker
      document.querySelectorAll('.avatar-option').forEach(btn => {
        if (btn.dataset.emoji === state.profile.avatar) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Sound toggle
      const soundCheckbox = document.getElementById('toggle-sound-chime');
      if (soundCheckbox) soundCheckbox.checked = state.profile.soundEnabled;

      // Default reminder select
      const defReminder = document.getElementById('settings-default-reminder');
      if (defReminder) defReminder.value = state.profile.defaultReminder || '15m';

      // Time format active button
      document.querySelectorAll('.time-format-btn').forEach(btn => {
        if (btn.dataset.timeFormat === state.profile.timeFormat) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Theme active button
      document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.themeVal === state.profile.theme) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Notification permission status
      const notifStatus = document.getElementById('browser-notif-status');
      if (notifStatus && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          notifStatus.textContent = 'System notifications are enabled and active ✅';
        } else if (Notification.permission === 'denied') {
          notifStatus.textContent = 'Notifications blocked in browser settings';
        } else {
          notifStatus.textContent = 'Tap to allow native system push alerts';
        }
      }
    },

    updateFilterChips() {
      document.querySelectorAll('.filter-chip').forEach(chip => {
        if (chip.dataset.filter === state.activeFilter) {
          chip.classList.add('active');
          chip.setAttribute('aria-selected', 'true');
        } else {
          chip.classList.remove('active');
          chip.setAttribute('aria-selected', 'false');
        }
      });
    },

    escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  /* --------------------------------------------------------------------------
     12. ADD / EDIT TASK MODAL CONTROLLER
     -------------------------------------------------------------------------- */
  const TaskModal = {
    modal: document.getElementById('task-modal'),
    form: document.getElementById('task-form'),
    titleElem: document.getElementById('modal-title'),
    idField: document.getElementById('task-id-field'),
    titleInput: document.getElementById('task-title-input'),
    descInput: document.getElementById('task-desc-input'),
    categoryField: document.getElementById('task-category-field'),
    priorityField: document.getElementById('task-priority-field'),
    dateInput: document.getElementById('task-due-date'),
    timeInput: document.getElementById('task-due-time'),
    reminderSelect: document.getElementById('task-reminder-select'),
    repeatSelect: document.getElementById('task-repeat-select'),
    subtaskInput: document.getElementById('new-subtask-input'),
    subtaskListElem: document.getElementById('modal-subtask-list'),
    titleError: document.getElementById('title-error-msg'),
    dateWarning: document.getElementById('date-warning-msg'),
    lastFocusedElem: null,

    init() {
      // Close button
      document.getElementById('modal-close-btn').addEventListener('click', () => this.close());
      document.getElementById('modal-cancel-btn').addEventListener('click', () => this.close());

      // Backdrop click
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });

      // Escape key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
          this.close();
        }
      });

      // Category chip buttons inside modal
      document.querySelectorAll('#form-category-chips .chip-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#form-category-chips .chip-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.categoryField.value = btn.dataset.cat;
        });
      });

      // Priority pill buttons inside modal
      document.querySelectorAll('#form-priority-pills .priority-pill-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#form-priority-pills .priority-pill-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.priorityField.value = btn.dataset.priority;
        });
      });

      // Add Subtask button & enter key
      document.getElementById('btn-add-subtask').addEventListener('click', () => this.addSubtask());
      this.subtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addSubtask();
        }
      });

      // Date input validation warning
      this.dateInput.addEventListener('change', () => {
        if (this.dateInput.value && this.dateInput.value < DateUtils.todayISO()) {
          this.dateWarning.classList.remove('hidden');
        } else {
          this.dateWarning.classList.add('hidden');
        }
      });

      // Title input error clear
      this.titleInput.addEventListener('input', () => {
        if (this.titleInput.value.trim()) {
          this.titleError.classList.add('hidden');
        }
      });

      // Form submit
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.save();
      });
    },

    openAdd(presetCategory = null, presetDate = null) {
      this.lastFocusedElem = document.activeElement;
      state.editingTaskId = null;
      this.titleElem.textContent = 'Add New Task';
      this.idField.value = '';
      this.titleInput.value = '';
      this.descInput.value = '';
      this.dateWarning.classList.add('hidden');
      this.titleError.classList.add('hidden');

      // Preset Category
      const cat = presetCategory || 'Personal';
      this.categoryField.value = cat;
      document.querySelectorAll('#form-category-chips .chip-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
      });

      // Preset Priority
      this.priorityField.value = 'Medium';
      document.querySelectorAll('#form-priority-pills .priority-pill-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === 'Medium');
      });

      // Preset Date & Time
      this.dateInput.value = presetDate || DateUtils.todayISO();
      this.timeInput.value = '17:00';

      // Reminder & Repeat
      this.reminderSelect.value = state.profile.defaultReminder || '15m';
      this.repeatSelect.value = 'none';

      // Subtasks buffer
      state.modalSubtasks = [];
      this.renderSubtaskList();

      this.modal.classList.remove('hidden');
      setTimeout(() => this.titleInput.focus(), 100);
    },

    openEdit(taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      this.lastFocusedElem = document.activeElement;
      state.editingTaskId = taskId;
      this.titleElem.textContent = 'Edit Task';
      this.idField.value = task.id;
      this.titleInput.value = task.title;
      this.descInput.value = task.description || '';
      this.dateWarning.classList.add('hidden');
      this.titleError.classList.add('hidden');

      // Category
      this.categoryField.value = task.category;
      document.querySelectorAll('#form-category-chips .chip-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === task.category);
      });

      // Priority
      this.priorityField.value = task.priority;
      document.querySelectorAll('#form-priority-pills .priority-pill-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === task.priority);
      });

      // Date & Time
      this.dateInput.value = task.dueDate || '';
      this.timeInput.value = task.dueTime || '';

      // Reminder & Repeat
      this.reminderSelect.value = task.reminder || 'none';
      this.repeatSelect.value = task.repeat || 'none';

      // Subtasks buffer clone
      state.modalSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));
      this.renderSubtaskList();

      this.modal.classList.remove('hidden');
      setTimeout(() => this.titleInput.focus(), 100);
    },

    addSubtask() {
      const text = this.subtaskInput.value.trim();
      if (!text) return;

      state.modalSubtasks.push({
        id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 3),
        text: text,
        completed: false
      });

      this.subtaskInput.value = '';
      this.renderSubtaskList();
      this.subtaskInput.focus();
    },

    removeSubtask(subId) {
      state.modalSubtasks = state.modalSubtasks.filter(s => s.id !== subId);
      this.renderSubtaskList();
    },

    renderSubtaskList() {
      this.subtaskListElem.innerHTML = '';
      state.modalSubtasks.forEach((sub, idx) => {
        const li = document.createElement('li');
        li.className = 'modal-subtask-item';
        li.innerHTML = `
          <span>${idx + 1}. ${Render.escapeHTML(sub.text)}</span>
          <button type="button" class="btn-remove-subtask" aria-label="Remove subtask">&times;</button>
        `;
        li.querySelector('.btn-remove-subtask').addEventListener('click', () => this.removeSubtask(sub.id));
        this.subtaskListElem.appendChild(li);
      });
    },

    save() {
      const title = this.titleInput.value.trim();
      if (!title) {
        this.titleError.classList.remove('hidden');
        this.titleInput.focus();
        return;
      }

      const taskData = {
        title: title,
        description: this.descInput.value.trim(),
        category: this.categoryField.value,
        priority: this.priorityField.value,
        dueDate: this.dateInput.value,
        dueTime: this.timeInput.value,
        reminder: this.reminderSelect.value,
        repeat: this.repeatSelect.value,
        subtasks: state.modalSubtasks
      };

      if (state.editingTaskId) {
        TaskOperations.updateTask(state.editingTaskId, taskData);
      } else {
        TaskOperations.addTask(taskData);
      }

      this.close();
    },

    close() {
      this.modal.classList.add('hidden');
      state.editingTaskId = null;
      if (this.lastFocusedElem) this.lastFocusedElem.focus();
    }
  };

  /* --------------------------------------------------------------------------
     13. NAVIGATION & VIEW SWITCHER
     -------------------------------------------------------------------------- */
  const ViewRouter = {
    init() {
      // Desktop Nav Tabs
      document.querySelectorAll('.desktop-nav .nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.switchView(tab.dataset.view);
        });
      });

      // Mobile Bottom Nav Items
      document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
          this.switchView(item.dataset.view);
        });
      });

      // Profile avatar triggers in topbar and mobile
      const topbarAvatar = document.getElementById('topbar-avatar-btn');
      if (topbarAvatar) topbarAvatar.addEventListener('click', () => this.switchView('profile'));

      const mobileAvatar = document.getElementById('mobile-avatar-btn');
      if (mobileAvatar) mobileAvatar.addEventListener('click', () => this.switchView('profile'));

      // Companion calendar shortcut
      const companionCalBtn = document.getElementById('companion-goto-calendar');
      if (companionCalBtn) companionCalBtn.addEventListener('click', () => this.switchView('calendar'));
    },

    switchView(viewName) {
      if (!viewName) return;
      state.currentView = viewName;

      // Update Panel visibility
      document.querySelectorAll('.view-panel').forEach(panel => {
        if (panel.id === `view-${viewName}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });

      // Update Desktop tabs active state
      document.querySelectorAll('.desktop-nav .nav-tab').forEach(tab => {
        const isActive = tab.dataset.view === viewName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Update Mobile nav active state
      document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
        const isActive = item.dataset.view === viewName;
        item.classList.toggle('active', isActive);
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      Render.all();
    }
  };

  /* --------------------------------------------------------------------------
     14. PROFILE, THEME & DATA MANAGEMENT
     -------------------------------------------------------------------------- */
  const SettingsManager = {
    init() {
      // Apply saved theme
      document.documentElement.setAttribute('data-theme', state.profile.theme);

      // Save Profile Button
      const saveProfileBtn = document.getElementById('save-profile-btn');
      if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
          const nameInput = document.getElementById('settings-name-input');
          const newName = nameInput.value.trim() || 'Friend';
          state.profile.name = newName;
          Storage.saveProfile(state.profile);
          Toasts.show('Profile updated successfully 🌸', 'success');
          Render.all();
        });
      }

      // Avatar picker
      document.querySelectorAll('.avatar-picker-grid .avatar-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.avatar-picker-grid .avatar-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.profile.avatar = btn.dataset.emoji;
          Storage.saveProfile(state.profile);
          Render.all();
        });
      });

      // Theme toggle buttons
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const newTheme = btn.dataset.themeVal;
          state.profile.theme = newTheme;
          document.documentElement.setAttribute('data-theme', newTheme);
          Storage.saveProfile(state.profile);
          Render.profileView();
          Toasts.show(`Switched to ${newTheme} theme`, 'info');
        });
      });

      // Time format toggle (12h / 24h)
      document.querySelectorAll('.time-format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.profile.timeFormat = btn.dataset.timeFormat;
          Storage.saveProfile(state.profile);
          Render.all();
          Toasts.show(`Time format set to ${state.profile.timeFormat}`, 'info');
        });
      });

      // Sound chime switch
      const chimeToggle = document.getElementById('toggle-sound-chime');
      if (chimeToggle) {
        chimeToggle.addEventListener('change', (e) => {
          state.profile.soundEnabled = e.target.checked;
          Storage.saveProfile(state.profile);
          if (state.profile.soundEnabled) sound.playChime();
        });
      }

      // Default reminder lead time dropdown
      const defReminder = document.getElementById('settings-default-reminder');
      if (defReminder) {
        defReminder.addEventListener('change', (e) => {
          state.profile.defaultReminder = e.target.value;
          Storage.saveProfile(state.profile);
          Toasts.show('Default reminder updated', 'info');
        });
      }

      // Browser Notification Request Button
      const notifBtn = document.getElementById('btn-request-notification');
      if (notifBtn) {
        notifBtn.addEventListener('click', () => {
          if (!('Notification' in window)) {
            Toasts.show('Browser notifications are not supported on this device', 'danger');
            return;
          }
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              Toasts.show('Alerts enabled! You will receive gentle reminders 🔔', 'success');
              try {
                new Notification('Serene Tasks', {
                  body: 'Notification alerts are now smoothly configured!'
                });
              } catch (e) {}
            } else {
              Toasts.show('Notification permission was not granted', 'info');
            }
            Render.profileView();
          });
        });
      }

      // Export JSON backup
      const exportBtn = document.getElementById('btn-export-json');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            profile: state.profile,
            streak: state.streak,
            tasks: state.tasks
          };

          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `serene-tasks-backup-${DateUtils.todayISO()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          Toasts.show('Backup downloaded successfully 💾', 'success');
        });
      }

      // Import JSON backup
      const importInput = document.getElementById('json-file-input');
      if (importInput) {
        importInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = JSON.parse(evt.target.result);
              if (data && Array.isArray(data.tasks)) {
                state.tasks = data.tasks;
                if (data.profile) state.profile = Object.assign({}, state.profile, data.profile);
                if (data.streak) state.streak = Object.assign({}, state.streak, data.streak);

                Storage.saveTasks(state.tasks);
                Storage.saveProfile(state.profile);
                Storage.saveStreak(state.streak);

                Toasts.show(`Restored ${data.tasks.length} tasks from backup 📂`, 'success');
                Render.all();
              } else {
                throw new Error('Invalid backup schema');
              }
            } catch (err) {
              Toasts.show('Could not parse JSON file. Please ensure it is a valid Serene Tasks backup.', 'danger');
            }
          };
          reader.readAsText(file);
          importInput.value = '';
        });
      }

      // Reset All Data
      const resetBtn = document.getElementById('btn-reset-data');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          ConfirmDialog.open({
            title: 'Reset All Data?',
            desc: 'This will erase all tasks, custom preferences, and restore the initial sample tasks. Continue?',
            confirmText: 'Reset Everything',
            isDanger: true,
            onConfirm: () => {
              localStorage.clear();
              state.tasks = Storage.getInitialTasks();
              state.profile = {
                name: 'Maya',
                avatar: '🌻',
                theme: 'light',
                timeFormat: '12h',
                soundEnabled: true,
                defaultReminder: '15m'
              };
              state.streak = { count: 3, lastCompletedDate: DateUtils.todayISO() };

              Storage.saveTasks(state.tasks);
              Storage.saveProfile(state.profile);
              Storage.saveStreak(state.streak);
              document.documentElement.setAttribute('data-theme', 'light');

              Toasts.show('All data reset to initial mindful defaults 🌱', 'info');
              Render.all();
            }
          });
        });
      }
    }
  };

  /* --------------------------------------------------------------------------
     15. INITIALIZATION & EVENT BINDINGS
     -------------------------------------------------------------------------- */
  function initializeApp() {
    // 1. Load data
    state.tasks = Storage.loadTasks();
    state.profile = Storage.loadProfile();
    state.streak = Storage.loadStreak();

    // 2. Initialize engines & modules
    sound.init();
    Confetti.init();
    ConfirmDialog.init();
    ReminderEngine.init();
    TaskModal.init();
    ViewRouter.init();
    SettingsManager.init();

    // 3. Setup Global UI Events

    // Add Task Triggers
    const desktopAddBtn = document.getElementById('desktop-add-btn');
    if (desktopAddBtn) desktopAddBtn.addEventListener('click', () => TaskModal.openAdd());

    const mobileFabBtn = document.getElementById('mobile-fab-btn');
    if (mobileFabBtn) mobileFabBtn.addEventListener('click', () => TaskModal.openAdd());

    const emptyAddBtn = document.getElementById('empty-add-btn');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => TaskModal.openAdd());

    const statsCreateBtn = document.getElementById('stats-create-task-btn');
    if (statsCreateBtn) statsCreateBtn.addEventListener('click', () => TaskModal.openAdd());

    const calAddBtn = document.getElementById('cal-add-for-date-btn');
    if (calAddBtn) {
      calAddBtn.addEventListener('click', () => {
        TaskModal.openAdd(null, state.selectedCalendarDateStr || DateUtils.todayISO());
      });
    }

    // Hero "View tasks" smooth scroll
    const heroViewTasksBtn = document.getElementById('hero-view-tasks-btn');
    if (heroViewTasksBtn) {
      heroViewTasksBtn.addEventListener('click', () => {
        const myTasks = document.getElementById('my-tasks-container');
        if (myTasks) myTasks.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Quick Add Categories
    document.querySelectorAll('.quick-category-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category;
        TaskModal.openAdd(cat);
      });
    });

    // Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.activeFilter = chip.dataset.filter;
        state.filterDateStr = null;
        Render.updateFilterChips();
        Render.weekStrip();
        Render.taskList();
      });
    });

    // "See all" link
    const seeAllBtn = document.getElementById('btn-see-all');
    if (seeAllBtn) {
      seeAllBtn.addEventListener('click', () => {
        state.activeFilter = 'all';
        state.filterDateStr = null;
        state.searchQuery = '';
        const searchInput = document.getElementById('task-search-input');
        if (searchInput) searchInput.value = '';
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) clearBtn.classList.add('hidden');
        Render.updateFilterChips();
        Render.weekStrip();
        Render.taskList();
      });
    }

    // "Clear completed" button
    const clearCompletedBtn = document.getElementById('btn-clear-completed');
    if (clearCompletedBtn) {
      clearCompletedBtn.addEventListener('click', () => {
        TaskOperations.clearAllCompleted();
      });
    }

    // Search bar
    const searchInput = document.getElementById('task-search-input');
    const searchClear = document.getElementById('search-clear-btn');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (searchClear) searchClear.classList.toggle('hidden', !state.searchQuery);
        Render.taskList();
      });

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          state.searchQuery = '';
          searchClear.classList.add('hidden');
          Render.taskList();
          searchInput.focus();
        });
      }
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('task-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        Render.taskList();
      });
    }

    // Week Strip Controls
    const prevWeekBtn = document.getElementById('btn-prev-week');
    if (prevWeekBtn) {
      prevWeekBtn.addEventListener('click', () => {
        state.weekOffset -= 1;
        Render.weekStrip();
      });
    }

    const nextWeekBtn = document.getElementById('btn-next-week');
    if (nextWeekBtn) {
      nextWeekBtn.addEventListener('click', () => {
        state.weekOffset += 1;
        Render.weekStrip();
      });
    }

    const jumpTodayBtn = document.getElementById('btn-jump-today');
    if (jumpTodayBtn) {
      jumpTodayBtn.addEventListener('click', () => {
        state.weekOffset = 0;
        state.activeFilter = 'today';
        state.filterDateStr = null;
        Render.updateFilterChips();
        Render.weekStrip();
        Render.taskList();
      });
    }

    // Calendar Month Controls
    const prevMonthBtn = document.getElementById('cal-prev-month-btn');
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
        Render.calendarView();
      });
    }

    const nextMonthBtn = document.getElementById('cal-next-month-btn');
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
        Render.calendarView();
      });
    }

    const calTodayBtn = document.getElementById('cal-btn-today');
    if (calTodayBtn) {
      calTodayBtn.addEventListener('click', () => {
        state.calendarDate = new Date();
        state.selectedCalendarDateStr = DateUtils.todayISO();
        Render.calendarView();
      });
    }

    // Overdue Banner Review & Dismiss
    const bannerReviewBtn = document.getElementById('banner-review-btn');
    if (bannerReviewBtn) {
      bannerReviewBtn.addEventListener('click', () => {
        state.activeFilter = 'overdue';
        Render.updateFilterChips();
        Render.taskList();
        document.getElementById('my-tasks-container').scrollIntoView({ behavior: 'smooth' });
      });
    }

    const bannerDismissBtn = document.getElementById('banner-dismiss-btn');
    if (bannerDismissBtn) {
      bannerDismissBtn.addEventListener('click', () => {
        document.getElementById('overdue-banner').classList.add('hidden');
      });
    }

    // Live clock tick every second
    setInterval(() => {
      Render.headerAndClock();
    }, 1000);

    // Initial Full Render
    Render.all();
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

})();
