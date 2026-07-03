/* ─────────────────────────────────────────────────────────────────────────
 * 共享脚本 — 跨屏通用的小工具
 * 屏幕内特定的交互（如抽屉 toggle、月份切换）仍写在各自 HTML 内
 * ─────────────────────────────────────────────────────────────────── */

(function () {
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function showToast(message) {
    var toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  window.workbenchShared = {
    escapeHtml: escapeHtml,
    showToast: showToast,
  };
})();
