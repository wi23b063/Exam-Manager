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

  // Reset UI
  const greetBox = document.getElementById("userGreeting");
  const logoutBtn = document.getElementById("logoutBtn");

  if (greetBox) greetBox.classList.add("d-none");
  if (logoutBtn) logoutBtn.classList.add("d-none");

  // Show login view
  document.querySelectorAll(".view").forEach(v => v.classList.add("d-none"));
  document.getElementById("view-login")?.classList.remove("d-none");
}
