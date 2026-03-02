import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, get, child }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// -----------------------------
// 1. Your Firebase Config
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

// -----------------------------
// 2. Init Firebase
// -----------------------------
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// -----------------------------
// 3. Save Game
// -----------------------------
async function saveGame() {
  const script = document.getElementById("scriptInput").value.trim();
  if (!script) {
    alert("Enter a script first!");
    return;
  }

  const gamesRef = ref(db, "games");
  const newGameRef = push(gamesRef);

  await set(newGameRef, {
    script: script,
    timestamp: Date.now()
  });

  document.getElementById("scriptInput").value = "";
  loadGames();
}

// -----------------------------
// 4. Load Games
// -----------------------------
async function loadGames() {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, "games"));

  const list = document.getElementById("gameList");
  list.innerHTML = "";

  if (!snapshot.exists()) return;

  const games = snapshot.val();
  const keys = Object.keys(games);

  keys.forEach((key, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<button onclick="viewGame('${key}', ${index + 1})">Game #${index + 1}</button>`;
    list.appendChild(li);
  });
}

// -----------------------------
// 5. View Game
// -----------------------------
async function viewGame(id, num) {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, "games/" + id));

  if (!snapshot.exists()) return;

  const data = snapshot.val();

  document.getElementById("viewerTitle").innerText = "Game #" + num;
  document.getElementById("viewerContent").innerText = data.script;
  document.getElementById("viewer").style.display = "block";
}

// -----------------------------
// 6. Hook up buttons
// -----------------------------
document.getElementById("saveBtn").onclick = saveGame;
window.viewGame = viewGame;

// Load on start
loadGames();
