// ChessLouis — Lịch sử đấu đầy đủ
import { db } from "./firebase.js";
import { requireAuth } from "./router.js";
import { escapeHtml, formatDate } from "./utils.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const el = (id) => document.getElementById(id);

async function main() {
  const { user } = await requireAuth("login.html");

  const matchesRef = collection(db, "matches");
  const q1 = query(matchesRef, where("player1Uid", "==", user.uid), orderBy("endedAt", "desc"), limit(50));
  const q2 = query(matchesRef, where("player2Uid", "==", user.uid), orderBy("endedAt", "desc"), limit(50));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const all = [...snap1.docs, ...snap2.docs]
    .map((d) => d.data())
    .sort((a, b) => (b.endedAt?.toMillis?.() || 0) - (a.endedAt?.toMillis?.() || 0));

  const listEl = el("full-history-list");

  let wins = 0, losses = 0, draws = 0;
  all.forEach((m) => {
    if (!m.winnerUid) draws++;
    else if (m.winnerUid === user.uid) wins++;
    else losses++;
  });
  el("h-wins") && (el("h-wins").textContent = wins);
  el("h-losses") && (el("h-losses").textContent = losses);
  el("h-draws") && (el("h-draws").textContent = draws);
  el("h-total") && (el("h-total").textContent = all.length);

  if (all.length === 0) {
    listEl.innerHTML = `<div class="empty-note">Bạn chưa đấu ván nào. Ra sân thôi!</div>`;
    return;
  }

  listEl.innerHTML = all.map((m) => {
    const isP1 = m.player1Uid === user.uid;
    const oppName = isP1 ? m.player2Username : m.player1Username;
    let outcome = "draw";
    if (m.winnerUid) outcome = m.winnerUid === user.uid ? "win" : "loss";
    const label = { win: "Thắng", loss: "Thua", draw: "Hòa" }[outcome];
    const reason = { checkmate: "Chiếu bí", resign: "Đầu hàng", timeout: "Hết giờ", draw: "Hòa cờ" }[m.result] || "";
    return `
      <div class="history-row ${outcome}">
        <div>
          <div class="h-opp">vs ${escapeHtml(oppName || "Ẩn danh")}</div>
          <div style="color:var(--text-dim);font-size:12px;">${reason} · ${formatDate(m.endedAt)}</div>
        </div>
        <div class="h-result">${label}</div>
      </div>`;
  }).join("");
}

main();
