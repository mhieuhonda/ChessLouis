// ChessLouis — Khởi tạo Firebase dùng chung cho toàn bộ app
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import app from "../firebase/config.js";

export const auth = getAuth(app);
export const db = getFirestore(app);

// Tên tài khoản được cấp quyền quản trị / nhà sáng lập
export const FOUNDER_USERNAME = "hieulouis";

// Đăng xuất dùng chung
export function logout() {
  return signOut(auth);
}

// Lấy dữ liệu Firestore của user hiện tại (Promise<user data|null>)
export function getUserData(uid) {
  return getDoc(doc(db, "users", uid)).then((snap) => (snap.exists() ? snap.data() : null));
}

// Chờ xác định trạng thái đăng nhập (dùng cho việc bảo vệ trang)
export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    const data = await getUserData(user.uid);
    callback(user, data);
  });
}
