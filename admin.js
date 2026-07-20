// ChessLouis — Bảng điều khiển quản trị (chỉ dành cho Nhà sáng lập)
import { db } from "./firebase.js";
import { requireAdmin } from "./router.js";
import { getTitle, avatarGlyph, escapeHtml, formatDate } from "./utils.js";
import { showSuccess, showError, showConfirm } from "./notification.js";
import {
  collection, getDocs, doc, updateDoc, query, orderBy, limit,
  addDoc, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const el = (id) => document.getElementById(id);
let allUsers = [];

function userRowHtml(u) {
  const title = getTitle(u.elo || 0, u.username);
  return `
    <div class="user-row ${u.banned ? "banned" : ""}" data-uid="${u.uid}">
      <div class="u-left">
        <div class="u-avatar">${avatarGlyph(u)}</div>
        <div>
          <div class="u-name">
            ${escapeHtml(u.username)}
            ${title.founder ? '<span class="badge-tag">Nhà sáng lập</span>' : ""}
            ${u.banned ? '<span class="badge-tag ban">Đã khóa</span>' : ""}
          </div>
          <div class="u-meta">Elo ${u.elo ?? 1000} · ${title.name} · ${u.wins || 0}T / ${u.losses || 0}B / ${u.draws || 0}H</div>
        </div>
      </div>
      <div class="u-actions">
        ${title.founder ? "" : `
          <button class="btn btn-ghost btn-sm reset-elo-btn" data-uid="${u.uid}">Reset Elo</button>
          <button class="btn ${u.banned ? "btn-gold" : "btn-danger"} btn-sm ban-btn" data-uid="${u.uid}" data-banned="${u.banned ? "1" : "0"}">
            ${u.banned ? "Mở khóa" : "Khóa"}
          </button>`}
      </div>
    </div>`;
}

function renderUsers(list) {
  el("user-list").innerHTML = list.length
    ? list.map(userRowHtml).join("")
    : `<div class="empty-note">Không tìm thấy kỳ thủ nào</div>`;

  el("user-list").querySelectorAll(".ban-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      const willBan = btn.dataset.banned === "0";
      try {
        await updateDoc(doc(db, "users", uid), { banned: willBan });
        showSuccess(willBan ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
        loadUsers();
      } catch { showError("Không thể cập nhật — kiểm tra lại luật Firestore"); }
    });
  });

  el("user-list").querySelectorAll(".reset-elo-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await showConfirm("Đặt lại Elo của người này về 1000?");
      if (!ok) return;
      try {
        await updateDoc(doc(db, "users", btn.dataset.uid), { elo: 1000, wins: 0, losses: 0, draws: 0 });
        showSuccess("Đã đặt lại Elo");
        loadUsers();
      } catch { showError("Không thể cập nhật — kiểm tra lại luật Firestore"); }
    });
  });
}

async function loadUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("elo", "desc"), limit(200)));
  allUsers = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  renderUsers(allUsers);

  el("stat-total-users") && (el("stat-total-users").textContent = allUsers.length);
  el("stat-banned") && (el("stat-banned").textContent = allUsers.filter((u) => u.banned).length);
  const avgElo = allUsers.length ? Math.round(allUsers.reduce((s, u) => s + (u.elo || 1000), 0) / allUsers.length) : 0;
  el("stat-avg-elo") && (el("stat-avg-elo").textContent = avgElo);
}

async function loadMatchCount() {
  const snap = await getDocs(query(collection(db, "matches"), limit(500)));
  el("stat-total-matches") && (el("stat-total-matches").textContent = snap.size);
}

async function loadTournaments() {
  const snap = await getDocs(query(collection(db, "tournaments"), orderBy("startAt", "desc"), limit(30)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const wrap = el("tournament-list");
  if (!wrap) return;
  wrap.innerHTML = list.length ? list.map((t) => `
    <div class="tournament-row">
      <div>
        <div style="font-weight:700;">${escapeHtml(t.name)}</div>
        <div style="color:var(--text-dim);font-size:12.5px;">${formatDate(t.startAt)} · Tối đa ${t.maxPlayers} người · ${(t.participants || []).length} đã đăng ký</div>
      </div>
      <button class="btn btn-danger btn-sm del-tourney" data-id="${t.id}">Xóa</button>
    </div>`).join("") : `<div class="empty-note">Chưa có giải đấu nào</div>`;

  wrap.querySelectorAll(".del-tourney").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await showConfirm("Xóa giải đấu này?");
      if (!ok) return;
      await deleteDoc(doc(db, "tournaments", btn.dataset.id));
      loadTournaments();
    });
  });
}

function initSearch() {
  el("admin-search")?.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    renderUsers(allUsers.filter((u) => (u.username || "").toLowerCase().includes(term)));
  });
}

function initTournamentForm() {
  el("create-tournament-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = el("t-name").value.trim();
    const date = el("t-date").value;
    const max = parseInt(el("t-max").value, 10) || 16;
    if (!name || !date) { showError("Điền đầy đủ tên và ngày diễn ra"); return; }

    await addDoc(collection(db, "tournaments"), {
      name, startAt: new Date(date), maxPlayers: max,
      participants: [], status: "upcoming", createdAt: serverTimestamp()
    });
    showSuccess("Đã tạo giải đấu!");
    el("create-tournament-form").reset();
    loadTournaments();
  });
}

async function main() {
  await requireAdmin("../index.html");
  initSearch();
  initTournamentForm();
  await Promise.all([loadUsers(), loadMatchCount(), loadTournaments()]);
}

main();
