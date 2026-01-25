let currentUser = null;

/* =========================================================
   DOM Refs (Login)
   ========================================================= */

let loginForm, userInput, passInput, msg;

/* =========================================================
   Init: Login view
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
   Login submit
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
    const res = await api("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showMsg(data.message || "Login failed", "error");
      return;
    }

  // SAVE USER
  currentUser = data.user;
  sessionStorage.setItem("user", JSON.stringify(currentUser));

  // UPDATE UI
  updateGreeting(currentUser);

  // SHOW HEADER + APP
  const header = document.querySelector(".topbar");
  if (header) header.classList.remove("d-none");

  const appRoot = document.getElementById("app-root");
  if (appRoot) appRoot.classList.remove("d-none");

  const footer = document.getElementById("footer-placeholder");
  if (footer) footer.classList.remove("d-none");

  // HIDE LOGIN
  document.getElementById("view-login-placeholder")?.classList.add("d-none");
  document.getElementById("view-login")?.classList.remove("d-none");

  // NAVIGATE TO QUESTIONS VIEW
  const btn = document.querySelector('[data-view="questions"]');
  if (btn) btn.click();
  } catch (err) {
    showMsg("Server error", "error");
  }
}

/* =========================================================
   UI helper (login messages)
   ========================================================= */

function showMsg(text, type) {
  if (!msg) return;

  msg.textContent = text;
  msg.style.color = type === "success" ? "green" : "red";
}

/* =========================================================
   Greeting (Hello, username)
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

/* =========================================================
   Logout
   ========================================================= */

async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } catch (e) {
    console.warn("Logout request failed");
  }

  // Clear frontend state
  sessionStorage.removeItem("user");
  currentUser = null;

  // Hide header, app, footer
  document.querySelector(".topbar")?.classList.add("d-none");
  document.getElementById("app-root")?.classList.add("d-none");
  document.getElementById("footer-placeholder")?.classList.add("d-none");

  // Reset greeting & logout button
  const greetBox = document.getElementById("userGreeting");
  const logoutBtn = document.getElementById("logoutBtn");
  if (greetBox) greetBox.classList.add("d-none");
  if (logoutBtn) logoutBtn.classList.add("d-none");

  // Show login view
  document.getElementById("view-login-placeholder")?.classList.remove("d-none");
  const loginView = document.getElementById("view-login-placeholder");
  console.log("loginView display:", window.getComputedStyle(loginView).display);


  // Re-initialize login form
  initLoginView();

console.log("Logging out...");
console.log("Header:", document.querySelector(".topbar"));
console.log("App Root:", document.getElementById("app-root"));
console.log("Footer:", document.getElementById("footer-placeholder"));
console.log("Login view:", document.getElementById("view-login-placeholder"));

}
