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
  const uc = g.unoContest;
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
    unoContest: uc ? { defendingNom: uc.defendingNom } : null,
  };
}

function broadcastState(io, lobbyId) {
  const g = games.get(lobbyId);
  if (!g) return;
  io.to(lobbyId).emit("game_state", statePayload(g));
}

function scheduleContreUnoCpuDelays(io, lobbyId, lobbies) {
  const g = games.get(lobbyId);
  if (!g?.unoContest) return;
  for (const j of g.joueur) {
    if (!j.ordi) continue;
    const delayMs = 1000 + Math.floor(Math.random() * 2001);
    setTimeout(() => {
      handleContreUno(io, null, lobbies, { lobbyId, fromPlayerNom: j.nom });
    }, delayMs);
  }
}

/** Après une pose : soit contest contre-UNO, soit fin de tour normale. */
function advanceAfterPlay(io, lobbyId, lobbies, g) {
  if (g.victory) {
    broadcastState(io, lobbyId);
    return;
  }
  if (g.unoContest) {
    broadcastState(io, lobbyId);
    scheduleContreUnoCpuDelays(io, lobbyId, lobbies);
    return;
  }
  g.new_turn();
  broadcastState(io, lobbyId);
  runCpuChain(io, lobbyId, lobbies);
}

function runCpuChain(io, lobbyId, lobbies) {
  const g = games.get(lobbyId);
  if (!g) return;
  let guard = 0;
  while (g.joueur[0]?.ordi && !g.victory && guard++ < 32) {
    comp(g);
    if (g.victory) {
      broadcastState(io, lobbyId);
      return;
    }
    if (g.unoContest) {
      broadcastState(io, lobbyId);
      scheduleContreUnoCpuDelays(io, lobbyId, lobbies);
      return;
    }
    g.new_turn();
  }
  broadcastState(io, lobbyId);
}

export function handleContreUno(io, socket, lobbies, { lobbyId, fromPlayerNom } = {}) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g?.unoContest || g.victory) return;
  const defendingNom = g.unoContest.defendingNom;
  const clicker = fromPlayerNom ?? playerName(lobby, socket?.id);
  if (!clicker) return;

  g.unoContest = null;

  const defender = g.joueur.find((j) => j.nom === defendingNom);
  if (clicker !== defendingNom && defender) {
    defender.jeu.ajoutercartes(2, g);
  }
  for (const j of g.joueur) {
    j.uno = false;
    j.pressed = -1;
  }

  g.new_turn();
  broadcastState(io, lobbyId);
  runCpuChain(io, lobbyId, lobbies);
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
    runCpuChain(io, foundLobbyId, lobbies);
  } else {
    broadcastState(io, foundLobbyId);
  }
}

export function handlePlayCard(io, socket, lobbies, { lobbyId, index }) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g) return;
  if (g.unoContest) return;
  const name = playerName(lobby, socket.id);
  if (name !== g.joueur[0]?.nom) return;
  const p = g.joueur.find((j) => j.nom === name);
  if (!p || p.ordi) return;
  const c = p.jeu.cartes[index];
  if (!c) return;
  if (c.get_valeur() === "joker" || c.get_valeur() === "+4") return;
  if (!p.pose(c, g.tas.devant, g, String(index))) return;
  g.checkpose(p, [c, String(index)]);
  if (g.victory) {
    broadcastState(io, lobbyId);
    return;
  }
  advanceAfterPlay(io, lobbyId, lobbies, g);
}

export function handlePlayWild(io, socket, lobbies, { lobbyId, index, color }) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g) return;
  if (g.unoContest) return;
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
  if (g.victory) {
    broadcastState(io, lobbyId);
    return;
  }
  advanceAfterPlay(io, lobbyId, lobbies, g);
}

export function handleDraw(io, socket, lobbies, lobbyId) {
  const lobby = lobbies[lobbyId];
  const g = games.get(lobbyId);
  if (!lobby || !g) return;
  if (g.unoContest) return;
  const name = playerName(lobby, socket.id);
  if (name !== g.joueur[0]?.nom) return;
  const p = g.joueur.find((j) => j.nom === name);
  if (!p || p.ordi) return;
  p.old_pioche(1, g);
  g.new_turn();
  broadcastState(io, lobbyId);
  runCpuChain(io, lobbyId, lobbies);
}
