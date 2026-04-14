import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

// Fichiers statiques
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

// Mémoire des lobbys
const lobbies = {}; // { lobbyId: { players: [] } }
const idToSocket = {}; // Associe un playerId à un socket.id

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  // Associer un playerId au socket
  socket.on("register-id", (playerId) => {
    idToSocket[playerId] = socket.id;
  });

  // INVITATION envoyée par le créateur
  socket.on("invite-friends", ({ lobbyId, invitedIds }) => {
    invitedIds.forEach((pid) => {
      const targetSocket = idToSocket[pid];
      if (targetSocket) {
        io.to(targetSocket).emit("receive-invite", {
          lobbyId,
          from: socket.id,
        });
      }
    });
  });

  // Rejoindre un lobby
  socket.on("join-lobby", ({ lobbyId, maxPlayers }) => {
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = { players: [], maxPlayers };
    }

    if (!lobbies[lobbyId].players.includes(socket.id)) {
      lobbies[lobbyId].players.push(socket.id);
    }

    socket.join(lobbyId);

    io.to(lobbyId).emit("lobby-state", {
      lobbyId,
      playersCount: lobbies[lobbyId].players.length,
    });


    if (lobbies[lobbyId].players.length === lobbies[lobbyId].maxPlayers) {
      io.to(lobbyId).emit("start-game");
    }
  });

  // Déconnexion
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
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`server is running on http://0.0.0.0:${port}`);
});
