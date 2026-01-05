/* =========================================================
   Partials + navigation
   ========================================================= */

// Load an HTML partial into a placeholder element
function loadPartial(placeholderId, url, callback) {
  const el = document.getElementById(placeholderId);
  if (!el) return;

  fetch(url)
    .then((response) => response.text())
    .then((html) => {
      el.innerHTML = html;
      if (typeof callback === "function") callback();
    })
    .catch((err) => {
      console.error("Error loading partial:", url, err);
    });
}

// Navigation between views
function initViewNavigation() {
  document.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-view]");
    if (!btn) return;

    const target = btn.dataset.view; // "questions", "exams", "manual-exams"

    const navButtons = document.querySelectorAll("[data-view]");
    const views = document.querySelectorAll(".view");

    // set active button
    navButtons.forEach((b) => b.classList.toggle("active", b === btn));

    // show/hide views
    views.forEach((v) => {
      const isTarget = v.id === "view-" + target;
      v.classList.toggle("d-none", !isTarget);
    });

    // OPTIONAL: wenn man zur Manual-Exam-View geht, könnte man reload triggern
    // (lassen wir erstmal weg, init läuft einmal beim Laden)
  });
}

/* =========================================================
   Global DOMContentLoaded: load partials + init everything
   ========================================================= */

let questionsReady = false;
let examsReady = false;
let manualReady = false;

function maybeInitData() {
  // only load subjects once all views exist, so all selects can be filled
  if (questionsReady && examsReady && manualReady) {
    if (typeof loadSubjects === "function") {
      loadSubjects();
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // header (then nav + logout)
  loadPartial("header-placeholder", "partials/header.html", function () {
    initViewNavigation();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
  });

  // footer
  loadPartial("footer-placeholder", "partials/footer.html");

  // login view + session
  loadPartial("view-login-placeholder", "partials/login.html", function () {
    initLoginView();
    restoreSession();
  });

  // questions view
  loadPartial("view-questions-placeholder", "partials/view-questions.html", function () {
    initQuestionView();
    questionsReady = true;
    maybeInitData();
  });

  // exams view
  loadPartial("view-exams-placeholder", "partials/view-exams.html", function () {
    initExamView();
    examsReady = true;
    maybeInitData();
  });

  // NEW: manual exams view
  loadPartial("view-manual-exams-placeholder", "partials/view-manual-exams.html", function () {
    // init function is provided by frontend/js/manualExams.js
    if (typeof initManualExamsView === "function") {
      initManualExamsView();
    }
    manualReady = true;
    maybeInitData();
  });
});
