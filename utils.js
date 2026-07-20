// ChessLouis — Hàm tiện ích dùng chung
import { FOUNDER_USERNAME } from "./firebase.js";

// Các bậc "danh hiệu" theo Elo (phong cách tu tiên)
export const ELO_TITLES = [
  { min: 0,    name: "Phàm Nhân" },
  { min: 800,  name: "Luyện Khí" },
  { min: 1000, name: "Trúc Cơ" },
  { min: 1200, name: "Kim Đan" },
  { min: 1400, name: "Nguyên Anh" },
  { min: 1600, name: "Hóa Thần" },
  { min: 1800, name: "Luyện Hư" },
  { min: 2000, name: "Hợp Thể" },
  { min: 2200, name: "Đại Thừa" },
  { min: 2400, name: "Hư Vô Chi Chủ" }
];

// Trả về danh hiệu tương ứng với Elo và username.
// Nhà sáng lập luôn có danh hiệu riêng, bất kể Elo.
export function getTitle(elo, username) {
  if (isFounder(username)) {
    return { name: "Nhà Sáng Lập", founder: true };
  }
  let current = ELO_TITLES[0];
  for (const tier of ELO_TITLES) {
    if (elo >= tier.min) current = tier;
  }
  return { name: current.name, founder: false };
}

export function isFounder(username) {
  return (username || "").toLowerCase() === FOUNDER_USERNAME.toLowerCase();
}

// Chuỗi ký tự đại diện an toàn (chống XSS) khi chèn vào innerHTML
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

// mm:ss từ tổng số giây
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ":" + (sec < 10 ? "0" : "") + sec;
}

// Ký tự / emoji đại diện mặc định khi user chưa có avatar ảnh
export function avatarGlyph(data) {
  if (data?.avatar && data.avatar !== "default") return data.avatar;
  return "♟";
}

// Sinh mã phòng ngẫu nhiên 6 ký tự
export function randomRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Lấy tham số từ URL, vd getParam('room')
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Định dạng ngày giờ kiểu Việt Nam
export function formatDate(date) {
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

// Chặn nhiều lần bấm liên tiếp (spam click)
export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
