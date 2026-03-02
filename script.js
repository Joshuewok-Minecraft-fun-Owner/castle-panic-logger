import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, get, child }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// -----------------------------
// Firebase config (yours)
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDOx-M9awleDzmGRZrnOFeLHODq2asHjfc",
  authDomain: "castle-panic-logger.firebaseapp.com",
  databaseURL: "https://castle-panic-logger-default-rtdb.firebaseio.com",
  projectId: "castle-panic-logger",
  storageBucket: "castle-panic-logger.firebasestorage.app",
  messagingSenderId: "1093196906880",
  appId: "1:1093196906880:web:bfb6a4450e723b72ad0165",
  measurementId: "G-B689DBWYPG"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// -----------------------------
// DOM refs
// -----------------------------
const scriptInput   = document.getElementById("scriptInput");
const saveBtn       = document.getElementById("saveBtn");
const gameList      = document.getElementById("gameList");
const boardEl       = document.getElementById("board");
const playBtn       = document.getElementById("playBtn");
const prevBtn       = document.getElementById("prevBtn");
const nextBtn       = document.getElementById("nextBtn");
const stepLabel     = document.getElementById("stepLabel");
const scriptViewer  = document.getElementById("scriptViewer");

// -----------------------------
// Board model
// -----------------------------
const sectors = 6;
const rings   = 4;

// monsters: { id, sector, ring, type, dead }
let monsters = [];
// destroyed cells: `${sector}-${ring}` => true
let destroyed = {};
// parsed steps
let steps = [];
let currentStep = 0;
let playTimer = null;

// -----------------------------
// Build board grid
// -----------------------------
function buildBoard() {
  boardEl.innerHTML = "";
  for (let r = rings; r >= 1; r--) {
    for (let s = 1; s <= sectors; s++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.sector = s;
      cell.dataset.ring = r;

      const inner = document.createElement("div");
      inner.className = `cell-inner ring-${r}`;
      inner.textContent = `${s}/${r}`;
      cell.appendChild(inner);

      boardEl.appendChild(cell);
    }
  }
}

function renderBoard() {
  // clear monsters/destroyed visuals
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach(cell => {
    cell.querySelectorAll(".monster").forEach(m => m.remove());
    cell.classList.remove("destroyed");
  });

  // destroyed cells
  Object.keys(destroyed).forEach(key => {
    const [s, r] = key.split("-").map(Number);
    const cell = findCell(s, r);
    if (cell) {
      cell.style.filter = "grayscale(1)";
      cell.style.opacity = "0.5";
    }
  });

  // monsters
  monsters.forEach(m => {
    const cell = findCell(m.sector, m.ring);
    if (!cell) return;
    const dot = document.createElement("div");
    dot.className = `monster ${m.type}` + (m.dead ? " dead" : "");
    cell.appendChild(dot);
  });
}

function findCell(sector, ring) {
  return boardEl.querySelector(`.cell[data-sector="${sector}"][data-ring="${ring}"]`);
}

// -----------------------------
// Script parsing
// -----------------------------
function parseScript(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  const parsed = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    const cmd = parts[0].toUpperCase();

    if (cmd === "SPAWN" && (parts.length === 4 || parts.length === 5)) {
      const sector = Number(parts[1]);
      const ring   = Number(parts[2]);
      const type   = parts[3].toUpperCase();
      const id     = parts[4] || `m${parsed.length + 1}`;
      parsed.push({ type: "SPAWN", sector, ring, monsterType: type, id });
    } else if (cmd === "MOVE" && parts.length === 4) {
      const id     = parts[1];
      const sector = Number(parts[2]);
      const ring   = Number(parts[3]);
      parsed.push({ type: "MOVE", id, sector, ring });
    } else if (cmd === "HIT" && parts.length === 2) {
      const id = parts[1];
      parsed.push({ type: "HIT", id });
    } else if (cmd === "DESTROY" && parts.length === 3) {
      const sector = Number(parts[1]);
      const ring   = Number(parts[2]);
      parsed.push({ type: "DESTROY", sector, ring });
    } else {
      // unknown line, keep as comment step
      parsed.push({ type: "NOTE", text: line });
    }
  }

  return parsed;
}

function resetState() {
  monsters = [];
  destroyed = {};
  currentStep = 0;
  steps = [];
  updateStepLabel();
  renderBoard();
}

function applyStep(step) {
  switch (step.type) {
    case "SPAWN": {
      monsters.push({
        id: step.id,
        sector: step.sector,
        ring: step.ring,
        type: step.monsterType,
        dead: false
      });
      break;
    }
    case "MOVE": {
      const m = monsters.find(x => x.id === step.id);
      if (m) {
        m.sector = step.sector;
        m.ring   = step.ring;
      }
      break;
    }
    case "HIT": {
      const m = monsters.find(x => x.id === step.id);
      if (m) m.dead = true;
      break;
    }
    case "DESTROY": {
      destroyed[`${step.sector}-${step.ring}`] = true;
      break;
    }
    case "NOTE":
    default:
      // visual no-op
      break;
  }
}

function goToStep(n) {
  if (!steps.length) return;
  if (n < 0) n = 0;
  if (n > steps.length) n = steps.length;

  monsters = [];
  destroyed = {};
  currentStep = n;

  for (let i = 0; i < n; i++) {
    applyStep(steps[i]);
  }

  renderBoard();
  updateStepLabel();
}

function updateStepLabel() {
  stepLabel.textContent = `Step: ${currentStep} / ${steps.length}`;
}

// -----------------------------
// Playback controls
// -----------------------------
function play() {
  if (!steps.length) return;
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
    playBtn.textContent = "Play";
    return;
  }
  playBtn.textContent = "Pause";
  playTimer = setInterval(() => {
    if (currentStep >= steps.length) {
      clearInterval(playTimer);
      playTimer = null;
      playBtn.textContent = "Play";
      return;
    }
    goToStep(currentStep + 1);
  }, 600);
}

function next() {
  if (!steps.length) return;
  goToStep(currentStep + 1);
}

function prev() {
  if (!steps.length) return;
  goToStep(currentStep - 1);
}

// -----------------------------
// Firebase: save / load
// -----------------------------
async function saveGame() {
  const script = scriptInput.value.trim();
  if (!script) {
    alert("Enter a script first!");
    return;
  }

  const gamesRef = ref(db, "games");
  const newGameRef = push(gamesRef);

  await set(newGameRef, {
    script,
    timestamp: Date.now()
  });

  scriptInput.value = "";
  await loadGames();
}

async function loadGames() {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, "games"));

  gameList.innerHTML = "";

  if (!snapshot.exists()) return;

  const games = snapshot.val();
  const keys = Object.keys(games);

  keys.forEach((key, index) => {
    const data = games[key];
    const li = document.createElement("li");
    const date = data.timestamp ? new Date(data.timestamp).toLocaleString() : "";
    li.innerHTML = `<button data-id="${key}">Game #${index + 1} – ${date}</button>`;
    gameList.appendChild(li);
  });

  // attach listeners
  gameList.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      loadGame(id);
    });
  });
}

async function loadGame(id) {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, "games/" + id));
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  scriptViewer.value = data.script || "";

  resetState();
  steps = parseScript(data.script || "");
  updateStepLabel();
}

// -----------------------------
// Wire up
// -----------------------------
buildBoard();
renderBoard();
loadGames();

saveBtn.addEventListener("click", saveGame);
playBtn.addEventListener("click", play);
nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);

// expose for debugging if needed
window.goToStep = goToStep;
