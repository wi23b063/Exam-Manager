/* =========================================================
   DOM HELPERS (global)
   ========================================================= */

window.$ = (selector) => document.querySelector(selector);
window.$$ = (selector) => Array.from(document.querySelectorAll(selector));

/* =========================================================
   BASIC API WRAPPER
   ========================================================= */

window.api = function api(path, opts = {}) {
  return fetch("/api" + path, {
    credentials: "same-origin", // wichtig für PHP-Session
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
};

/* =========================================================
   ROBUST JSON API HELPER
   - kein JSON.parse Crash bei leerem Body
   - wirft Error bei HTTP Fehlern
   ========================================================= */

window.apiJson = async function apiJson(path, opts = {}) {
  const res = await api(path, opts);

  // 204 No Content → bewusst null
  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON from API:", text);
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
};

/* =========================================================
   UTILITIES
   ========================================================= */

window.safeText = async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
};

window.escapeHtml = function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/* =========================================================
   UI HELPERS
   ========================================================= */

window.showError = function showError(msg) {
  console.error(msg);
  alert(msg); // simpel & effektiv
};

window.confirmAction = function confirmAction(msg) {
  return window.confirm(msg);
};