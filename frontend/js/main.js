/* =========================================================
   Exam Manager – SPA Main Controller (with login, correct paths)
   ========================================================= */

window.currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout();
  setupNavigation();
  await restoreSession();
});

/* =========================================================
   Layout (Header / Footer)  ✅ PATH FIX
   ========================================================= */

async function loadLayout() {
  await Promise.all([
    loadInto("header-placeholder", "header.html"),
    loadInto("footer-placeholder", "footer.html"),
  ]);
}

async function loadInto(targetId, partialFile) {
  const el = document.getElementById(targetId);
  if (!el) return;

  // ✅ IMPORTANT: your folder is "partials/", not "frontend/partials/"
  const res = await fetch(`partials/${partialFile}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load partial: partials/${partialFile}`);

  el.innerHTML = await res.text();
}

/* =========================================================
   Navigation (delegated)
   ========================================================= */

function setupNavigation() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;

    const view = btn.dataset.view;
    if (!view) return;

    // auth guard
    const protectedViews = new Set([
      "questions",
      "exams",
      "manual-exams",
      "manage-exams",
      "manage-users",
      "viewer",
    ]);
    if (protectedViews.has(view) && !window.currentUser) {
      loadView("login");
      return;
    }

    loadView(view);
  });

  document.addEventListener("click", (e) => {
    if (e.target?.id === "logoutBtn") logout();
  });
}

/* =========================================================
   Session Restore
   ========================================================= */

async function restoreSession() {
  try {
    const data = await apiJson("/me");
    if (data?.user) {
      onLoggedIn(data.user);
      return;
    }
  } catch {
    // ignore
  }
  onLoggedOut();
  await loadView("login");
}

/* =========================================================
   View Loader ✅ PATH FIX
   ========================================================= */

async function loadView(view) {
  try {
    const app = document.getElementById("app");
    if (!app) throw new Error("#app missing in index.html");

    // ✅ IMPORTANT: views are in "partials/"
    const res = await fetch(`partials/view-${view}.html`, { cache: "no-store" });
    if (!res.ok) throw new Error(`View not found: partials/view-${view}.html`);

    app.innerHTML = await res.text();
    initView(view);
  } catch (e) {
    console.error(e);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `
        <div class="alert alert-danger">
          Failed to load view: <b>${escapeHtml(String(view))}</b><br/>
          <small>${escapeHtml(e.message || String(e))}</small>
        </div>
      `;
    }
  }
}

/* =========================================================
   Init per view
   ========================================================= */

function initView(view) {
  switch (view) {
    case "login":
      initLoginView();
      break;

    case "questions":
      initQuestionView();
      loadSubjects();
      break;

    case "exams":
      initExamView();
      loadSubjects();
      break;

    case "manual-exams":
      if (typeof initManualExamsView === "function") initManualExamsView();
      break;

    case "manage-exams":
      if (typeof initManageExamsView === "function") initManageExamsView();
      break;

    case "manage-users":
      if (typeof initManageUsersView === "function") initManageUsersView();
      break;

    case "viewer":
      if (typeof initViewerView === "function") initViewerView();
      break;

    default:
      console.warn("No init for view:", view);
  }
}

/* =========================================================
   Login View (your new view-login.html)
   ========================================================= */

function initLoginView() {
  const form = document.getElementById("loginForm");
  const userEl = document.getElementById("loginUsername");
  const passEl = document.getElementById("loginPassword");
  const errEl = document.getElementById("loginError");

  if (!form || !userEl || !passEl) {
    console.warn("Login elements missing in view-login.html");
    return;
  }

  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errEl) errEl.textContent = "";

    const username = userEl.value.trim();
    const password = passEl.value;

    if (!username || !password) {
      if (errEl) errEl.textContent = "Please enter username and password.";
      return;
    }

    try {
      const data = await apiJson("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!data?.user) {
        if (errEl) errEl.textContent = "Login failed (unexpected response).";
        console.error("Unexpected login response:", data);
        return;
      }

      onLoggedIn(data.user);
    } catch (err) {
      console.error("Login failed:", err);
      if (errEl) errEl.textContent = err.message || "Login failed.";
    }
  });
}

/* =========================================================
   Logged-in / Logged-out UI
   ========================================================= */

function onLoggedIn(user) {
  window.currentUser = user;
  sessionStorage.setItem("user", JSON.stringify(user));

  // show header
  document.querySelector(".topbar")?.classList.remove("d-none");
  document.getElementById("logoutBtn")?.classList.remove("d-none");

  // greeting
  const greetBox = document.getElementById("userGreeting");
  const nameSpan = document.getElementById("greetUsername");
  if (greetBox && nameSpan) {
    nameSpan.textContent = user.username;
    greetBox.classList.remove("d-none");
  }

  applyRoleUI(user);
}

function onLoggedOut() {
  window.currentUser = null;
  sessionStorage.removeItem("user");

  document.querySelector(".topbar")?.classList.add("d-none");
  document.getElementById("logoutBtn")?.classList.add("d-none");
  document.getElementById("userGreeting")?.classList.add("d-none");
}

/* =========================================================
   Role based UI + default view
   ========================================================= */

function applyRoleUI(user) {
  const role = user?.role || "viewer";

  toggle("btnManageUsers", role !== "admin");
  toggle("btnManualExams", role === "viewer");
  toggle("btnManageExams", role === "viewer");
  toggle("btnViewerView", role !== "viewer");

  if (role === "viewer") loadView("viewer");
  else loadView("questions");
}

function toggle(id, hide) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("d-none", hide);
}

/* =========================================================
   Logout
   ========================================================= */

async function logout() {
  try {
    await apiJson("/logout", { method: "POST" });
  } catch {}
  onLoggedOut();
  loadView("login");
}