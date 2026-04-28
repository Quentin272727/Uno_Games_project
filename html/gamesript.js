const IMG_BASE = "/images_cartes";

function handPath(v, c) {
  if (v === "joker" || v === "+4") return `${IMG_BASE}/${v}.png`;
  return `${IMG_BASE}/${v}_${c}.png`;
}

function discardPath(d) {
  if (!d) return null;
  const { v, c } = d;
  if (v === "+4" && c) return `${IMG_BASE}/+4_${c}.png`;
  if (v === "joker" && c) return `${IMG_BASE}/joker_${c}.png`;
  if (v === "joker" || v === "+4") return `${IMG_BASE}/${v}.png`;
  return `${IMG_BASE}/${v}_${c}.png`;
}

const socket = io();
let lobbyId = null;
let myPlayerName = null;
let oncolorpick = false;
let lastState = null;
let wildPending = null; // { index, v, c } — index in hand

function clearTable() {
  for (const id of [
    "seat-north",
    "seat-west",
    "seat-east",
    "middle",
    "colorpick",
    "player1",
    "hud",
  ]) {
    const el = document.getElementById(id);
    if (el) el.replaceChildren();
  }
}

function buildOpponentCol(p) {
  const col = document.createElement("div");
  col.className = "opponent-col";
  const cap = document.createElement("div");
  cap.className = "opponent-name";
  cap.textContent = p.ordi ? `${p.name} (IA)` : p.name;
  const row = document.createElement("div");
  row.className = "opponent-hand";
  for (let k = 0; k < p.nCards; k += 1) {
    const im = document.createElement("img");
    im.src = `${IMG_BASE}/dos.png`;
    im.alt = "dos";
    im.width = 50;
    row.appendChild(im);
  }
  col.appendChild(cap);
  col.appendChild(row);
  return col;
}

/** Place les adversaires (est / nord / ouest) selon l’ordre de jeu serveur. */
function renderOpponentSeats(state, meName) {
  const north = document.getElementById("seat-north");
  const west = document.getElementById("seat-west");
  const east = document.getElementById("seat-east");
  if (!north || !west || !east) return;

  const order = state.players.map((p) => p.name);
  const myIdx = order.indexOf(meName);
  if (myIdx < 0) return;

  const byName = (nm) => state.players.find((x) => x.name === nm);
  const n = order.length;

  north.replaceChildren();
  west.replaceChildren();
  east.replaceChildren();

  const setHidden = (el, hidden) => {
    el.classList.toggle("seat--hidden", hidden);
  };

  if (n === 2) {
    const opp = byName(order[(myIdx + 1) % 2]);
    if (opp) north.appendChild(buildOpponentCol(opp));
    setHidden(north, false);
    setHidden(west, true);
    setHidden(east, true);
  } else if (n === 3) {
    const pN = byName(order[(myIdx + 1) % 3]);
    const pE = byName(order[(myIdx + 2) % 3]);
    if (pN) north.appendChild(buildOpponentCol(pN));
    if (pE) east.appendChild(buildOpponentCol(pE));
    setHidden(north, false);
    setHidden(west, true);
    setHidden(east, false);
  } else if (n >= 4) {
    const pE = byName(order[(myIdx + 1) % 4]);
    const pN = byName(order[(myIdx + 2) % 4]);
    const pW = byName(order[(myIdx + 3) % 4]);
    if (pE) east.appendChild(buildOpponentCol(pE));
    if (pN) north.appendChild(buildOpponentCol(pN));
    if (pW) west.appendChild(buildOpponentCol(pW));
    setHidden(north, false);
    setHidden(west, false);
    setHidden(east, false);
  } else {
    setHidden(north, true);
    setHidden(west, true);
    setHidden(east, true);
  }
}

function setupFixedActions() {
  const ab = document.getElementById("btn-abandon-fixed");
  const ctr = document.getElementById("btn-contre-uno-fixed");
  if (ab && !ab.dataset.bound) {
    ab.dataset.bound = "1";
    ab.addEventListener("click", () => {
      window.location.href = "/main";
    });
  }
  if (ctr && !ctr.dataset.bound) {
    ctr.dataset.bound = "1";
    ctr.addEventListener("click", onContreFixedClick);
  }
}

function onContreFixedClick() {
  const ctr = document.getElementById("btn-contre-uno-fixed");
  if (!lobbyId) return;
  if (!lastState?.unoContest || lastState.victory) {
    if (ctr) {
      ctr.classList.remove("btn-contre-fixed--nope");
      void ctr.offsetWidth;
      ctr.classList.add("btn-contre-fixed--nope");
    }
    return;
  }
  if (ctr) {
    ctr.classList.remove("btn-contre-hand--pulse");
    void ctr.offsetWidth;
    ctr.classList.add("btn-contre-hand--pulse");
  }
  socket.emit("contre_uno", { lobbyId });
}

function render(state) {
  if (!state || !myPlayerName) return;
  lastState = state;
  setupFixedActions();
  clearTable();
  oncolorpick = false;
  wildPending = null;

  const me = state.players.find((p) => p.name === myPlayerName);
  if (!me) return;

  const isMyTurn = state.current === myPlayerName;
  const blockPlay = Boolean(state.unoContest);
  const canPlayCards = isMyTurn && !blockPlay;

  renderOpponentSeats(state, myPlayerName);

  const handEl = document.getElementById("player1");
  for (let i = 0; i < me.hand.length; i += 1) {
    const { v, c } = me.hand[i];
    const myButton = document.createElement("button");
    myButton.type = "button";
    myButton.dataset.handIndex = String(i);
    if (!canPlayCards) myButton.disabled = true;
    const myImage = document.createElement("img");
    myImage.src = handPath(v, c);
    myImage.alt = `${v}_${c}`;
    myImage.width = 80;
    myImage.draggable = false;
    myButton.appendChild(myImage);
    myButton.addEventListener("click", cardclick);
    handEl.appendChild(myButton);
  }

  const ctrFixed = document.getElementById("btn-contre-uno-fixed");
  if (ctrFixed) {
    const active = Boolean(state.unoContest) && !state.victory;
    ctrFixed.classList.toggle("btn-contre-fixed--inactive", !active);
  }

  const mid = document.getElementById("middle");
  const piocheBtn = document.createElement("button");
  piocheBtn.type = "button";
  if (!canPlayCards) piocheBtn.disabled = true;
  const pimg = document.createElement("img");
  pimg.src = `${IMG_BASE}/tas.png`;
  pimg.alt = "pioche";
  pimg.width = 80;
  piocheBtn.appendChild(pimg);
  piocheBtn.addEventListener("click", pioche);
  mid.appendChild(piocheBtn);

  if (state.discard) {
    const dimg = document.createElement("img");
    dimg.src = discardPath(state.discard);
    dimg.alt = "defausse";
    dimg.width = 60;
    mid.appendChild(dimg);
  }

  const hud = document.getElementById("hud");
  if (hud) {
    const line = document.createElement("p");
    line.className = "hud-line";
    line.textContent = blockPlay
      ? "Contre-UNO : clique sur le bouton en haut à droite — le plus rapide gagne !"
      : isMyTurn
        ? "C'est à toi de jouer."
        : `Tour de : ${state.current || "…"}`;
    hud.appendChild(line);
    if (state.unoContest && !state.victory) {
      const u = document.createElement("p");
      u.className = "hud-uno-hint";
      u.textContent = `Joueur concerné : ${state.unoContest.defendingNom}`;
      hud.appendChild(u);
    }
    if (state.victory) {
      const w = document.createElement("p");
      w.className = "hud-winner";
      w.textContent = `Partie terminée — gagnant : ${state.winner || "?"}`;
      hud.appendChild(w);
    }
  }

}

const cardclick = (event) => {
  if (!lastState || lastState.victory) return;
  const state = lastState;
  if (state.unoContest) return;
  if (state.current !== myPlayerName || oncolorpick) return;
  const btn = event.currentTarget;
  const index = parseInt(btn?.dataset?.handIndex ?? "", 10);
  if (Number.isNaN(index)) return;
  const me = state.players.find((p) => p.name === myPlayerName);
  const card = me?.hand?.[index];
  if (!card) return;
  const { v, c } = card;
  if (v === "joker" || v === "+4") {
    oncolorpick = true;
    wildPending = { index: String(index), v, c };
    pickColorUi();
  } else {
    socket.emit("play_card", { lobbyId, index });
  }
};

function pickColorUi() {
  const el = document.getElementById("colorpick");
  el.replaceChildren();
  const colorpicker = ["rouge", "bleu", "vert", "jaune"]; // colors available 
  for (const col of colorpicker) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.pickColor = col;
    const img = document.createElement("img");
    img.src = `${IMG_BASE}/${col}.png`;
    img.alt = col;
    img.width = 80;
    img.draggable = false;
    btn.appendChild(img);
    btn.addEventListener("click", colorpicked);
    el.appendChild(btn);
  }
}

function colorpicked(event) {
  if (!wildPending) return;
  const btn = event.currentTarget;
  const color =
    btn?.dataset?.pickColor ||
    event.target?.closest?.("button")?.dataset?.pickColor ||
    event.target?.id;
  if (!["rouge", "bleu", "vert", "jaune"].includes(color)) return;
  socket.emit("play_wild", {
    lobbyId,
    index: parseInt(wildPending.index, 10),
    color,
  });
  const el = document.getElementById("colorpick");
  el.replaceChildren();
  oncolorpick = false;
  wildPending = null;
}

const pioche = () => {
  if (!lastState || lastState.victory) return;
  if (lastState.unoContest) return;
  if (lastState.current !== myPlayerName) return;
  socket.emit("draw_card", lobbyId);
};

let gameInitEmitted = false;
socket.on("connect", () => {
  const regId = localStorage.getItem("playerId");
  if (regId) socket.emit("register-player", { playerId: regId });
  const raw = sessionStorage.getItem("unoLobbyJoin");
  if (raw) {
    try {
      const j = JSON.parse(raw);
      sessionStorage.removeItem("unoLobbyJoin");
      socket.emit("join-lobby", {
        lobbyId: j.lobbyId,
        maxPlayers: j.maxPlayers,
      });
    } catch (_) {
      sessionStorage.removeItem("unoLobbyJoin");
    }
  }
  if (!gameInitEmitted) {
    gameInitEmitted = true;
    socket.emit("gamestarts");
  }
});

socket.on("init_data", (payload) => {
  lobbyId = payload.lobbyId;
  myPlayerName = payload.myPlayerName;
  if (payload.state) {
    render(payload.state);
  }
});

socket.on("game_state", (state) => {
  render(state);
});

/** Partie recréée côté serveur (ex. 2e joueur rejoint) : réinit pour le bon nb d’humains + bots. */
socket.on("game_reset", () => {
  socket.emit("gamestarts");
});
