/* =========================================================
   Manage Users View
   ========================================================= */

let users = []; // in-memory user list
let editIndex = null; // index of user being edited

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

  // Render users list
  function renderUsers() {
    if (users.length === 0) {
      userListDiv.innerHTML = "<em>No users available.</em>";
      return;
    }

    userListDiv.innerHTML = "";
    users.forEach((user, index) => {
      const div = document.createElement("div");
      div.className = "d-flex justify-content-between align-items-center mb-1 p-1 border rounded";
      div.innerHTML = `
        <div>
          <strong>${user.name}</strong> (${user.email}) - <em>${user.role}</em>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary btn-edit">Edit</button>
          <button class="btn btn-sm btn-danger btn-delete">Delete</button>
        </div>
      `;

      // Edit button
      div.querySelector(".btn-edit").addEventListener("click", () => {
        userName.value = user.name;
        userEmail.value = user.email;
        userRole.value = user.role;
        editIndex = index;
        addUserBtn.disabled = true;
        updateUserBtn.disabled = false;
        userFormMsg.textContent = "Editing user...";
      });

      // Delete button
      div.querySelector(".btn-delete").addEventListener("click", () => {
        if (confirm(`Delete user "${user.name}"?`)) {
          users.splice(index, 1);
          renderUsers();
          resetForm();
        }
      });

      userListDiv.appendChild(div);
    });
  }

  // Reset form
  function resetForm() {
    userName.value = "";
    userEmail.value = "";
    userRole.value = "";
    editIndex = null;
    addUserBtn.disabled = false;
    updateUserBtn.disabled = true;
    userFormMsg.textContent = "";
  }

  // Add user
  addUserBtn.addEventListener("click", () => {
    const name = userName.value.trim();
    const email = userEmail.value.trim();
    const role = userRole.value;

    if (!name || !email || !role) {
      userFormMsg.textContent = "Please fill all fields.";
      return;
    }

    users.push({ name, email, role });
    renderUsers();
    resetForm();
  });

  // Update user
  updateUserBtn.addEventListener("click", () => {
    if (editIndex === null) return;

    const name = userName.value.trim();
    const email = userEmail.value.trim();
    const role = userRole.value;

    if (!name || !email || !role) {
      userFormMsg.textContent = "Please fill all fields.";
      return;
    }

    users[editIndex] = { name, email, role };
    renderUsers();
    resetForm();
  });

  // Reset form button
  resetUserFormBtn.addEventListener("click", resetForm);

  // Initial render
  renderUsers();
}

document.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-view]");
  if (!btn) return;

  const target = btn.dataset.view; // e.g., "manage-users"
  const views = document.querySelectorAll(".view");

  views.forEach((v) => {
    const isTarget = v.id === "view-" + target;
    v.classList.toggle("d-none", !isTarget);

    // Only initialize when showing
    if (isTarget && target === "manage-users" && typeof initManageUsersView === "function") {
      initManageUsersView();
    }
  });
});

