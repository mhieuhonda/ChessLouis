// ChessLouis — Đồng hồ thi đấu (đồng bộ theo dữ liệu phòng trên Firestore)
import { formatTime } from "./utils.js";

/**
 * Tính thời gian còn lại hiện tại của một bên.
 * @param {number} storedSeconds - giây còn lại được lưu ở lần đi cờ gần nhất
 * @param {number} lastMoveAtMs - mốc thời gian (ms) của lần đi cờ gần nhất
 * @param {boolean} isTheirTurnNow - bên này có đang là lượt đi hay không
 */
export function computeRemaining(storedSeconds, lastMoveAtMs, isTheirTurnNow) {
  if (!isTheirTurnNow || !lastMoveAtMs) return storedSeconds;
  const elapsed = (Date.now() - lastMoveAtMs) / 1000;
  return Math.max(0, storedSeconds - elapsed);
}

export class ClockController {
  constructor({ myEl, oppEl }) {
    this.myEl = document.getElementById(myEl);
    this.oppEl = document.getElementById(oppEl);
    this._interval = null;
  }

  // state: { myStored, oppStored, lastMoveAtMs, isMyTurn, running }
  start(getState, onTimeout) {
    this.stop();
    this._interval = setInterval(() => {
      const s = getState();
      if (!s || !s.running) return;
      const my = computeRemaining(s.myStored, s.lastMoveAtMs, s.isMyTurn);
      const opp = computeRemaining(s.oppStored, s.lastMoveAtMs, !s.isMyTurn);

      if (this.myEl) {
        this.myEl.textContent = formatTime(my);
        this.myEl.classList.toggle("low", my <= 20);
      }
      if (this.oppEl) {
        this.oppEl.textContent = formatTime(opp);
        this.oppEl.classList.toggle("low", opp <= 20);
      }

      if ((my <= 0 || opp <= 0) && onTimeout) onTimeout(my <= 0 ? "me" : "opp");
    }, 250);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  }
}
