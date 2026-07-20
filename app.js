// ChessLouis — Khởi tạo chung cho mọi trang: thanh điều hướng, trạng thái đăng nhập
import { watchAuth, logout } from "./firebase.js";
import { getTitle, isFounder, avatarGlyph } from "./utils.js";
import { showSuccess } from "./notification.js";

const inPagesFolder = window.location.pathname.includes("/pages/");
const prefix = inPagesFolder ? "" : "pages/";       // link tới các trang con
const rootPrefix = inPagesFolder ? "../" : "";       // link về trang gốc

function initMobileToggle() {
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
    toggle.textContent = links.classList.contains("open") ? "✕" : "☰";
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.textContent = "☰";
    })
  );
}

function markActiveLink() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.endsWith(current)) a.classList.add("active");
  });
}

function renderAuthSlot(user, data) {
  const slot = document.getElementById("nav-auth-slot");
  if (!slot) return;

  if (!user || !data) {
    slot.innerHTML = `<a class="btn btn-gold btn-sm" href="${prefix}login.html">Đăng nhập</a>`;
    return;
  }

  const title = getTitle(data.elo || 0, data.username);
  slot.innerHTML = `
    <a class="nav-user" href="${prefix}profile.html" title="Xem hồ sơ">
      <span class="avatar-sm">${avatarGlyph(data)}</span>
      <span>
        <div class="nav-user-name">${data.username || "Kỳ thủ"}</div>
        <div class="nav-user-title">${title.name}</div>
      </span>
    </a>
    <button class="icon-btn" id="logout-btn" title="Đăng xuất">⏻</button>
  `;

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await logout();
    showSuccess("Đã đăng xuất");
    window.location.href = `${rootPrefix}index.html`;
  });
}

function toggleAdminLinks(user, data) {
  const show = !!(user && data && isFounder(data.username));
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.classList.toggle("hidden", !show);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileToggle();
  markActiveLink();
  watchAuth((user, data) => {
    renderAuthSlot(user, data);
    toggleAdminLinks(user, data);
  });
});
