/* ========================================================
   JAVASCRIPT FOR TO-DO LIST APPLICATION WITH REMINDERS
   Beginner-friendly: Heavily commented so you can understand 
   how every line and concept works!
   ======================================================== */

// ========================================================
// 1. SELECTING HTML ELEMENTS (Connecting JS with HTML)
// ========================================================
// We use document.getElementById() to "grab" elements from our HTML
const todoForm = document.getElementById("todo-form");
const taskInput = document.getElementById("task-input");
const reminderInput = document.getElementById("reminder-input");
const prioritySelect = document.getElementById("priority-select");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

// Counter elements
const totalCountEl = document.getElementById("total-count");
const remainingCountEl = document.getElementById("remaining-count");
const completedCountEl = document.getElementById("completed-count");
const progressBarEl = document.getElementById("progress-bar");
const progressTextEl = document.getElementById("progress-text");

// Filter buttons and toolbar
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const currentDateEl = document.getElementById("current-date");
const notificationBtn = document.getElementById("notification-btn");

// Toast Notification elements
const reminderToast = document.getElementById("reminder-toast");
const toastTitle = document.getElementById("toast-title");
const toastMessage = document.getElementById("toast-message");
const toastClose = document.getElementById("toast-close");

// ========================================================
// 2. STATE (The data our app keeps track of)
// ========================================================
// This array will hold all our task objects.
// Each task object looks like this:
// {
//   id: 17192348234,
//   text: "Buy groceries",
//   completed: false,
//   reminder: "2026-10-27T15:30",
//   priority: "high",
//   reminded: false
// }
let tasks = [];

// Current active filter: 'all', 'remaining', or 'completed'
let currentFilter = "all";

// ========================================================
// 3. INITIALIZATION & LOCALSTORAGE
// LocalStorage lets the browser remember our tasks even 
// after you close or refresh the tab!
// ========================================================

// Display today's date in a friendly format (e.g. "Tuesday, Oct 27, 2026")
function displayCurrentDate() {
  const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
  const today = new Date();
  currentDateEl.textContent = today.toLocaleDateString("en-US", options);
}

// Load tasks from LocalStorage into our `tasks` array
function loadTasks() {
  const savedTasks = localStorage.getItem("my_todo_tasks");
  
  if (savedTasks) {
    // JSON.parse converts the saved text string back into a JavaScript array
    tasks = JSON.parse(savedTasks);
  } else {
    // If it's the user's very first time opening the page, provide some friendly examples!
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
    tasks = [
      {
        id: Date.now() - 2000,
        text: "👋 Welcome! Click the checkbox on the left to tick me as done",
        completed: false,
        reminder: "",
        priority: "normal",
        reminded: false
      },
      {
        id: Date.now() - 1000,
        text: "⏰ Try setting a reminder for a task!",
        completed: false,
        reminder: inOneHour,
        priority: "high",
        reminded: false
      },
      {
        id: Date.now(),
        text: "✅ This is an example of an already completed task",
        completed: true,
        reminder: "",
        priority: "low",
        reminded: false
      }
    ];
    saveTasks(); // Save these initial tasks
  }
}

// Save the current `tasks` array to LocalStorage
function saveTasks() {
  // JSON.stringify converts our JavaScript array into a text string
  localStorage.setItem("my_todo_tasks", JSON.stringify(tasks));
}

// ========================================================
// 4. RENDERING (Displaying the tasks on the screen)
// ========================================================
function renderTasks() {
  // Clear the existing list before rebuilding it
  taskList.innerHTML = "";

  // Step 4A: Filter the tasks according to the active tab
  let filteredTasks = tasks;
  if (currentFilter === "remaining") {
    filteredTasks = tasks.filter((task) => !task.completed);
  } else if (currentFilter === "completed") {
    filteredTasks = tasks.filter((task) => task.completed);
  }

  // Step 4B: Show or hide the empty state message
  if (filteredTasks.length === 0) {
    emptyState.classList.remove("hidden");
    if (currentFilter === "remaining") {
      emptyState.querySelector(".empty-text").textContent = "🎉 Awesome! No remaining tasks left to do.";
    } else if (currentFilter === "completed") {
      emptyState.querySelector(".empty-text").textContent = "No completed tasks yet. Go tick some off!";
    } else {
      emptyState.querySelector(".empty-text").textContent = "No tasks yet! Add your first task above.";
    }
  } else {
    emptyState.classList.add("hidden");
  }

  // Step 4C: Create an <li> item for each task and add to the list
  filteredTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.completed ? "completed" : ""}`;

    // Format the reminder date/time if provided
    let reminderBadge = "";
    if (task.reminder) {
      const reminderDate = new Date(task.reminder);
      const isPast = reminderDate < new Date();
      const formattedDate = reminderDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });

      // Show warning badge if overdue and not yet completed
      if (isPast && !task.completed) {
        reminderBadge = `<span class="badge badge-reminder overdue">⚠️ Overdue: ${formattedDate}</span>`;
      } else {
        reminderBadge = `<span class="badge badge-reminder">⏰ ${formattedDate}</span>`;
      }
    }

    // Priority badge (High, Normal, Low)
    const priorityBadge = `<span class="badge badge-priority-${task.priority}">
      ${task.priority.toUpperCase()}
    </span>`;

    // Inner HTML for the task item
    li.innerHTML = `
      <div class="task-left">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          ${task.completed ? "checked" : ""} 
          title="Click to toggle Done"
        />
        <div class="task-body">
          <span class="task-title">${escapeHTML(task.text)}</span>
          <div class="task-meta">
            ${priorityBadge}
            ${reminderBadge}
          </div>
        </div>
      </div>
      <button class="delete-btn" title="Delete task">&times;</button>
    `;

    // --- Event: Clicking the checkbox to tick as Done / Remaining ---
    const checkbox = li.querySelector(".task-checkbox");
    checkbox.addEventListener("change", () => {
      toggleTaskDone(task.id);
    });

    // --- Event: Clicking the delete button ---
    const deleteBtn = li.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => {
      deleteTask(task.id);
    });

    taskList.appendChild(li);
  });

  // Step 4D: Update the counter numbers and progress bar
  updateStats();
}

// Helper to prevent HTML injection in task text
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ========================================================
// 5. UPDATE COUNTERS & PROGRESS BAR
// ========================================================
function updateStats() {
  const total = tasks.length;
  // Completed tasks are where task.completed is true
  const completed = tasks.filter((t) => t.completed).length;
  // Remaining tasks are where task.completed is false
  const remaining = total - completed;

  // Update text numbers on the screen
  totalCountEl.textContent = total;
  remainingCountEl.textContent = remaining;
  completedCountEl.textContent = completed;

  // Calculate percentage for progress bar
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressBarEl.style.width = `${percentage}%`;
  progressTextEl.textContent = `${percentage}% Completed`;
}

// ========================================================
// 6. ADD A NEW TASK
// ========================================================
todoForm.addEventListener("submit", (event) => {
  // Prevent page refresh on form submit
  event.preventDefault();

  const text = taskInput.value.trim();
  const reminder = reminderInput.value;
  const priority = prioritySelect.value;

  // Validation: make sure user typed something
  if (text === "") {
    alert("Please enter a task description!");
    return;
  }

  // Create a new task object
  const newTask = {
    id: Date.now(), // unique ID based on timestamp
    text: text,
    completed: false,
    reminder: reminder, // e.g. "2026-10-27T16:00" or ""
    priority: priority,
    reminded: false
  };

  // Add the new task to the beginning of our array
  tasks.unshift(newTask);

  // Save to LocalStorage and re-render
  saveTasks();
  renderTasks();

  // Reset the input fields so user can type the next task
  taskInput.value = "";
  reminderInput.value = "";
  prioritySelect.value = "normal";
  taskInput.focus();
});

// ========================================================
// 7. TICK TASK AS DONE OR REMAINING (TOGGLE)
// ========================================================
function toggleTaskDone(id) {
  // Find the task with the matching ID
  const task = tasks.find((t) => t.id === id);
  if (task) {
    // Flip completed between true and false
    task.completed = !task.completed;
    
    // Play a friendly gentle ding sound when completed!
    if (task.completed) {
      playSuccessTone();
    }
    
    saveTasks();
    renderTasks();
  }
}

// ========================================================
// 8. DELETE A TASK
// ========================================================
function deleteTask(id) {
  // Filter out (remove) the task with the matching ID
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

// ========================================================
// 9. CLEAR ALL COMPLETED TASKS
// ========================================================
clearCompletedBtn.addEventListener("click", () => {
  const completedCount = tasks.filter((t) => t.completed).length;
  if (completedCount === 0) {
    alert("There are no completed tasks to clear!");
    return;
  }

  if (confirm(`Are you sure you want to remove all ${completedCount} completed task(s)?`)) {
    // Keep only the remaining (active) tasks
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    renderTasks();
  }
});

// ========================================================
// 10. FILTER TABS (All, Remaining, Done)
// ========================================================
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove "active" class from all buttons
    filterButtons.forEach((b) => b.classList.remove("active"));
    // Add "active" class to the clicked button
    btn.classList.add("active");

    // Get the filter type from data-filter attribute ("all", "remaining", or "completed")
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// ========================================================
// 11. REMINDER & ALERTS SYSTEM
// Checks periodically if any task reminder is due!
// ========================================================

// Synthesize a pleasant chime using the Web Audio API
// (No external MP3 files needed; works in all modern browsers!)
function playReminderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Two pleasant tones in sequence
    const notes = [587.33, 880]; // D5 and A5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.2);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + index * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.2 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.2);
      osc.stop(ctx.currentTime + index * 0.2 + 0.4);
    });
  } catch (e) {
    console.log("Audio alert playback error:", e);
  }
}

// Gentle success tone when ticking a task done
function playSuccessTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Audio context may be restricted before first user interaction
  }
}

// Show the on-screen reminder banner
function showToast(title, message) {
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  reminderToast.classList.remove("hidden");

  // Play audio alert
  playReminderChime();

  // Automatically hide after 8 seconds
  setTimeout(() => {
    reminderToast.classList.add("hidden");
  }, 8000);
}

// Close toast on button click
toastClose.addEventListener("click", () => {
  reminderToast.classList.add("hidden");
});

// Request Browser Notification Permission
notificationBtn.addEventListener("click", () => {
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notifications.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      notificationBtn.textContent = "🔔 Alerts Enabled";
      notificationBtn.disabled = true;
      showToast("Notifications Enabled!", "You will now receive alerts for task reminders.");
    } else {
      alert("Notification permission was denied. You will still get in-app alerts!");
    }
  });
});

// Check tasks every 10 seconds to see if any reminder has reached its time
function checkReminders() {
  const now = new Date();

  tasks.forEach((task) => {
    // Only check if:
    // 1. Task has a reminder set
    // 2. Task is NOT completed
    // 3. Task has NOT already triggered an alert
    if (task.reminder && !task.completed && !task.reminded) {
      const reminderTime = new Date(task.reminder);

      // If current time has reached or passed the reminder time
      if (now >= reminderTime) {
        // Mark as reminded so it doesn't alert repeatedly
        task.reminded = true;
        saveTasks();
        renderTasks();

        // 1. In-app banner and chime
        showToast("⏰ Task Reminder!", `Time to do: "${task.text}"`);

        // 2. Browser Desktop Notification (if permitted)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("⏰ Task Due Now!", {
            body: task.text,
            icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220%22 width=%2264%22 height=%2264%22><text y=%2250%22 font-size=%2248%22>⏰</text></svg>"
          });
        }
      }
    }
  });
}

// Run the reminder check immediately and then every 10 seconds (10,000 milliseconds)
setInterval(checkReminders, 10000);

// ========================================================
// 12. RUN WHEN PAGE FIRST LOADS
// ========================================================
displayCurrentDate();
loadTasks();
renderTasks();
checkReminders();
