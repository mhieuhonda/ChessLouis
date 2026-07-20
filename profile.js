// ChessLouis — Trang hồ sơ cá nhân
import { db } from "./firebase.js";
import { requireAuth } from "./router.js";
import { getTitle, avatarGlyph, escapeHtml, formatDate } from "./utils.js";
import { showSuccess, showError } from "./notification.js";
import {
  doc, updateDoc, collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const AVATAR_CHOICES = ["♟", "♞", "♝", "♜", "♛", "♚", "🐴", "🦁", "🐉", "⚔️", "🛡️", "👑"];

const el = (id) => document.getElementById(id);

function renderProfile(user, data) {
  const title = getTitle(data.elo || 0, data.username);

  el("avatar").textContent = avatarGlyph(data);
  el("username").textContent = data.username;

  el("title-badge").innerHTML = `${title.founder ? "👑 " : "🏵️ "}${escapeHtml(title.name)}`;
  el("title-badge").classList.toggle("founder", title.founder);

  if (title.founder) {
    el("role-ring")?.classList.remove("hidden");
  }

  el("elo").textContent = data.elo ?? 1000;
  el("wins").textContent = data.wins ?? 0;
  el("losses").textContent = data.losses ?? 0;
  el("draws").textContent = data.draws ?? 0;

  const nextTier = getTitle((data.elo || 0) + 1, "___never-founder___");
  el("rank-name") && (el("rank-name").textContent =
    title.founder ? "Người sáng lập & vận hành ChessLouis" : `Danh hiệu hiện tại · Elo ${data.elo ?? 1000}`);
}

async function renderHistory(uid) {
  const listEl = el("history-list");
  if (!listEl) return;

  const matchesRef = collection(db, "matches");
  const q1 = query(matchesRef, where("player1Uid", "==", uid), orderBy("endedAt", "desc"), limit(10));
  const q2 = query(matchesRef, where("player2Uid", "==", uid), orderBy("endedAt", "desc"), limit(10));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const all = [...snap1.docs, ...snap2.docs]
    .map((d) => d.data())
    .sort((a, b) => (b.endedAt?.toMillis?.() || 0) - (a.endedAt?.toMillis?.() || 0))
    .slice(0, 10);

  if (all.length === 0) {
    listEl.innerHTML = `<div class="empty-note">Chưa có ván đấu nào. Hãy vào mục "Chơi cờ" để bắt đầu!</div>`;
    return;
  }

  listEl.innerHTML = all.map((m) => {
    const isP1 = m.player1Uid === uid;
    const oppName = isP1 ? m.player2Username : m.player1Username;
    let outcome = "draw";
    if (m.winnerUid) outcome = m.winnerUid === uid ? "win" : "loss";
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

function initAvatarPicker(uid) {
  const picker = el("avatar-picker");
  if (!picker) return;
  picker.innerHTML = AVATAR_CHOICES.map((g) => `<button type="button" data-g="${g}">${g}</button>`).join("");
  picker.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "users", uid), { avatar: btn.dataset.g });
        el("avatar").textContent = btn.dataset.g;
        showSuccess("Đã đổi biểu tượng!");
        el("avatar-modal").classList.add("hidden");
      } catch (e) {
        showError("Không đổi được biểu tượng");
      }
    });
  });

  el("edit-avatar-btn")?.addEventListener("click", () => el("avatar-modal").classList.remove("hidden"));
  el("close-avatar-modal")?.addEventListener("click", () => el("avatar-modal").classList.add("hidden"));
}

async function main() {
  const { user, data } = await requireAuth("login.html");
  renderProfile(user, data);
  initAvatarPicker(user.uid);
  await renderHistory(user.uid);
}

main();
