/* =========================================================
   Manage Users View (FIXED – SPA safe)
   ========================================================= */

let editUserId = null;

function initManageUsersView() {
  const userForm = document.getElementById("userForm");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userRole = document.getElementById("userRole");

  const addUserBtn = document.getElementById("addUser");
  const updateUserBtn = document.getElementById("updateUser");
  const resetUserFormBtn = document.getElementById("resetUserForm");

  const userFormMsg = document.getElementById("userFormMsg");
  const userListDiv = document.getElementById("userList");

  /* 🚨 CRITICAL FIX: STOP FORM SUBMISSION 🚨 */
  userForm.addEventListener("submit", (e) => e.preventDefault());

  userRole.innerHTML = `
    <option value="">Select role</option>
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
    <option value="viewer">Viewer</option>
  `;

  updateUserBtn.disabled = true;

  /* ======================
     Fetch users
     ====================== */
  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      renderUsers(data);
    } catch (err) {
      userListDiv.innerHTML = "<em>Error loading users.</em>";
      console.error(err);
    }
  }

  /* ======================
     Render users (delegated)
     ====================== */
  function renderUsers(users) {
    userListDiv.innerHTML = "";

    if (!users || users.length === 0) {
      userListDiv.innerHTML = "<em>No users available.</em>";
      return;
    }

    users.forEach((user) => {
      const div = document.createElement("div");
      div.className =
        "d-flex justify-content-between align-items-center mb-1 p-1 border rounded";
      div.dataset.id = user.id;
      div.dataset.username = user.username;
      div.dataset.email = user.email;
      div.dataset.role = user.role;

      div.innerHTML = `
        <div>
          <strong>${user.username}</strong> (${user.email}) — <em>${user.role}</em>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-primary btn-edit">Edit</button>
          <button type="button" class="btn btn-sm btn-danger btn-delete">Delete</button>
        </div>
      `;

      userListDiv.appendChild(div);
    });
  }

  /* ======================
     Delegated click handler
     ====================== */
  userListDiv.addEventListener("click", async (e) => {
    const row = e.target.closest("[data-id]");
    if (!row) return;

    /* ---- EDIT ---- */
    if (e.target.classList.contains("btn-edit")) {
      userName.value = row.dataset.username;
      userEmail.value = row.dataset.email;
      userRole.value = row.dataset.role;

      editUserId = row.dataset.id;

      addUserBtn.disabled = true;
      updateUserBtn.disabled = false;
      userFormMsg.textContent = "Editing user…";
    }

    /* ---- DELETE ---- */
    if (e.target.classList.contains("btn-delete")) {
      if (!confirm(`Delete user "${row.dataset.username}"?`)) return;

      try {
        const res = await fetch(`/api/users/${row.dataset.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        fetchUsers();
        resetForm();
      } catch (err) {
        userFormMsg.textContent = "Error deleting user.";
        console.error(err);
      }
    }
  });

  /* ======================
     Reset form
     ====================== */
  function resetForm() {
    userName.value = "";
    userEmail.value = "";
    userRole.value = "";

    editUserId = null;
    addUserBtn.disabled = false;
    updateUserBtn.disabled = true;
    userFormMsg.textContent = "";
  }

  /* ======================
     Add user
     ====================== */
  addUserBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const username = userName.value.trim();
    const email = userEmail.value.trim();
    const role = userRole.value;
    const password = prompt("Enter a password for this user:");

    if (!username || !email || !role || !password) {
      userFormMsg.textContent = "All fields and password are required.";
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, role, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      fetchUsers();
      resetForm();
      userFormMsg.textContent = "User created successfully!";
    } catch (err) {
      userFormMsg.textContent = err.message;
    }
  });

  /* ======================
     Update user
     ====================== */
  updateUserBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!editUserId) return;

    const username = userName.value.trim();
    const email = userEmail.value.trim();
    const role = userRole.value;

    if (!username || !email || !role) {
      userFormMsg.textContent = "All fields are required.";
      return;
    }

    try {
      const res = await fetch(`/api/users/${editUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, role }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      fetchUsers();
      resetForm();
      userFormMsg.textContent = "User updated successfully!";
    } catch (err) {
      userFormMsg.textContent = err.message;
    }
  });

  resetUserFormBtn.addEventListener("click", resetForm);

  fetchUsers();
}