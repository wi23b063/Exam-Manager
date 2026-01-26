async function restoreSession() {
  try {
    const data = await apiJson("/me");   // <--- HIER
    if (!data || !data.user) return;

    currentUser = data.user;
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    updateGreeting(currentUser);

    window.currentUser = currentUser;
    applyRoleUI(currentUser);

    document.querySelector(".topbar")?.classList.remove("d-none");
    document.getElementById("app-root")?.classList.remove("d-none");
    document.getElementById("footer-placeholder")?.classList.remove("d-none");

    document.getElementById("view-login-placeholder")?.classList.add("d-none");

    document.querySelector('[data-view="questions"]')?.click();
  } catch (e) {
    console.log("No active session");
  }
}
