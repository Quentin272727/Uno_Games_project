import test from "node:test";
import assert from "node:assert";
import {
  ensureGame,
  deleteGame,
  statePayload,
  handlePlayCard,
} from "../gameService.js";

function makeIo() {
  const emissions = [];
  return {
    emissions,
    to() {
      return {
        emit(event, payload) {
          emissions.push({ event, payload });
        },
      };
    },
  };
}

test("solo: 1 joueur connecté, maxPlayers 2 → 1 humain + 1 IA", () => {
  const id = "t-solo";
  deleteGame(id);
  const lobbies = { [id]: { players: ["sock-a"], maxPlayers: 2 } };
  const g = ensureGame(id, lobbies);
  assert.strictEqual(g.joueur.length, 2);
  assert.strictEqual(g.joueur.filter((j) => !j.ordi).length, 1);
  assert.strictEqual(g.joueur.filter((j) => j.ordi).length, 1);
});

test("lobby 2 humains (salle pleine): 0 IA", () => {
  const id = "t-2h";
  deleteGame(id);
  const lobbies = {
    [id]: { players: ["sock-a", "sock-b"], maxPlayers: 2 },
  };
  const g = ensureGame(id, lobbies);
  assert.strictEqual(g.joueur.filter((j) => !j.ordi).length, 2);
  assert.strictEqual(g.joueur.filter((j) => j.ordi).length, 0);
});

test("force-fill lobby 4: 1 humain + 3 IA (comme « Rejoindre quand même »)", () => {
  const id = "force-fill-test-4";
  deleteGame(id);
  const lobbies = {
    [id]: { players: ["sock-human"], maxPlayers: 4 },
  };
  const g = ensureGame(id, lobbies);
  assert.strictEqual(g.joueur.length, 4);
  assert.strictEqual(g.joueur.filter((j) => !j.ordi).length, 1);
  assert.strictEqual(g.joueur.filter((j) => j.ordi).length, 3);
});

test("force-fill lobby 3: 1 humain + 2 IA", () => {
  const id = "force-fill-test-3";
  deleteGame(id);
  const lobbies = {
    [id]: { players: ["sock-human"], maxPlayers: 3 },
  };
  const g = ensureGame(id, lobbies);
  assert.strictEqual(g.joueur.length, 3);
  assert.strictEqual(g.joueur.filter((j) => !j.ordi).length, 1);
  assert.strictEqual(g.joueur.filter((j) => j.ordi).length, 2);
});

test("statePayload: défausse, tour courant, 2 mains", () => {
  const id = "t-state";
  deleteGame(id);
  const lobbies = { [id]: { players: ["s1"], maxPlayers: 2 } };
  const g = ensureGame(id, lobbies);
  const s = statePayload(g);
  assert.ok(s.discard && "v" in s.discard && "c" in s.discard);
  assert.ok(typeof s.current === "string" && s.current.length > 0);
  assert.strictEqual(s.players.length, 2);
  assert.strictEqual(s.players[0].hand.length, 7);
});

test("ensureGame réutilise la même partie pour un même lobbyId", () => {
  const id = "t-reuse";
  deleteGame(id);
  const lobbies = { [id]: { players: ["s1"], maxPlayers: 2 } };
  const g1 = ensureGame(id, lobbies);
  const g2 = ensureGame(id, lobbies);
  assert.strictEqual(g1, g2);
});

test("handlePlayCard: joue une carte jouable (non wild) et diffuse game_state", () => {
  let succeeded = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const id = `t-play-${attempt}`;
    deleteGame(id);
    const lobbies = { [id]: { players: ["s1"], maxPlayers: 2 } };
    const g = ensureGame(id, lobbies);
    let guard = 0;
    while (g.joueur[0].ordi && guard++ < 12) {
      g.new_turn();
    }
    if (g.joueur[0].ordi) continue;
    const p = g.joueur[0];
    let idx = -1;
    for (let i = 0; i < p.jeu.cartes.length; i += 1) {
      const c = p.jeu.cartes[i];
      const v = c.get_valeur();
      if (v === "joker" || v === "+4") continue;
      if (p.pose(c, g.tas.devant, g, String(i))) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    const io = makeIo();
    handlePlayCard(io, { id: "s1" }, lobbies, { lobbyId: id, index: idx });
    assert.ok(
      io.emissions.some((e) => e.event === "game_state"),
      "game_state après une pose (la main peut aussi changer si l'IA enchaîne)",
    );
    succeeded = true;
    break;
  }
  assert.ok(
    succeeded,
    "aucun tirage avec carte non-wild jouable après 40 essais (extrêmement rare)",
  );
});
