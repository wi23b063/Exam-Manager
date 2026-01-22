async function restoreSession() {
  try {
    const res = await api("/me");
    if (!res.ok) return; // no session, do nothing

    const data = await res.json();
    currentUser = data.user;
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    updateGreeting(currentUser);

    // Show header, app, footer
    document.querySelector(".topbar")?.classList.remove("d-none");
    document.getElementById("app-root")?.classList.remove("d-none");
    document.getElementById("footer-placeholder")?.classList.remove("d-none");

    // Hide login view
    document.getElementById("view-login-placeholder")?.classList.add("d-none");

    // Go to questions view automatically
    document.querySelector('[data-view="questions"]')?.click();
  } catch (e) {
    console.log("No active session");
    // login view stays visible
  }
}
