async function restoreSession() {
  try {
    const res = await api("/me");
    if (!res.ok) return;

    const data = await res.json();
    currentUser = data.user;
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    updateGreeting(currentUser);

    // Go to questions view automatically
    document.querySelector('[data-view="questions"]')?.click();
  } catch (e) {
    console.log("No active session");
  }
}
