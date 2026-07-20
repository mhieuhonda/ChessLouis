// ChessLouis — Giải đấu: xem danh sách và đăng ký tham gia
import { db } from "./firebase.js";
import { requireAuth } from "./router.js";
import { escapeHtml, formatDate } from "./utils.js";
import { showSuccess, showError } from "./notification.js";
import {
  collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const el = (id) => document.getElementById(id);
let me = null;

function rowHtml(t) {
  const joined = (t.participants || []).includes(me.user.uid);
  const full = (t.participants || []).length >= t.maxPlayers;
  return `
    <div class="tournament-row">
      <div>
        <div style="font-weight:700;font-family:var(--font-display);color:var(--gold);">${escapeHtml(t.name)}</div>
        <div style="color:var(--text-dim);font-size:12.5px;margin-top:4px;">
          🗓️ ${formatDate(t.startAt)} · 👥 ${(t.participants || []).length}/${t.maxPlayers}
        </div>
      </div>
      <button class="btn ${joined ? "btn-danger" : "btn-gold"} btn-sm join-t-btn" data-id="${t.id}" data-joined="${joined ? "1" : "0"}" ${(!joined && full) ? "disabled" : ""}>
        ${joined ? "Rời giải" : (full ? "Đã đủ" : "Tham gia")}
      </button>
    </div>`;
}

async function loadTournaments() {
  const snap = await getDocs(query(collection(db, "tournaments"), orderBy("startAt", "asc")));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const wrap = el("tournament-public-list");

  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-note">Chưa có giải đấu nào được mở. Quay lại sau nhé!</div>`;
    return;
  }

  wrap.innerHTML = list.map(rowHtml).join("");
  wrap.querySelectorAll(".join-t-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const joined = btn.dataset.joined === "1";
      try {
        await updateDoc(doc(db, "tournaments", btn.dataset.id), {
          participants: joined ? arrayRemove(me.user.uid) : arrayUnion(me.user.uid)
        });
        showSuccess(joined ? "Đã rời giải đấu" : "Đăng ký thành công! Hẹn gặp trên bàn cờ ♟️");
        loadTournaments();
      } catch {
        showError("Không thể cập nhật đăng ký");
      }
    });
  });
}

async function main() {
  me = await requireAuth("login.html");
  await loadTournaments();
}

main();
