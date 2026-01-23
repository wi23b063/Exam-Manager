/* =========================================================
   Manage Users View
   ========================================================= */

let editUserId = null; // ID of the user being edited

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

  userRole.innerHTML = `
    <option value="">Select role</option>
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
  `;

  // ----------------------
  // Load users from backend
  // ----------------------
  async function fetchUsers() {
    try {
      const res = await fetch("/api/users"); // adjust endpoint
      const data = await res.json();
      renderUsers(data);
    } catch (err) {
      userListDiv.innerHTML = `<em>Error loading users.</em>`;
      console.error(err);
    }
  }

  // ----------------------
  // Render users list
  // ----------------------
  function renderUsers(users) {
    if (!users || users.length === 0) {
      userListDiv.innerHTML = "<em>No users available.</em>";
      return;
    }

    userListDiv.innerHTML = "";
    users.forEach((user) => {
      const div = document.createElement("div");
      div.className = "d-flex justify-content-between align-items-center mb-1 p-1 border rounded";
      div.innerHTML = `
        <div>
          <strong>${user.username}</strong> (${user.email}) - <em>${user.role}</em>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary btn-edit">Edit</button>
          <button class="btn btn-sm btn-danger btn-delete">Delete</button>
        </div>
      `;

      // Edit
      div.querySelector(".btn-edit").addEventListener("click", () => {
        userName.value = user.username;
        userEmail.value = user.email;
        userRole.value = user.role;
        editUserId = user.id;

        addUserBtn.disabled = true;
        updateUserBtn.disabled = false;
        userFormMsg.textContent = "Editing user...";
      });

      // Delete
      div.querySelector(".btn-delete").addEventListener("click", async () => {
        if (!confirm(`Delete user "${user.username}"?`)) return;

        try {
          const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          fetchUsers();
          resetForm();
        } catch (err) {
          userFormMsg.textContent = "Error deleting user.";
          console.error(err);
        }
      });

      userListDiv.appendChild(div);
    });
  }

  // ----------------------
  // Reset form
  // ----------------------
  function resetForm() {
    userName.value = "";
    userEmail.value = "";
    userRole.value = "";
    editUserId = null;

    addUserBtn.disabled = false;
    updateUserBtn.disabled = true;
    userFormMsg.textContent = "";
  }

  // ----------------------
  // Add user
  // ----------------------
  addUserBtn.addEventListener("click", async () => {
    const username = userName.value.trim();
    const email = userEmail.value.trim();
    const role = userRole.value;
    const password = prompt("Enter a password for this user:")?.trim();

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
        throw new Error(err.message || "Failed to create user");
      }

      fetchUsers();
      resetForm();
      userFormMsg.textContent = "User created successfully!";
    } catch (err) {
      userFormMsg.textContent = err.message;
      console.error(err);
    }
  });

  // ----------------------
  // Update user
  // ----------------------
  updateUserBtn.addEventListener("click", async () => {
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
        throw new Error(err.message || "Failed to update user");
      }

      fetchUsers();
      resetForm();
      userFormMsg.textContent = "User updated successfully!";
    } catch (err) {
      userFormMsg.textContent = err.message;
      console.error(err);
    }
  });

  // Reset form button
  resetUserFormBtn.addEventListener("click", resetForm);

  // Initial load
  fetchUsers();
}