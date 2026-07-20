// ChessLouis — Cài đặt tài khoản
import { logout } from "./firebase.js";
import { requireAuth } from "./router.js";
import { showSuccess, showError, showConfirm } from "./notification.js";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const el = (id) => document.getElementById(id);

async function main() {
  const { user, data } = await requireAuth("login.html");

  el("settings-username") && (el("settings-username").textContent = data.username);
  el("settings-email") && (el("settings-email").textContent = user.email);
  el("settings-elo") && (el("settings-elo").textContent = data.elo ?? 1000);

  el("change-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = el("current-password").value;
    const newPassword = el("new-password").value;

    if (newPassword.length < 6) {
      showError("Mật khẩu mới cần ít nhất 6 ký tự");
      return;
    }

    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      showSuccess("Đã đổi mật khẩu thành công!");
      el("change-password-form").reset();
    } catch (err) {
      showError("Không đổi được mật khẩu — kiểm tra lại mật khẩu hiện tại");
    }
  });

  el("logout-settings-btn")?.addEventListener("click", async () => {
    const ok = await showConfirm("Đăng xuất khỏi ChessLouis?");
    if (!ok) return;
    await logout();
    window.location.href = "../index.html";
  });
}

main();
