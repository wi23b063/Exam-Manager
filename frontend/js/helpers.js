/* =========================================================
   Helpers
   ========================================================= */

const api = (p, opts = {}) =>
  fetch("/api" + p, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}