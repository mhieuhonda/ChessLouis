// ChessLouis — Bảo vệ trang theo trạng thái đăng nhập
import { watchAuth } from "./firebase.js";
import { isFounder } from "./utils.js";

// Bắt buộc đăng nhập mới xem được trang này; trả về Promise<{user,data}>
export function requireAuth(redirectTo = "login.html") {
  return new Promise((resolve) => {
    const unsub = watchAuth((user, data) => {
      unsub();
      if (!user) {
        window.location.href = redirectTo;
        return;
      }
      resolve({ user, data });
    });
  });
}

// Trang chỉ dành cho Nhà sáng lập / quản trị viên
export function requireAdmin(redirectTo = "../index.html") {
  return new Promise((resolve) => {
    const unsub = watchAuth((user, data) => {
      unsub();
      if (!user || !data || !isFounder(data.username)) {
        window.location.href = redirectTo;
        return;
      }
      resolve({ user, data });
    });
  });
}

// Trang login/register: nếu đã đăng nhập rồi thì chuyển thẳng vào hồ sơ
export function redirectIfAuthed(redirectTo = "profile.html") {
  return watchAuth((user) => {
    if (user) window.location.href = redirectTo;
  });
}
