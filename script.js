const repoOwner = "Joshuewok-Minecraft-fun-Owner";
const repoName = "castle-panic-logger";

let accessToken = null;

// ---------------------------
// OAuth Device Flow
// ---------------------------
async function startOAuth() {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      client_id: "Ov23lin8MD5Weh0M48Z6",
      scope: "repo"
    })
  });

  const data = await res.json();
  alert("Go to " + data.verification_uri + " and enter code: " + data.user_code);

  pollForToken(data);
}

async function pollForToken(deviceData) {
  const interval = setInterval(async () => {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        client_id: "Ov23lin8MD5Weh0M48Z6",
        device_code: deviceData.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });

    const data = await res.json();

    if (data.access_token) {
      clearInterval(interval);
      accessToken = data.access_token;
      document.getElementById("authSection").style.display = "none";
      loadGames();
    }
  }, deviceData.interval * 1000);
}

// ---------------------------
// Create a new Game Issue
// ---------------------------
async function saveGame() {
  if (!accessToken) {
    document.getElementById("authSection").style.display = "block";
    return;
  }

  const script = document.getElementById("scriptInput").value.trim();
  if (!script) return alert("Enter a script first!");

  await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      title: "Castle Panic Game",
      body: script
    })
  });

  document.getElementById("scriptInput").value = "";
  loadGames();
}

// ---------------------------
// Load all issues (games)
// ---------------------------
async function loadGames() {
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`);
  const issues = await res.json();

  const list = document.getElementById("gameList");
  list.innerHTML = "";

  issues.forEach(issue => {
    const li = document.createElement("li");
    li.innerHTML = `<button onclick="viewGame(${issue.number})">Game #${issue.number}</button>`;
    list.appendChild(li);
  });
}

// ---------------------------
// View a single game
// ---------------------------
async function viewGame(num) {
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${num}`);
  const issue = await res.json();

  document.getElementById("viewerTitle").innerText = "Game #" + num;
  document.getElementById("viewerContent").innerText = issue.body;
  document.getElementById("viewer").style.display = "block";
}

// ---------------------------
// Event Listeners
// ---------------------------
document.getElementById("saveBtn").onclick = saveGame;
document.getElementById("authBtn").onclick = startOAuth;

loadGames();
