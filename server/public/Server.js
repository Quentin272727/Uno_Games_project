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
app.use(express.static(path.join(__dirname, "../../")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../../html/main.html"));
});

app.get("/main", (req, res) => {
    res.sendFile(path.join(__dirname, "../../html/main.html"));
    
});

app.get("/jeux", (req, res) => {
    res.sendFile(path.join(__dirname, "../../html/jeux.html"));
});

app.get("/lobby", (req, res) => {
    res.sendFile(path.join(__dirname, "../../html/lobby.html"));
});

// Mémoire des lobbys
const lobbies = {}; // { lobbyId: { players: [], maxPlayers, creator } }
const idToSocket = {}; // Associe un playerId à un socket.id

io.on("connection", (socket) => {
    console.log("Nouvelle connexion :", socket.id);

      // 1) Enregistrer l'ID du joueur
    
    socket.on("register-id", (playerId) => {
        idToSocket[playerId] = socket.id;
    });

       //2) Invitations
    
    socket.on("invite-friends", ({ lobbyId, invitedIds }) => {
        invitedIds.forEach((pid) => {
            const targetSocket = idToSocket[pid];
            if (targetSocket) {
                io.to(targetSocket).emit("receive-invite", { lobbyId });
            }
        });
    });

    socket.on("accept-invite", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        const maxPlayers = lobby ? lobby.maxPlayers : 4;

        socket.emit("redirect-to-lobby", {
            lobbyId,
            maxPlayers
        });

    });

    socket.on("decline-invite", ({ lobbyId }) => {
        console.log(`Invitation refusée pour le lobby ${lobbyId}`);
    });

    
       //3) Rejoindre un lobby
    
    socket.on("join-lobby", ({ lobbyId, maxPlayers }) => {

        // Création du lobby si nécessaire
        if (!lobbies[lobbyId]) {
            lobbies[lobbyId] = {
                players: [],
                maxPlayers,
                creator: socket.id
            };
        }

        // Ajouter le joueur
        if (!lobbies[lobbyId].players.includes(socket.id)) {
            lobbies[lobbyId].players.push(socket.id);
        }

        socket.join(lobbyId);

        // Mise à jour du lobby
        io.to(lobbyId).emit("lobby-state", {
            lobbyId,
            playersCount: lobbies[lobbyId].players.length,
        });

        // Si le lobby est plein → démarrage auto
        if (lobbies[lobbyId].players.length === lobbies[lobbyId].maxPlayers) {
            io.to(lobbyId).emit("start-game");
        }
    });

       //4) Demande de démarrage forcé
    socket.on("request-start", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        // Si le joueur est seul → démarrage immédiat
        if (lobby.players.length === 1) {
            io.to(lobbyId).emit("start-game");
            return;
        }

        // Sinon → vote
        lobby.votes = {};
        lobby.voteCount = 0;

        lobby.players.forEach(pid => {
            if (pid !== socket.id) {
                io.to(pid).emit("vote-start-request");
            }
        });
    });

    
       //5) Réponse au vote
   
    socket.on("vote-response", ({ lobbyId, accepted }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        lobby.voteCount++;

        // Si quelqu’un refuse → prévenir le créateur
        if (!accepted) {
            const launcher = lobby.creator;
            io.to(launcher).emit("vote-denied");
            return;
        }

        // Si tout le monde a voté et accepté
        if (lobby.voteCount === lobby.players.length - 1) {
            io.to(lobbyId).emit("start-game");
        }
    });

       //6) Déconnexion
    
    socket.on("disconnect", () => {
        for (const lobbyId in lobbies) {
            const lobby = lobbies[lobbyId];

            lobby.players = lobby.players.filter((id) => id !== socket.id);

            // Si le lobby est vide → supprimer
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

const port = 8080;
httpServer.listen(port, "0.0.0.0", () => {
    console.log(`server is running on http://0.0.0.0:${port}`);
});
