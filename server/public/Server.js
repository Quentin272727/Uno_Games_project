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
  handleContreUno,
  deleteGame,
  syncGameWithLobbySize,
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

/** Invitations : seules les connexions depuis la machine du serveur (loopback) peuvent envoyer. */
const socketByPlayerId = new Map(); // playerId -> socket.id
const playerIdBySocket = new Map(); // socket.id -> playerId
const pendingInvites = new Map(); // inviteToken -> { hostSocketId, hostPlayerId, targetPlayerId, joueurs }

function clientAddressIsLoopback(socket) {
  const raw =
    socket.handshake?.address ||
    socket.request?.connection?.remoteAddress ||
    "";
  return (
    raw === "127.0.0.1" ||
    raw === "::1" ||
    raw === "::ffff:127.0.0.1"
  );
}

function canSendInvite(socket) {
  if (process.env.UNO_INVITE_ALLOW_ALL === "1") return true;
  return clientAddressIsLoopback(socket);
}

function lobbyIdForInvite(hostPlayerId, targetPlayerId, joueurs) {
  if (joueurs === 2) {
    return [hostPlayerId, targetPlayerId].sort().join("-");
  }
  return hostPlayerId;
}

// ── Socket.io ────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  socket.on("register-player", ({ playerId }) => {
    try {
      if (!playerId || typeof playerId !== "string") return;
      const pid = playerId.trim().toUpperCase();
      if (!pid) return;
      const prevPid = playerIdBySocket.get(socket.id);
      if (prevPid) socketByPlayerId.delete(prevPid);
      playerIdBySocket.set(socket.id, pid);
      socketByPlayerId.set(pid, socket.id);
    } catch (err) {
      console.error("Erreur register-player:", err.message);
    }
  });

  socket.on("send-invite", ({ targetPlayerId, joueurs }) => {
    try {
      if (!canSendInvite(socket)) {
        socket.emit("invite-error", { reason: "not-host" });
        return;
      }
      const hostPlayerId = playerIdBySocket.get(socket.id);
      if (!hostPlayerId) return;
      const tid = String(targetPlayerId || "").trim().toUpperCase();
      if (!tid || tid === hostPlayerId) {
        socket.emit("invite-error", { reason: "bad-target" });
        return;
      }
      const j = Number(joueurs);
      if (![2, 3, 4].includes(j)) {
        socket.emit("invite-error", { reason: "bad-joueurs" });
        return;
      }
      const targetSid = socketByPlayerId.get(tid);
      if (!targetSid) {
        socket.emit("invite-error", { reason: "offline" });
        return;
      }
      const inviteToken = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      pendingInvites.set(inviteToken, {
        hostSocketId: socket.id,
        hostPlayerId,
        targetPlayerId: tid,
        joueurs: j,
      });
      io.to(targetSid).emit("invite-offer", {
        hostPlayerId,
        joueurs: j,
        inviteToken,
      });
    } catch (err) {
      console.error("Erreur send-invite:", err.message);
    }
  });

  socket.on("invite-response", ({ inviteToken, accepted }) => {
    try {
      const inv = pendingInvites.get(inviteToken);
      if (!inv) return;
      const responderPid = playerIdBySocket.get(socket.id);
      if (responderPid !== inv.targetPlayerId) return;
      pendingInvites.delete(inviteToken);

      const hostSocket = io.sockets.sockets.get(inv.hostSocketId);
      if (!accepted) {
        if (hostSocket) hostSocket.emit("invite-declined");
        return;
      }

      const lobbyId = lobbyIdForInvite(
        inv.hostPlayerId,
        inv.targetPlayerId,
        inv.joueurs,
      );
      const payload = { lobbyId, maxPlayers: inv.joueurs };
      if (hostSocket) hostSocket.emit("invite-accepted", payload);
      socket.emit("invite-accepted", payload);
    } catch (err) {
      console.error("Erreur invite-response:", err.message);
    }
  });

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
      syncGameWithLobbySize(io, lobbyId, lobbies);
    } catch (err) {
      console.error("Erreur join-lobby:", err.message);
    }
  });

  /** Un joueur du salon lance la partie : tout le monde (même room Socket.IO) est redirigé vers /jeux. */
  socket.on("lobby-force-start", ({ lobbyId, maxPlayers }) => {
    try {
      const lobby = lobbies[lobbyId];
      if (!lobby || !lobby.players.includes(socket.id)) return;
      const mp = Number(maxPlayers);
      const safeMp =
        Number.isFinite(mp) && mp >= 1 ? mp : lobby.maxPlayers;
      io.to(lobbyId).emit("lobby-force-start-go", {
        lobbyId,
        maxPlayers: safeMp,
      });
    } catch (err) {
      console.error("Erreur lobby-force-start:", err.message);
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

  socket.on("contre_uno", (payload) => {
    try {
      const lobbyId = payload?.lobbyId;
      if (!lobbyId) return;
      handleContreUno(io, socket, lobbies, { lobbyId });
    } catch (err) {
      console.error("Erreur contre_uno:", err.message);
    }
  });

  socket.on("disconnect", () => {
    try {
      const pid = playerIdBySocket.get(socket.id);
      if (pid) {
        socketByPlayerId.delete(pid);
        playerIdBySocket.delete(socket.id);
      }
      for (const [token, inv] of pendingInvites.entries()) {
        if (
          inv.hostSocketId === socket.id ||
          inv.targetPlayerId === pid
        ) {
          pendingInvites.delete(token);
        }
      }

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
