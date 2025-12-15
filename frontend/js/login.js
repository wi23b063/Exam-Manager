/* =========================================================
   DOM Refs (Login)
   ========================================================= */

let loginForm, userInput, passInput, msg;

/* =========================================================
   Init: Login view
   ========================================================= */

function initLoginView() {
  loginForm = $("#loginForm");
  userInput = $("#loginUser");
  passInput = $("#loginPass");
  msg = $("#loginMsg");
  console.log("loginForm:", loginForm);

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

  console.log("onLoginSubmit fired");

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

    showMsg(data.message || "Login successful", "success");

    // go to questions view
    const btn = document.querySelector('[data-view="questions"]');
    if (btn) btn.click();
  } catch (err) {
    showMsg("Server error", "error");
  }
}

/* =========================================================
   UI helper
   ========================================================= */

function showMsg(text, type) {
  if (!msg) return;

  msg.textContent = text;
  msg.style.color = type === "success" ? "green" : "red";
}
