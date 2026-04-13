import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// HTTP + Socket.io
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
  },
});

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(path.join(__dirname, "../..")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/main.html"));
});

app.get("/main", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/main.html"));
});

app.get("/connection", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/connection.html"));
});

app.get("/jeux", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/jeux.html"));
});

app.get("/lobby", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/lobby.html"));
});

// gestion de la mémo
const lobbies = {}; // { lobbyId: { players: [socketId, ...] } }

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  socket.on("join-lobby", ({ lobbyId }) => {
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = { players: [] };
    }

    if (!lobbies[lobbyId].players.includes(socket.id)) {
      lobbies[lobbyId].players.push(socket.id);
    }

    socket.join(lobbyId);

    io.to(lobbyId).emit("lobby-state", {
      lobbyId,
      playersCount: lobbies[lobbyId].players.length,
    });
  });

  socket.on("disconnect", () => {
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      lobby.players = lobby.players.filter((id) => id !== socket.id);

      if (lobby.players.length === 0) {
        delete lobbies[lobbyId];
      } else {
        io.to(lobbyId).emit("lobby-state", {
          lobbyId,
          playersCount: lobby.players.length,
        });
      }
    }
  });
});

const port = 8000;
httpServer.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});