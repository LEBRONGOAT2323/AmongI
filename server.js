const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

const wss = new WebSocketServer({ server });

const players = {};
let gameStarted = false;

function assignRoles() {
  const ids = Object.keys(players);
  if (ids.length < 2) return;

  const impostorId = ids[Math.floor(Math.random() * ids.length)];

  ids.forEach(id => {
    players[id].role = id === impostorId ? "impostor" : "crewmate";
  });

  gameStarted = true;

  broadcast({ type: "rolesAssigned", players });
}

wss.on("connection", (ws) => {
  const id = Date.now().toString();

  players[id] = {
    x: 100,
    y: 100,
    role: null,
    alive: true
  };

  ws.send(JSON.stringify({
    type: "init",
    id,
    players
  }));

  if (Object.keys(players).length >= 2 && !gameStarted) {
    assignRoles();
  }

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "position" && players[id]?.alive) {
      players[id].x = data.position.x;
      players[id].y = data.position.y;
      broadcast({ type: "update", id, position: players[id] });
    }

    if (data.type === "kill") {
      const targetId = data.targetId;

      if (
        players[id].role === "impostor" &&
        players[targetId] &&
        players[targetId].alive
      ) {
        players[targetId].alive = false;
        broadcast({ type: "killed", targetId });
      }
    }
  });

  ws.on("close", () => {
    delete players[id];
    broadcast({ type: "leave", id });
  });
});

function broadcast(msg) {
  wss.clients.forEach(c => {
    if (c.readyState === 1) {
      c.send(JSON.stringify(msg));
    }
  });
}
