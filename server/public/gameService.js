import { Game } from "../../UNO/game.js";
import { Carte } from "../../UNO/cartes.js";
import { comp } from "../../UNO/cpu.js";

const games = new Map();

function playerName(lobby, socketId) {
  const i = lobby?.players.indexOf(socketId) ?? -1;
  if (i < 0) return null;
  return `joueur${i + 1}`;
}

export function deleteGame(lobbyId) {
  games.delete(lobbyId);
}

export function ensureGame(lobbyId, lobbies) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return null;
  if (games.has(lobbyId)) return games.get(lobbyId);
  const g = new Game();
  const cpu = Math.max(0, lobby.maxPlayers - lobby.players.length);
  g.createjoueur(cpu, lobby.maxPlayers);
  g.start();
  games.set(lobbyId, g);
  return g;
}

export function statePayload(g) {
  return {
    discard: g.tas.devant
      ? { v: g.tas.devant.get_valeur(), c: g.tas.devant.get_couleur() }
      : null,
    current: g.joueur[0] ? g.joueur[0].nom : null,
    players: g.joueur.map((j) => ({
      name: j.nom,
      ordi: j.ordi,
      nCards: j.jeu.cartes.length,
      hand: j.jeu.cartes.map((c) => ({ v: c.get_valeur(), c: c.get_couleur() })),
    })),
    victory: g.victory,
    winner: g.gagnant && g.gagnant.nom ? g.gagnant.nom : g.gagnant,
  };
}

function broadcastState(io, lobbyId) {
  const g = games.get(lobbyId);
  if (!g) return;
  io.to(lobbyId).emit("game_state", statePayload(g));
}

function runCpuChain(io, lobbyId) {
  const g = games.get(lobbyId);
  if (!g) return;
  let guard = 0;
  while (g.joueur[0]?.ordi && !g.victory && guard++ < 32) {
    comp(g);
    g.new_turn();
  }
  broadcastState(io, lobbyId);
}

export function handleInit(io, socket, lobbies) {
  let foundLobbyId = null;
  for (const [id, lobby] of Object.entries(lobbies)) {
    if (lobby.players.includes(socket.id)) {
      foundLobbyId = id;
      break;
    }
  }
  if (!foundLobbyId) {
    foundLobbyId = "solo-" + socket.id;
    lobbies[foundLobbyId] = { players: [socket.id], maxPlayers: 2 };
    socket.join(foundLobbyId);
  }
  const g = ensureGame(foundLobbyId, lobbies);
  if (!g) return;
  const lobby = lobbies[foundLobbyId];
  const my = playerName(lobby, socket.id);
  const payload = {
    lobbies: { ...lobbies },
    lobbyId: foundLobbyId,
    myPlayerName: my,
    state: statePayload(g),
  };
  socket.emit("init_data", payload);
  if (g.joueur[0]?.ordi) {
    runCpuChain(io, foundLobbyId);
  } else {
    broadcastState(io, foundLobbyId);
  }
}

export function handlePlayCard(io, socket, lobbies, { lobbyId, index }) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g) return;
  const name = playerName(lobby, socket.id);
  if (name !== g.joueur[0]?.nom) return;
  const p = g.joueur.find((j) => j.nom === name);
  if (!p || p.ordi) return;
  const c = p.jeu.cartes[index];
  if (!c) return;
  if (c.get_valeur() === "joker" || c.get_valeur() === "+4") return;
  if (!p.pose(c, g.tas.devant, g, String(index))) return;
  g.checkpose(p, [c, String(index)]);
  if (g.gagnant) {
    g.victory = true;
    broadcastState(io, lobbyId);
    return;
  }
  g.new_turn();
  broadcastState(io, lobbyId);
  runCpuChain(io, lobbyId);
}

export function handlePlayWild(io, socket, lobbies, { lobbyId, index, color }) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g) return;
  const name = playerName(lobby, socket.id);
  if (name !== g.joueur[0]?.nom) return;
  const p = g.joueur.find((j) => j.nom === name);
  if (!p || p.ordi) return;
  const c0 = p.jeu.cartes[index];
  if (!c0) return;
  if (c0.get_valeur() !== "joker" && c0.get_valeur() !== "+4") return;
  p.jeu.cartes[index] = new Carte(color, c0.get_valeur());
  const c = p.jeu.cartes[index];
  if (!p.pose(c, g.tas.devant, g, String(index))) return;
  g.checkpose(p, [c, String(index)]);
  if (g.gagnant) {
    g.victory = true;
    broadcastState(io, lobbyId);
    return;
  }
  g.new_turn();
  broadcastState(io, lobbyId);
  runCpuChain(io, lobbyId);
}

export function handleDraw(io, socket, lobbies, lobbyId) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g) return;
  const name = playerName(lobby, socket.id);
  if (name !== g.joueur[0]?.nom) return;
  const p = g.joueur.find((j) => j.nom === name);
  if (!p || p.ordi) return;
  p.old_pioche(1, g);
  g.new_turn();
  broadcastState(io, lobbyId);
  runCpuChain(io, lobbyId);
}
