
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

const server = app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

const wss = new WebSocketServer({ server });

const players = {};

wss.on("connection", (ws) => {
  const id = Date.now();
  players[id] = { x: 100, y: 100 };

  ws.send(JSON.stringify({ type: "init", id, players }));

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "position") {
      players[id] = data.position;
      broadcast({ type: "update", id, position: data.position });
    }
  });

  ws.on("close", () => {
    delete players[id];
    broadcast({ type: "leave", id });
  });
});

function broadcast(msg) {
  wss.clients.forEach((c) => {
    if (c.readyState === 1) {
      c.send(JSON.stringify(msg));
    }
  });
}
