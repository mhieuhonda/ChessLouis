// ChessLouis — Trò chuyện trong phòng đấu (Firestore realtime)
import { db } from "./firebase.js";
import { escapeHtml } from "./utils.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function sendMessage(roomId, uid, username, text) {
  const clean = text.trim().slice(0, 300);
  if (!clean) return Promise.resolve();
  return addDoc(collection(db, "rooms", roomId, "messages"), {
    uid, username, text: clean, createdAt: serverTimestamp()
  });
}

// Trả về hàm hủy đăng ký lắng nghe
export function listenMessages(roomId, myUid, containerEl) {
  const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    containerEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const row = document.createElement("div");
      row.className = "chat-msg" + (m.uid === myUid ? " me" : "");
      row.innerHTML = `<span class="cm-name">${escapeHtml(m.username)}:</span> ${escapeHtml(m.text)}`;
      containerEl.appendChild(row);
    });
    containerEl.scrollTop = containerEl.scrollHeight;
  });
}
