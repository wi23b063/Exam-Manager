/* =========================================================
   DOM Refs (Questions) – will be assigned later
   ========================================================= */

let subjectSel,
  diffSel,
  typeSel,
  qtext,
  list,
  form,
  saveBtn,
  cancelBtn;

/* =========================================================
   State (Questions)
   ========================================================= */
let currentEditId = null; // question in edit

/* =========================================================
   Permissions
   ========================================================= */
function canEditContent() {
  const role = window.currentUser?.role || "viewer";
  return role === "admin" || role === "editor";
}

/* =========================================================
   Init: Questions view
   ========================================================= */
function initQuestionView() {
  // query elements now that the partial is in the DOM
  subjectSel = $("#subject");
  diffSel = $("#difficulty");
  typeSel = $("#qtype");
  qtext = $("#qtext");
  list = $("#questionList");
  form = $("#qForm");
  saveBtn = $("#saveBtn");
  cancelBtn = $("#cancelEdit");

  if (!form) {
    console.warn("Question view not found (initQuestionView).");
    return;
  }

  // create cancel button once if needed
  if (!cancelBtn) {
    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.id = "cancelEdit";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.style.marginLeft = ".5rem";
    cancelBtn.style.display = "none";
    const submitBtn = saveBtn || form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.after(cancelBtn);
  }

  cancelBtn.addEventListener("click", cancelEditMode);

  // Viewer darf nicht submitten (aber View soll trotzdem funktionieren)
  form.addEventListener("submit", onSubmitQuestion);

  if (list) list.addEventListener("click", onQuestionListClick);
  if (subjectSel) subjectSel.addEventListener("change", loadQuestions);
  if (typeSel) typeSel.addEventListener("change", updateEditorVisibility);

  // Viewer UI: Add-Form verstecken (Card wo das Formular drin ist)
  applyQuestionsRoleUI();

  updateEditorVisibility();
}

/* =========================================================
   Viewer UI adjustments
   ========================================================= */
function applyQuestionsRoleUI() {
  const viewer = !canEditContent();

  // Die Card über dem Formular verstecken
  // (form liegt in einer Card in view-questions.html)
  const formCard = document.getElementById("qForm")?.closest(".card");
  formCard?.classList.toggle("d-none", viewer);

  // Falls jemand per DOM doch edit gestartet hat: reset
  if (viewer) {
    currentEditId = null;
    if (cancelBtn) cancelBtn.style.display = "none";
  }
}

/* =========================================================
   Questions: Editor visibility
   ========================================================= */
function updateEditorVisibility() {
  const t = typeSel ? typeSel.value : "SCQ";
  const editors = $$(".q-editor");
  editors.forEach((el) => {
    el.style.display = el.dataset.editor === t ? "block" : "none";
  });
}

/* =========================================================
   Subjects (shared with exams) – uses question+exam selects
   ========================================================= */
async function loadSubjects() {
  try {
    if (list) statusMsg("Lade Fächer …");

    const subjects = await apiJson("/subjects");
    console.log("subjects:", subjects);

    if (!subjectSel) {
      if (list) {
        list.innerHTML =
          '<p><b>Fehler:</b> <code>#subject</code> nicht gefunden.</p>';
      }
      return;
    }

    const optionsHtml = subjects
      .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
      .join("");

    subjectSel.innerHTML = optionsHtml;

   
    // Exam Subject Select (Auto Exams View)
    const exSel = document.getElementById("examSubject");
    if (exSel) exSel.innerHTML = optionsHtml;

    // Manage Exams subject select (falls vorhanden)
    const mxSel = document.getElementById("mxSubject");
    if (mxSel) {
      mxSel.innerHTML = optionsHtml;
      if (!mxSel.value && subjects[0]) mxSel.value = subjects[0].id;

      if (typeof loadManageExams === "function" && mxSel.value) {
        loadManageExams(mxSel.value);
      }
    }

    if (subjects.length === 0) {
      if (list) list.innerHTML = "<p>No existing subjects.</p>";
      return;
    }

    if (!subjectSel.value && subjects[0]) subjectSel.value = String(subjects[0].id);

    await loadQuestions();

    // Exams initial load, wenn Funktion existiert
    if (typeof loadExams === "function") {
      const exSel = document.getElementById("examSubject");
      if (exSel && exSel.value) await loadExams(exSel.value);
    }
  } catch (e) {
    console.error(e);
    if (list) {
      list.innerHTML =
        "<p><b>Error:</b> Could not load subjects. See console.</p>";
    }
  }
}

/* =========================================================
   Questions: load list
   ========================================================= */
async function loadQuestions() {
  if (!subjectSel) return;
  const sid = subjectSel.value;

  if (!sid) {
    if (list) list.innerHTML = "<p>No subject selected.</p>";
    return;
  }

  const canEdit = canEditContent();

  try {
    statusMsg("Loading questions …");
    const items = await apiJson("/questions?subject_id=" + encodeURIComponent(sid));
    console.log("questions:", items);

    if (!list) return;

    list.innerHTML = items.length
      ? items
          .map((q) => {
            const buttonsHtml = canEdit
              ? `
                <button class="edit btn btn-sm btn-outline-secondary" type="button">
                  Edit
                </button>
                <button class="del btn btn-sm btn-outline-danger" type="button">
                  Delete
                </button>
              `
              : "";

            const optionsHtml = Array.isArray(q.options)
              ? q.options
                  .slice()
                  .sort((a, b) => a.idx - b.idx)
                  .map(
                    (o) =>
                      `<li>${escapeHtml(o.text)} ${o.is_correct ? "✅" : ""}</li>`
                  )
                  .join("")
              : "";

            return `
              <div class="q" data-id="${q.id}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
                  <div>
                    <span class="badge bg-secondary">${escapeHtml(q.difficulty)}</span>
                    <span class="badge bg-info ms-1">${escapeHtml(q.type || "SCQ")}</span>
                    ${escapeHtml(q.text)}
                  </div>
                  <div>${buttonsHtml}</div>
                </div>

                ${
                  optionsHtml
                    ? `<ol style="margin:.5rem 0 0 1rem;">${optionsHtml}</ol>`
                    : ""
                }
                <hr/>
              </div>
            `;
          })
          .join("")
      : "<p>No questions in the selected subject.</p>";
  } catch (e) {
    console.error(e);
    if (list) {
      list.innerHTML =
        "<p><b>Error:</b> Could not load questions. See console.</p>";
    }
  }
}

/* =========================================================
   Questions: click handlers
   ========================================================= */
async function onQuestionListClick(e) {
  const canEdit = canEditContent();
  if (!canEdit) return; // Viewer darf nix klicken

  const btn = e.target;
  const card = btn.closest(".q");
  if (!card) return;

  const id = Number(card.dataset.id);

  // delete
  if (btn.classList.contains("del")) {
    if (!confirm("Really delete question?")) return;
    try {
      await apiJson("/questions/" + id, { method: "DELETE" });
      if (currentEditId === id) cancelEditMode();
      return loadQuestions();
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed");
    }
    return;
  }

  // edit
  if (btn.classList.contains("edit")) {
    try {
      const q = await apiJson("/questions/" + id);

      if (subjectSel) subjectSel.value = q.subject_id;
      if (diffSel) diffSel.value = q.difficulty;
      if (qtext) qtext.value = q.text;

      if (typeSel) typeSel.value = q.type || "SCQ";
      updateEditorVisibility();

      const type = typeSel ? typeSel.value : "SCQ";

      if (type === "MCQ") {
        const inputs = $$(".opt-mcq");
        const checks = $$('input[name="mcq_correct"]');
        q.options
          .slice()
          .sort((a, b) => a.idx - b.idx)
          .forEach((o, i) => {
            if (inputs[i]) inputs[i].value = o.text;
            if (checks[i]) checks[i].checked = !!o.is_correct;
          });
      } else if (type === "TF") {
        const tfRadios = $$('input[name="tf_correct"]');
        tfRadios.forEach((r) => (r.checked = false));
        const correctOpt = q.options.find((o) => o.is_correct);
        if (correctOpt) {
          const targetVal = correctOpt.text.toLowerCase().startsWith("t")
            ? "true"
            : "false";
          const radio = tfRadios.find((r) => r.value === targetVal);
          if (radio) radio.checked = true;
        }
      } else if (type === "SA") {
        const inp = $("#sa_answer");
        if (inp && q.options && q.options.length > 0) {
          inp.value = q.options[0].text || "";
        }
      } else if (type === "LA") {
        const ta = $("#la_answer");
        if (ta && q.options && q.options.length > 0) {
          ta.value = q.options[0].text || "";
        }
      } else {
        // SCQ
        const inputs = $$(".opt-scq");
        const radios = $$('input[name="scq_correct"]');
        q.options
          .slice()
          .sort((a, b) => a.idx - b.idx)
          .forEach((o, i) => {
            if (inputs[i]) inputs[i].value = o.text;
            if (radios[i]) radios[i].checked = !!o.is_correct;
          });
      }

      currentEditId = q.id;
      setEditMode(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not load question");
    }
  }
}

/* =========================================================
   Questions: submit (create/update)
   ========================================================= */
async function onSubmitQuestion(e) {
  e.preventDefault();

  if (!canEditContent()) {
    alert("Viewer cannot edit questions.");
    return;
  }

  if (!subjectSel || !qtext || !diffSel || !typeSel) {
    alert("Form not fully initialized.");
    return;
  }

  const sid = parseInt(subjectSel.value, 10);
  const text = qtext.value.trim();
  const diff = diffSel.value;
  const type = typeSel.value || "SCQ";

  let options = [];

  if (type === "SCQ") {
    const optInputs = $$(".opt-scq");
    const opts = optInputs.map((i) => i.value.trim());
    const fd = new FormData(form);
    const correctIdx = parseInt(fd.get("scq_correct"), 10);

    if (!text || opts.some((t) => t === "") || isNaN(correctIdx)) {
      alert(
        "Please fill in the question text, all 4 options, and select exactly one correct option."
      );
      return;
    }

    options = opts.map((t, i) => ({
      text: t,
      is_correct: i === correctIdx,
    }));
  } else if (type === "MCQ") {
    const optInputs = $$(".opt-mcq");
    const opts = optInputs.map((i) => i.value.trim());
    const fd = new FormData(form);
    const correctValues = fd.getAll("mcq_correct").map((v) => Number(v));

    if (!text || opts.some((t) => t === "")) {
      alert("Please fill in the question text and all 4 options.");
      return;
    }
    if (correctValues.length === 0) {
      alert("Please select at least one correct option.");
      return;
    }

    options = opts.map((t, i) => ({
      text: t,
      is_correct: correctValues.includes(i),
    }));
  } else if (type === "TF") {
    const fd = new FormData(form);
    const val = fd.get("tf_correct"); // "true" or "false"

    if (!val) {
      alert("Please select whether the statement is true or false.");
      return;
    }

    options = [
      { text: "True", is_correct: val === "true" },
      { text: "False", is_correct: val === "false" },
    ];
  } else if (type === "SA") {
    const inp = $("#sa_answer");
    const ans = inp ? inp.value.trim() : "";

    if (!text || !ans) {
      alert("Please enter the question text and the correct short answer.");
      return;
    }

    options = [{ text: ans, is_correct: true }];
  } else if (type === "LA") {
    const ta = $("#la_answer");
    const ans = ta ? ta.value.trim() : "";

    if (!text || !ans) {
      alert("Please enter the question text and a sample answer for Long Answer.");
      return;
    }

    options = [{ text: ans, is_correct: true }];
  } else {
    alert("Unsupported question type in frontend: " + type);
    return;
  }

  const payload = {
    subject_id: sid,
    text,
    difficulty: diff,
    type,
    options,
  };

  toggleSaving(true);

  const url = currentEditId ? "/questions/" + currentEditId : "/questions";
  const method = currentEditId ? "PUT" : "POST";

  try {
    await apiJson(url, { method, body: JSON.stringify(payload) });

    if (form) form.reset();
    setEditMode(false);
    updateEditorVisibility();
    await loadQuestions();
  } catch (err) {
    console.error("Failed to save", err);
    alert(err.message || "Failed to save.");
  } finally {
    toggleSaving(false);
  }
}

/* =========================================================
   UI utils (questions)
   ========================================================= */
function setEditMode(on) {
  const btn = saveBtn || (form && form.querySelector('button[type="submit"]'));
  if (btn) btn.textContent = on ? "Save changes" : "Save";
  if (cancelBtn) cancelBtn.style.display = on ? "inline-block" : "none";
  if (!on) currentEditId = null;
}

function cancelEditMode() {
  if (form) form.reset();
  setEditMode(false);
  updateEditorVisibility();
}

function toggleSaving(isSaving) {
  const btn = saveBtn || (form && form.querySelector('button[type="submit"]'));
  if (!btn) return;
  btn.disabled = isSaving;
  btn.textContent = isSaving
    ? "Saving …"
    : currentEditId
    ? "Save changes"
    : "Save";
}

function statusMsg(msg) {
  if (!list) return;
  list.innerHTML = `<p style="opacity:.8">${escapeHtml(msg)}</p>`;
}