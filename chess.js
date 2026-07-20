// ChessLouis — Bộ điều khiển hiển thị bàn cờ (dùng thư viện chess.js qua biến toàn cục `Chess`)
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const UNICODE = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

export class ChessBoard {
  /**
   * @param {Object} opts
   * @param {string} opts.boardEl - id phần tử chứa bàn cờ
   * @param {'white'|'black'} opts.orientation - hướng nhìn bàn cờ của người chơi
   * @param {(from:string,to:string,promotion?:string)=>boolean} opts.canMove - kiểm tra có được đi không
   * @param {(move:Object, fen:string)=>void} opts.onMove - callback khi đi cờ hợp lệ
   * @param {()=>void} opts.onIllegalPromotion - gọi khi cần chọn quân phong cấp
   */
  constructor(opts) {
    this.boardEl = document.getElementById(opts.boardEl);
    this.orientation = opts.orientation || "white";
    this.canMove = opts.canMove || (() => true);
    this.onMove = opts.onMove || (() => {});
    this.game = new Chess();
    this.selected = null;
    this.possibleMoves = [];
    this.lastMove = null;
    this.locked = false;

    this.boardEl.addEventListener("click", (e) => {
      const sq = e.target.closest(".square");
      if (sq) this._handleClick(sq.dataset.position);
    });
  }

  lock() { this.locked = true; }
  unlock() { this.locked = false; }

  loadFen(fen) {
    this.game.load(fen);
    this.selected = null;
    this.possibleMoves = [];
    this.render();
  }

  fen() { return this.game.fen(); }
  turn() { return this.game.turn(); }
  isGameOver() { return this.game.game_over(); }
  inCheck() { return this.game.in_check(); }
  inCheckmate() { return this.game.in_checkmate(); }
  inDraw() { return this.game.in_draw() || this.game.in_stalemate() || this.game.in_threefold_repetition() || this.game.insufficient_material(); }

  markLastMove(from, to) {
    this.lastMove = { from, to };
    this.render();
  }

  _squareCoords(square) {
    const file = FILES.indexOf(square[0]);
    const rank = 8 - parseInt(square[1], 10);
    return this.orientation === "white" ? { r: rank, c: file } : { r: 7 - rank, c: 7 - file };
  }

  _handleClick(square) {
    if (this.locked) return;

    if (this.selected === null) {
      const piece = this.game.get(square);
      if (piece && piece.color === this.game.turn()) {
        this.selected = square;
        this.possibleMoves = this.game.moves({ square, verbose: true });
        this.render();
      }
      return;
    }

    if (this.selected === square) {
      this.selected = null;
      this.possibleMoves = [];
      this.render();
      return;
    }

    const target = this.possibleMoves.find((m) => m.to === square);
    if (!target) {
      // chọn quân khác của mình thay vì đi
      const piece = this.game.get(square);
      if (piece && piece.color === this.game.turn()) {
        this.selected = square;
        this.possibleMoves = this.game.moves({ square, verbose: true });
        this.render();
        return;
      }
      this.selected = null;
      this.possibleMoves = [];
      this.render();
      return;
    }

    const needsPromotion = target.flags.includes("p");
    if (needsPromotion) {
      this._pendingMove = { from: this.selected, to: square };
      this.selected = null;
      this.possibleMoves = [];
      this._askPromotion();
      return;
    }

    this._tryMove(this.selected, square);
  }

  _askPromotion() {
    const modal = document.createElement("div");
    modal.className = "promo-modal";
    modal.innerHTML = `
      <div class="promo-box">
        <p>Chọn quân phong cấp</p>
        <div class="promo-choices">
          <button data-p="q">♛</button>
          <button data-p="r">♜</button>
          <button data-p="b">♝</button>
          <button data-p="n">♞</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        const promo = btn.dataset.p;
        modal.remove();
        const { from, to } = this._pendingMove;
        this._pendingMove = null;
        this._tryMove(from, to, promo);
      };
    });
  }

  _tryMove(from, to, promotion) {
    if (!this.canMove(from, to, promotion)) {
      this.selected = null;
      this.possibleMoves = [];
      this.render();
      return;
    }
    const move = this.game.move({ from, to, promotion: promotion || "q" });
    this.selected = null;
    this.possibleMoves = [];
    if (move) {
      this.lastMove = { from, to };
      this.render();
      this.onMove(move, this.game.fen());
    } else {
      this.render();
    }
  }

  render() {
    this.boardEl.innerHTML = "";
    const position = this.game.board();
    const inCheckColor = this.game.in_check() ? this.game.turn() : null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const displayR = this.orientation === "white" ? r : 7 - r;
        const displayC = this.orientation === "white" ? c : 7 - c;
        const piece = position[displayR][displayC];
        const square = FILES[displayC] + (8 - displayR);

        const div = document.createElement("div");
        div.className = "square " + ((displayR + displayC) % 2 === 0 ? "white" : "black");
        div.dataset.position = square;

        if (this.selected === square) div.classList.add("selected");
        if (this.lastMove && (this.lastMove.from === square || this.lastMove.to === square)) {
          div.classList.add("last-move");
        }
        const possible = this.possibleMoves.find((m) => m.to === square);
        if (possible) {
          div.classList.add("possible");
          if (possible.flags.includes("c") || possible.flags.includes("e")) div.classList.add("capture");
        }
        if (piece) {
          div.innerHTML = UNICODE[piece.color + piece.type.toUpperCase()];
          if (inCheckColor && piece.type === "k" && piece.color === inCheckColor) {
            div.classList.add("in-check");
          }
        }

        this.boardEl.appendChild(div);
      }
    }
  }
}
