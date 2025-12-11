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

// Navigation between "Add questions" and "Create Exams"
function initViewNavigation() {
  document.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-view]");
    if (!btn) return; // click was not on a nav button

    const target = btn.dataset.view; // "questions" or "exams"

    const navButtons = document.querySelectorAll("[data-view]");
    const views = document.querySelectorAll(".view");

    // set active button
    navButtons.forEach((b) => b.classList.toggle("active", b === btn));

    // show/hide views
    views.forEach((v) => {
      const isTarget = v.id === "view-" + target;
      v.classList.toggle("d-none", !isTarget);
    });
  });
}

/* =========================================================
   Global DOMContentLoaded: load partials + init everything
   ========================================================= */

let questionsReady = false;
let examsReady = false;

function maybeInitData() {
  // only load subjects once both views exist, so both selects can be filled
  if (questionsReady && examsReady) {
    loadSubjects();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // header (then nav)
  loadPartial("header-placeholder", "partials/header.html", function () {
    initViewNavigation();
  });

  // footer
  loadPartial("footer-placeholder", "partials/footer.html");

  // questions view
  loadPartial(
    "view-questions-placeholder",
    "partials/view-questions.html",
    function () {
      initQuestionView();
      questionsReady = true;
      maybeInitData();
    }
  );

  // exams view
  loadPartial(
    "view-exams-placeholder",
    "partials/view-exams.html",
    function () {
      initExamView();
      examsReady = true;
      maybeInitData();
    }
  );
});