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
  for (const id of ["opponents", "middle", "colorpick", "player1", "hud"]) {
    const el = document.getElementById(id);
    if (el) el.replaceChildren();
  }
}

function render(state) {
  if (!state || !myPlayerName) return;
  lastState = state;
  clearTable();
  oncolorpick = false;
  wildPending = null;

  const me = state.players.find((p) => p.name === myPlayerName);
  if (!me) return;

  const isMyTurn = state.current === myPlayerName;

  const opEl = document.getElementById("opponents");
  for (const p of state.players) {
    if (p.name === myPlayerName) continue;
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
    opEl.appendChild(col);
  }

  for (let i = 0; i < me.hand.length; i += 1) {
    const { v, c } = me.hand[i];
    const myButton = document.createElement("button");
    myButton.type = "button";
    myButton.dataset.handIndex = String(i);
    if (!isMyTurn) myButton.disabled = true;
    const myImage = document.createElement("img");
    myImage.src = handPath(v, c);
    myImage.alt = `${v}_${c}`;
    myImage.width = 80;
    myImage.draggable = false;
    myButton.appendChild(myImage);
    myButton.addEventListener("click", cardclick);
    document.getElementById("player1").appendChild(myButton);
  }

  const mid = document.getElementById("middle");
  const piocheBtn = document.createElement("button");
  piocheBtn.type = "button";
  if (!isMyTurn) piocheBtn.disabled = true;
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
    line.textContent = isMyTurn
      ? "C'est à toi de jouer."
      : `Tour de : ${state.current || "…"}`;
    hud.appendChild(line);
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
  const colorpicker = ["rouge", "bleu", "vert", "jaune"];
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
  if (lastState.current !== myPlayerName) return;
  socket.emit("draw_card", lobbyId);
};

socket.emit("gamestarts");

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
