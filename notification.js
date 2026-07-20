// ChessLouis — Toast thông báo (thay cho alert())
function ensureRoot() {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  return root;
}

// type: 'success' | 'error' | 'info'
export function showToast(message, type = "info", duration = 3200) {
  const root = ensureRoot();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="t-dot"></span><span>${message}</span>`;
  root.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity .25s ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

export function showError(message) {
  showToast(message, "error", 4000);
}

export function showSuccess(message) {
  showToast(message, "success");
}

// Hộp thoại xác nhận đơn giản, thay cho confirm() mặc định của trình duyệt
export function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "result-modal";
    overlay.innerHTML = `
      <div class="result-box">
        <p style="color:var(--text-dim);margin-bottom:20px;font-size:15px;">${message}</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-ghost" id="confirm-no">Hủy</button>
          <button class="btn btn-gold" id="confirm-yes">Đồng ý</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#confirm-yes").onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector("#confirm-no").onclick = () => { overlay.remove(); resolve(false); };
  });
}
