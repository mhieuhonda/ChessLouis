// ChessLouis — Điều khiển phòng chơi: tạo/vào phòng, đồng bộ realtime, đồng hồ, elo, kết thúc ván
import { db } from "./firebase.js";
import { requireAuth } from "./router.js";
import { getTitle, avatarGlyph, randomRoomCode, getParam, escapeHtml } from "./utils.js";
import { showToast, showSuccess, showError, showConfirm } from "./notification.js";
import { ChessBoard } from "./chess.js";
import { ClockController, computeRemaining } from "./timer.js";
import { sendMessage, listenMessages } from "./chat.js";
import { calculateElo } from "./elo.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction,
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

let me = null;
let board = null;
let clock = null;
let roomId = null;
let myColor = null;
let unsubRoom = null;
let unsubChat = null;
let latestRoom = null;
let resultShown = false;
let selectedTC = 600;

const el = (id) => document.getElementById(id);

function showLobby() {
  el("lobby-view")?.classList.remove("hidden");
  el("game-view")?.classList.add("hidden");
}
function showGame() {
  el("lobby-view")?.classList.add("hidden");
  el("game-view")?.classList.remove("hidden");
}

function initTimeControlButtons() {
  document.querySelectorAll(".tc-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tc-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedTC = parseInt(btn.dataset.seconds, 10);
    });
  });
}

async function createRoom() {
  const { user, data } = me;
  let code = randomRoomCode();
  for (let i = 0; i < 5; i++) {
    const existing = await getDoc(doc(db, "rooms", code));
    if (!existing.exists()) break;
    code = randomRoomCode();
  }

  await setDoc(doc(db, "rooms", code), {
    hostUid: user.uid,
    hostUsername: data.username,
    hostElo: data.elo || 1000,
    hostAvatar: data.avatar || "default",
    guestUid: null,
    guestUsername: null,
    guestElo: null,
    guestAvatar: null,
    whiteUid: user.uid,
    blackUid: null,
    status: "waiting",
    fen: START_FEN,
    turn: "w",
    timeControl: selectedTC,
    whiteTime: selectedTC,
    blackTime: selectedTC,
    lastMoveFrom: null,
    lastMoveTo: null,
    lastMoveAtMs: null,
    result: null,
    winnerUid: null,
    drawOfferBy: null,
    resultProcessed: false,
    whiteEloDelta: null,
    blackEloDelta: null,
    createdAt: serverTimestamp()
  });

  history.replaceState(null, "", `play.html?room=${code}`);
  subscribeRoom(code);
}

async function joinRoom(codeRaw) {
  const code = (codeRaw || "").trim().toUpperCase();
  if (!code) { showError("Nhập mã phòng trước đã"); return; }

  const ref = doc(db, "rooms", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) { showError("Không tìm thấy phòng này"); return; }
  const room = snap.data();

  if (room.hostUid === me.user.uid) { showError("Đây là phòng của bạn, hãy chờ đối thủ"); subscribeRoom(code); return; }
  if (room.status !== "waiting") { showError("Phòng đã đầy hoặc đã kết thúc"); return; }

  await updateDoc(ref, {
    guestUid: me.user.uid,
    guestUsername: me.data.username,
    guestElo: me.data.elo || 1000,
    guestAvatar: me.data.avatar || "default",
    blackUid: me.user.uid,
    status: "playing"
  });

  history.replaceState(null, "", `play.html?room=${code}`);
  subscribeRoom(code);
}

function subscribeRoom(code) {
  roomId = code;
  if (unsubRoom) unsubRoom();

  unsubRoom = onSnapshot(doc(db, "rooms", roomId), async (snap) => {
    if (!snap.exists()) return;
    const room = snap.data();
    latestRoom = room;
    myColor = room.hostUid === me.user.uid ? "white" : "black";

    if (room.status === "waiting") {
      renderWaiting(room);
      return;
    }

    if (!board) initGameView(room);
    renderPlayers(room);
    syncBoard(room);
    renderDrawOffer(room);

    if (room.status === "finished") {
      handleFinished(room);
    }
  });
}

function renderWaiting(room) {
  showLobby();
  el("create-panel")?.classList.add("hidden");
  el("join-panel")?.classList.add("hidden");
  el("waiting-panel")?.classList.remove("hidden");
  el("waiting-code").textContent = roomId;
  const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  el("waiting-link").value = link;
}

function initGameView(room) {
  showGame();
  if (unsubChat) unsubChat();
  unsubChat = listenMessages(roomId, me.user.uid, el("chat-messages"));

  board = new ChessBoard({
    boardEl: "board",
    orientation: myColor,
    canMove: () => {
      if (!latestRoom || latestRoom.status !== "playing") return false;
      return (latestRoom.turn === "w" && myColor === "white") || (latestRoom.turn === "b" && myColor === "black");
    },
    onMove: handleLocalMove
  });

  clock = new ClockController({ myEl: "my-time", oppEl: "enemy-time" });
  clock.start(() => {
    if (!latestRoom || latestRoom.status !== "playing") return null;
    const isMyTurn = (latestRoom.turn === "w" && myColor === "white") || (latestRoom.turn === "b" && myColor === "black");
    return {
      running: true,
      isMyTurn,
      myStored: myColor === "white" ? latestRoom.whiteTime : latestRoom.blackTime,
      oppStored: myColor === "white" ? latestRoom.blackTime : latestRoom.whiteTime,
      lastMoveAtMs: latestRoom.lastMoveAtMs
    };
  }, handleTimeout);

  el("chat-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = el("chat-input");
    if (!input.value.trim()) return;
    sendMessage(roomId, me.user.uid, me.data.username, input.value);
    input.value = "";
  });

  el("resign-btn")?.addEventListener("click", handleResign);
  el("draw-btn")?.addEventListener("click", handleOfferDraw);
}

function renderPlayers(room) {
  const meIsHost = myColor === "white";
  const myName = meIsHost ? room.hostUsername : room.guestUsername;
  const myElo = meIsHost ? room.hostElo : room.guestElo;
  const oppName = meIsHost ? room.guestUsername : room.hostUsername;
  const oppElo = meIsHost ? room.guestElo : room.hostElo;
  const oppAvatar = meIsHost ? room.guestAvatar : room.hostAvatar;

  const myTitle = getTitle(myElo || 0, myName);
  const oppTitle = getTitle(oppElo || 0, oppName);

  if (el("my-name")) el("my-name").textContent = myName || "Bạn";
  if (el("my-elo")) el("my-elo").textContent = "Elo: " + (myElo ?? "-");
  if (el("my-title")) {
    el("my-title").innerHTML = `${myTitle.founder ? "👑 " : ""}${escapeHtml(myTitle.name)}`;
    el("my-title").classList.toggle("founder", myTitle.founder);
  }

  if (el("enemy-name")) el("enemy-name").textContent = oppName || "Đang chờ...";
  if (el("enemy-elo")) el("enemy-elo").textContent = "Elo: " + (oppElo ?? "-");
  if (el("enemy-title")) {
    el("enemy-title").innerHTML = `${oppTitle.founder ? "👑 " : ""}${escapeHtml(oppTitle.name)}`;
    el("enemy-title").classList.toggle("founder", oppTitle.founder);
  }
  if (el("enemy-avatar")) el("enemy-avatar").textContent = avatarGlyph({ avatar: oppAvatar });

  const myTurn = (room.turn === "w" && myColor === "white") || (room.turn === "b" && myColor === "black");
  if (el("turn")) el("turn").textContent = myTurn ? "Đến lượt bạn" : `Đến lượt ${escapeHtml(oppName || "đối thủ")}`;
  el("me-player-box")?.classList.toggle("turn-active", myTurn);
  el("enemy-player-box")?.classList.toggle("turn-active", !myTurn);
}

function syncBoard(room) {
  if (board.fen() !== room.fen) board.loadFen(room.fen);
  if (room.lastMoveFrom && room.lastMoveTo) board.markLastMove(room.lastMoveFrom, room.lastMoveTo);
  if (room.status !== "playing") board.lock(); else board.unlock();
}

async function handleLocalMove(move, fen) {
  const myStoredBefore = myColor === "white" ? latestRoom.whiteTime : latestRoom.blackTime;
  const remaining = computeRemaining(myStoredBefore, latestRoom.lastMoveAtMs,
    (latestRoom.turn === "w" && myColor === "white") || (latestRoom.turn === "b" && myColor === "black"));

  const update = {
    fen,
    turn: board.turn(),
    lastMoveFrom: move.from,
    lastMoveTo: move.to,
    lastMoveAtMs: Date.now(),
    drawOfferBy: null,
    [myColor === "white" ? "whiteTime" : "blackTime"]: remaining
  };

  if (board.inCheckmate()) {
    update.status = "finished"; update.result = "checkmate"; update.winnerUid = me.user.uid;
  } else if (board.inDraw()) {
    update.status = "finished"; update.result = "draw"; update.winnerUid = null;
  }

  await updateDoc(doc(db, "rooms", roomId), update);
}

function handleTimeout(who) {
  if (!latestRoom || latestRoom.status !== "playing") return;
  const loserColor = who === "me" ? myColor : (myColor === "white" ? "black" : "white");
  const winnerUid = loserColor === "white" ? latestRoom.blackUid : latestRoom.whiteUid;
  updateDoc(doc(db, "rooms", roomId), { status: "finished", result: "timeout", winnerUid }).catch(() => {});
}

async function handleResign() {
  const ok = await showConfirm("Bạn chắc chắn muốn đầu hàng ván này?");
  if (!ok || !latestRoom) return;
  const winnerUid = myColor === "white" ? latestRoom.blackUid : latestRoom.whiteUid;
  await updateDoc(doc(db, "rooms", roomId), { status: "finished", result: "resign", winnerUid });
}

async function handleOfferDraw() {
  if (!latestRoom || latestRoom.status !== "playing") return;
  if (latestRoom.drawOfferBy === me.user.uid) { showToast("Đã gửi đề nghị, đang chờ phản hồi"); return; }
  await updateDoc(doc(db, "rooms", roomId), { drawOfferBy: me.user.uid });
  showToast("Đã gửi đề nghị hòa cờ");
}

function renderDrawOffer(room) {
  const banner = el("draw-offer-banner");
  if (!banner) return;
  if (room.drawOfferBy && room.drawOfferBy !== me.user.uid && room.status === "playing") {
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

async function acceptDraw() {
  await updateDoc(doc(db, "rooms", roomId), { status: "finished", result: "draw", winnerUid: null });
}
async function declineDraw() {
  await updateDoc(doc(db, "rooms", roomId), { drawOfferBy: null });
}

async function handleFinished(room) {
  if (room.hostUid === me.user.uid && !room.resultProcessed) {
    processResult(room).catch((err) => console.error(err));
  }
  if (!resultShown) { resultShown = true; renderResultModal(room); }
  else { updateResultDeltas(room); }
}

async function processResult(room) {
  await runTransaction(db, async (tx) => {
    const roomRef = doc(db, "rooms", roomId);
    const freshRoomSnap = await tx.get(roomRef);
    const freshRoom = freshRoomSnap.data();
    if (freshRoom.resultProcessed) return;

    const hostRef = doc(db, "users", freshRoom.hostUid);
    const guestRef = doc(db, "users", freshRoom.guestUid);
    const hostSnap = await tx.get(hostRef);
    const guestSnap = await tx.get(guestRef);
    const hostData = hostSnap.data();
    const guestData = guestSnap.data();

    let resultForHost;
    if (freshRoom.result === "draw") resultForHost = 0.5;
    else resultForHost = freshRoom.winnerUid === freshRoom.hostUid ? 1 : 0;

    const { player1New, player2New, player1Delta, player2Delta } =
      calculateElo(hostData.elo || 1000, guestData.elo || 1000, resultForHost);

    tx.update(hostRef, {
      elo: player1New,
      wins: (hostData.wins || 0) + (resultForHost === 1 ? 1 : 0),
      losses: (hostData.losses || 0) + (resultForHost === 0 ? 1 : 0),
      draws: (hostData.draws || 0) + (resultForHost === 0.5 ? 1 : 0)
    });
    tx.update(guestRef, {
      elo: player2New,
      wins: (guestData.wins || 0) + (resultForHost === 0 ? 1 : 0),
      losses: (guestData.losses || 0) + (resultForHost === 1 ? 1 : 0),
      draws: (guestData.draws || 0) + (resultForHost === 0.5 ? 1 : 0)
    });
    tx.update(roomRef, { resultProcessed: true, whiteEloDelta: player1Delta, blackEloDelta: player2Delta });
  });

  await addDoc(collection(db, "matches"), {
    player1Uid: room.hostUid,
    player1Username: room.hostUsername,
    player2Uid: room.guestUid,
    player2Username: room.guestUsername,
    winnerUid: room.winnerUid,
    result: room.result,
    endedAt: serverTimestamp()
  });
}

function renderResultModal(room) {
  const modal = document.createElement("div");
  modal.className = "result-modal";
  modal.id = "result-modal";

  let icon = "🤝", title = "Hòa cờ!";
  if (room.result !== "draw") {
    const iWon = room.winnerUid === me.user.uid;
    icon = iWon ? "🏆" : "💔";
    title = iWon ? "Chiến thắng!" : "Thất bại";
  }
  const reasonMap = { checkmate: "Chiếu bí", resign: "Đối thủ đầu hàng", timeout: "Hết giờ", draw: "Hòa cờ" };

  modal.innerHTML = `
    <div class="result-box">
      <div class="r-icon">${icon}</div>
      <h2>${title}</h2>
      <p style="color:var(--text-dim);font-size:13.5px;margin-bottom:10px;">${reasonMap[room.result] || ""}</p>
      <div class="r-elo" id="r-elo-text">Đang cập nhật điểm...</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <a class="btn btn-ghost" href="../index.html">Trang chủ</a>
        <a class="btn btn-gold" href="play.html">Ván mới</a>
      </div>
    </div>`;
  document.body.appendChild(modal);
  clock?.stop();
  updateResultDeltas(room);
}

function updateResultDeltas(room) {
  const textEl = document.getElementById("r-elo-text");
  if (!textEl) return;
  if (room.whiteEloDelta === null || room.whiteEloDelta === undefined) return;
  const myDelta = myColor === "white" ? room.whiteEloDelta : room.blackEloDelta;
  const sign = myDelta > 0 ? "+" : "";
  textEl.innerHTML = `Elo của bạn: <b class="${myDelta < 0 ? "neg" : ""}">${sign}${myDelta}</b>`;
}

async function main() {
  me = await requireAuth("login.html");
  initTimeControlButtons();

  el("create-room-btn")?.addEventListener("click", () => createRoom().catch((e) => showError(e.message)));
  el("join-room-btn")?.addEventListener("click", () => joinRoom(el("room-code-input").value).catch((e) => showError(e.message)));
  el("copy-link-btn")?.addEventListener("click", () => {
    navigator.clipboard.writeText(el("waiting-link").value);
    showSuccess("Đã sao chép liên kết mời!");
  });
  el("accept-draw-btn")?.addEventListener("click", acceptDraw);
  el("decline-draw-btn")?.addEventListener("click", declineDraw);

  const roomFromUrl = getParam("room");
  if (roomFromUrl) {
    el("room-code-input").value = roomFromUrl;
    joinRoom(roomFromUrl).catch(() => {});
  }
}

main();
