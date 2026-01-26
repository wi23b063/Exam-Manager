/* =========================================================
   Login State
   ========================================================= */

let currentUser = null;
window.currentUser = null;

/* =========================================================
   DOM Refs
   ========================================================= */

let loginForm, userInput, passInput, msg;

/* =========================================================
   Init Login View
   ========================================================= */

function initLoginView() {
  loginForm = document.getElementById("loginForm");
  userInput = document.getElementById("loginUser");
  passInput = document.getElementById("loginPass");
  msg = document.getElementById("loginMsg");

  if (!loginForm) return;

  loginForm.addEventListener("submit", onLoginSubmit);
}

/* =========================================================
   Login Submit
   ========================================================= */

async function onLoginSubmit(e) {
  e.preventDefault();

  const username = userInput.value.trim();
  const password = passInput.value;

  if (!username || !password) {
    showMsg("Please enter username and password", "error");
    return;
  }

  try {
    const data = await apiJson("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (!data?.ok || !data?.user) {
      console.error("Unexpected login response:", data);
      showMsg("Login failed (unexpected response)", "error");
      return;
    }

    currentUser = data.user;
    window.currentUser = currentUser;
    sessionStorage.setItem("user", JSON.stringify(currentUser));
    applyRoleUI(currentUser);

    updateGreeting(currentUser);
    window.currentUser = currentUser;   // wichtig für andere Dateien
    applyRoleUI(currentUser);
    
    showApp();
    applyRoleUI(currentUser);
  } catch (err) {
    console.error("Login failed:", err);
    showMsg(err.message || "Server error", "error");
  }
}

/* =========================================================
   Restore Session
   ========================================================= */

async function restoreSession() {
  try {
    const data = await apiJson("/me");
    if (!data?.ok || !data?.user) return;

    currentUser = data.user;
    window.currentUser = currentUser;
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    updateGreeting(currentUser);
    showApp();
    applyRoleUI(currentUser);
  } catch {
    // not logged in → keep login visible
  }
}

/* =========================================================
   UI Helpers
   ========================================================= */

function showApp() {
  // hide login
  document.getElementById("view-login-placeholder")?.classList.add("d-none");

  // show app
  document.querySelector(".topbar")?.classList.remove("d-none");
  document.getElementById("app-root")?.classList.remove("d-none");
  document.getElementById("footer-placeholder")?.classList.remove("d-none");

  // default view
  document.querySelector('[data-view="questions"]')?.click();
}

function showMsg(text, type) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = type === "success" ? "green" : "red";
}

/* =========================================================
   Greeting + Logout
   ========================================================= */

function updateGreeting(user) {
  const greetBox = document.getElementById("userGreeting");
  const nameSpan = document.getElementById("greetUsername");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!greetBox || !nameSpan || !user) return;

  nameSpan.textContent = user.username;
  greetBox.classList.remove("d-none");
  logoutBtn?.classList.remove("d-none");
}

async function logout() {
  try {
    await apiJson("/logout", { method: "POST" });
  } catch {}

  sessionStorage.removeItem("user");
  currentUser = null;
  window.currentUser = null;

  document.querySelector(".topbar")?.classList.add("d-none");
  document.getElementById("app-root")?.classList.add("d-none");
  document.getElementById("footer-placeholder")?.classList.add("d-none");

  // reset greeting
  document.getElementById("userGreeting")?.classList.add("d-none");
  document.getElementById("logoutBtn")?.classList.add("d-none");

  // show login
  document.getElementById("view-login-placeholder")?.classList.remove("d-none");
  initLoginView();
}

/* =========================================================
   Role UI (Admin / Editor / Viewer)
   ========================================================= */

   function applyRoleUI(user) {
  const role = user?.role || "viewer";
  const isAdmin = role === "admin";
  const canEdit = role === "admin" || role === "editor";
  const isViewer = role === "viewer";

  // ---- NAV Buttons ----
  document.getElementById("btnManageUsers")?.classList.toggle("d-none", !isAdmin);

  // Viewer darf keine Create/Manage Exams Buttons sehen
  document.getElementById("btnManualExams")?.classList.toggle("d-none", isViewer);
  document.getElementById("btnManageExams")?.classList.toggle("d-none", isViewer);

  // Optional: Viewer soll Auto-Exams Seite auch nicht sehen? (du wolltest "nur sehen", also NICHT verstecken)
  // document.getElementById("btnExams")?.classList.toggle("d-none", isViewer);

  // ---- Views hart verstecken (falls Viewer irgendwie hinklickt) ----
  document.getElementById("view-manage-users")?.classList.toggle("d-none", !isAdmin);
  document.getElementById("view-manual-exams")?.classList.toggle("d-none", isViewer);
  document.getElementById("view-manage-exams")?.classList.toggle("d-none", isViewer);

  // ---- Forms verstecken (Questions + Exams Create) ----
  document.getElementById("qForm")?.closest(".card")?.classList.toggle("d-none", !canEdit);
  document.getElementById("examForm")?.closest(".card")?.classList.toggle("d-none", !canEdit);

  // Viewer: automatisch auf Questions (Read-only) wechseln
  if (isViewer) {
    document.querySelector('[data-view="questions"]')?.click();
  }
}