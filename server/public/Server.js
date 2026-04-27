import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dbPkg from "../../Database/Database.js";
const { createUser, findUser } = dbPkg;
import bcrypt from "bcrypt";
import {
  handleInit,
  handlePlayCard,
  handlePlayWild,
  handleDraw,
  deleteGame,
} from "./gameService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Body parsing for login/register forms
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// HTTP + Socket.io
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(path.join(__dirname, "../..")));

// ── Page routes ──────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/main.html"));
});
app.get("/main", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/main.html"));
});
app.get("/connection", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/connection.html"));
});
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/register.html"));
});
app.get("/jeux", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/jeux.html"));
});
app.get("/lobby", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/lobby.html"));
});

// ── Auth routes ──────────────────────────────────────────────────────────────

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).send("Nom d'utilisateur et mot de passe requis.");
  if (username.length > 15)
    return res.status(400).send("Nom d'utilisateur trop long (max 15 caractères).");
  if (password.length < 4)
    return res.status(400).send("Mot de passe trop court (min 4 caractères).");
  try {
    const hash = await bcrypt.hash(password, 10);
    await createUser(username, hash);
    res.redirect("/connection");
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed"))
      return res.status(409).send("Ce nom d'utilisateur est déjà pris.");
    console.error("Erreur register:", err.message);
    res.status(500).send("Erreur serveur lors de l'inscription.");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).send("Nom d'utilisateur et mot de passe requis.");
  try {
    const user = await findUser(username);
    if (!user)
      return res.status(401).send("Nom d'utilisateur ou mot de passe incorrect.");
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).send("Nom d'utilisateur ou mot de passe incorrect.");
    res.redirect("/main");
  } catch (err) {
    console.error("Erreur login:", err.message);
    res.status(500).send("Erreur serveur lors de la connexion.");
  }
});

// ── Lobby / game memory ──────────────────────────────────────────────────────

const lobbies = {}; // { lobbyId: { players: [socketId, ...], maxPlayers } }

// ── Socket.io ────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  socket.on("join-lobby", ({ lobbyId, maxPlayers }) => {
    try {
      if (!lobbies[lobbyId]) lobbies[lobbyId] = { players: [], maxPlayers };
      if (!lobbies[lobbyId].players.includes(socket.id))
        lobbies[lobbyId].players.push(socket.id);
      socket.join(lobbyId);
      io.to(lobbyId).emit("lobby-state", {
        lobbyId,
        playersCount: lobbies[lobbyId].players.length,
      });
      if (lobbies[lobbyId].players.length === lobbies[lobbyId].maxPlayers)
        io.to(lobbyId).emit("start-game");
    } catch (err) {
      console.error("Erreur join-lobby:", err.message);
    }
  });

  socket.on("gamestarts", () => {
    try {
      handleInit(io, socket, lobbies);
    } catch (err) {
      console.error("Erreur gamestarts:", err.message);
    }
  });

  socket.on("draw_card", (lobbyId) => {
    try {
      handleDraw(io, socket, lobbies, lobbyId);
    } catch (err) {
      console.error("Erreur draw_card:", err.message);
    }
  });

  socket.on("play_card", (payload) => {
    try {
      handlePlayCard(io, socket, lobbies, payload);
    } catch (err) {
      console.error("Erreur play_card:", err.message);
    }
  });

  socket.on("play_wild", (payload) => {
    try {
      handlePlayWild(io, socket, lobbies, payload);
    } catch (err) {
      console.error("Erreur play_wild:", err.message);
    }
  });

  socket.on("disconnect", () => {
    try {
      for (const lobbyId in lobbies) {
        const lobby = lobbies[lobbyId];
        lobby.players = lobby.players.filter((id) => id !== socket.id);
        if (lobby.players.length === 0) {
          deleteGame(lobbyId);
          delete lobbies[lobbyId];
        } else {
          io.to(lobbyId).emit("lobby-state", {
            lobbyId,
            playersCount: lobby.players.length,
          });
        }
      }
    } catch (err) {
      console.error("Erreur disconnect:", err.message);
    }
  });

  socket.on("error", (err) => {
    console.error("Erreur socket:", err.message);
  });
});

// ── Global crash guards ──────────────────────────────────────────────────────

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  // log only — do NOT exit
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
  // log only — do NOT exit
});

// ── Start ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT) || 8000;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`server is running on http://0.0.0.0:${port}`);
});
