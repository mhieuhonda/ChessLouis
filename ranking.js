// ChessLouis — Bảng xếp hạng
import { db } from "./firebase.js";
import { requireAuth } from "./router.js";
import { getTitle, avatarGlyph, escapeHtml } from "./utils.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const el = (id) => document.getElementById(id);
const MEDALS = ["🥇", "🥈", "🥉"];

function podiumHtml(u, place) {
  const title = getTitle(u.elo || 0, u.username);
  return `
    <div class="podium-spot p${place}">
      <div class="medal">${MEDALS[place - 1]}</div>
      <div class="p-avatar">${avatarGlyph(u)}</div>
      <div class="p-name">${escapeHtml(u.username)}</div>
      <div class="p-elo">${u.elo ?? 1000} Elo</div>
      <div class="p-title">${title.founder ? "👑 " : ""}${escapeHtml(title.name)}</div>
    </div>`;
}

function rowHtml(u, index, myUid) {
  const title = getTitle(u.elo || 0, u.username);
  const isMe = u.uid === myUid;
  return `
    <tr class="${isMe ? "me" : ""}">
      <td>#${index + 1}</td>
      <td>
        <div class="player-cell">
          <div class="r-avatar">${avatarGlyph(u)}</div>
          <div>
            <div>${escapeHtml(u.username)}</div>
            <div class="player-title">${title.founder ? "👑 " : ""}${escapeHtml(title.name)}</div>
          </div>
        </div>
      </td>
      <td>${u.elo ?? 1000}</td>
    </tr>`;
}

async function main() {
  const { user } = await requireAuth("login.html");

  const q = query(collection(db, "users"), orderBy("elo", "desc"), limit(50));
  const snap = await getDocs(q);
  const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

  if (users.length === 0) {
    el("podium").innerHTML = "";
    el("rank-tbody").innerHTML = `<tr><td colspan="3" class="empty-note">Chưa có kỳ thủ nào</td></tr>`;
    return;
  }

  const top3 = users.slice(0, 3);
  el("podium").innerHTML = top3.map((u, i) => podiumHtml(u, i + 1)).join("");

  el("rank-tbody").innerHTML = users.map((u, i) => rowHtml(u, i, user.uid)).join("");
}

main();
