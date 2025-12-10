/* =========================================================
   Helpers
   ========================================================= */
const api = (p, opts = {}) =>
  fetch("/api" + p, { headers: { "Content-Type": "application/json" }, ...opts });

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   DOM Refs (Fragen)
   ========================================================= */
const subjectSel = $("#subject");
const diffSel = $("#difficulty");
const typeSel = $("#qtype");
const qtext = $("#qtext");
const list = $("#questionList");
const form = $("#qForm");
const saveBtn = $("#saveBtn");
let cancelBtn = $("#cancelEdit");

/* =========================================================
   DOM Refs (Prüfungen)
   ========================================================= */
const examForm = $("#examForm");
const examSubjectSel = $("#examSubject");
const examNameInput = $("#examName");
const examList = $("#examList");
const countEasy = $("#countEasy");
const countMedium = $("#countMedium");
const countHard = $("#countHard");
const examTotalSpan = $("#examTotal");
const btnCreateAutoExam = $("#btnCreateAutoExam");
const btnCancelExamEdit = $("#btnCancelExamEdit");
const examEditHint = $("#examEditHint");
const examEditName = $("#examEditName");
const examDetailBox = $("#examDetail");

/* =========================================================
   State
   ========================================================= */
let currentEditId = null;             // Frage in Bearbeitung
let currentExamEditId = null;         // Prüfung in Bearbeitung
let currentExamQuestionIds = [];      // Fragen-IDs der zu bearbeitenden Prüfung

/* =========================================================
   Init
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  // Cancel-Button für Fragen ggf. erzeugen
  if (!cancelBtn && form) {
    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.id = "cancelEdit";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.style.marginLeft = ".5rem";
    cancelBtn.style.display = "none";
    const submitBtn = saveBtn || form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.after(cancelBtn);
  }
  if (cancelBtn) cancelBtn.addEventListener("click", cancelEditMode);

  if (form) form.addEventListener("submit", onSubmitQuestion);
  if (list) list.addEventListener("click", onQuestionListClick);
  if (subjectSel) subjectSel.addEventListener("change", loadQuestions);
  if (typeSel) typeSel.addEventListener("change", updateEditorVisibility);

  // Prüfungs-View
  setupExamView();

  console.log("init OK", {
    hasSubject: !!subjectSel,
    hasForm: !!form,
    hasType: !!typeSel,
    hasExamSubject: !!examSubjectSel,
  });

  updateEditorVisibility();
  await loadSubjects();
});

/* =========================================================
   Fragen: Editor-Visibility
   ========================================================= */
function updateEditorVisibility() {
  const t = typeSel ? typeSel.value : "SCQ";
  const editors = $$(".q-editor");
  editors.forEach((el) => {
    el.style.display = el.dataset.editor === t ? "block" : "none";
  });
}

/* =========================================================
   Fächer laden (Subjects)
   ========================================================= */
async function loadSubjects() {
  try {
    if (list) statusMsg("Lade Fächer …");
    const res = await api("/subjects");
    if (!res.ok) throw new Error("subjects fetch failed: " + res.status);
    const subjects = await res.json();
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
    if (examSubjectSel) examSubjectSel.innerHTML = optionsHtml;

    if (subjects.length === 0) {
      if (list) list.innerHTML = "<p>No existing subjects. Please create one first.</p>";
      if (examList)
        examList.innerHTML = "<p>No existing subjects. Please create one first.</p>";
      return;
    }

    if (!subjectSel.value) subjectSel.value = String(subjects[0].id);
    if (examSubjectSel && !examSubjectSel.value)
      examSubjectSel.value = String(subjects[0].id);

    await loadQuestions();

    if (examSubjectSel && examSubjectSel.value) {
      await loadExams(examSubjectSel.value);
    }
  } catch (e) {
    console.error(e);
    if (list) {
      list.innerHTML =
        "<p><b>Error:</b> Could not load subjects. See console.</p>";
    }
    if (examList) {
      examList.innerHTML =
        "<p><b>Error:</b> Could not load subjects. See console.</p>";
    }
  }
}

/* =========================================================
   Fragen laden
   ========================================================= */
async function loadQuestions() {
  if (!subjectSel) return;
  const sid = subjectSel.value;
  if (!sid) {
    if (list) list.innerHTML = "<p>No subject selected.</p>";
    return;
  }

  try {
    statusMsg("Loading questions …");
    const res = await api("/questions?subject_id=" + encodeURIComponent(sid));
    if (!res.ok) throw new Error("questions fetch failed: " + res.status);
    const items = await res.json();
    console.log("questions:", items);

    if (!list) return;

    list.innerHTML = items.length
      ? items
          .map(
            (q) => `
        <div class="q" data-id="${q.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
            <div>
              <span class="badge bg-secondary">${escapeHtml(q.difficulty)}</span>
              <span class="badge bg-info ms-1">${escapeHtml(q.type || "SCQ")}</span>
              ${escapeHtml(q.text)}
            </div>
            <div>
              <button class="edit btn btn-sm btn-outline-secondary" type="button">
                Edit
              </button>
              <button class="del btn btn-sm btn-outline-danger" type="button">
                Delete
              </button>
            </div>
          </div>
          <ol style="margin:.5rem 0 0 1rem;">
            ${q.options
              .sort((a, b) => a.idx - b.idx)
              .map(
                (o) =>
                  `<li>${escapeHtml(o.text)} ${o.is_correct ? "✅" : ""}</li>`
              )
              .join("")}
          </ol>
          <hr/>
        </div>`
          )
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
   Fragen: Klick-Handler Liste
   ========================================================= */
async function onQuestionListClick(e) {
  const btn = e.target;
  const card = btn.closest(".q");
  if (!card) return;
  const id = Number(card.dataset.id);

  // Löschen
  if (btn.classList.contains("del")) {
    if (!confirm("Really delete question?")) return;
    const r = await api("/questions/" + id, { method: "DELETE" });
    if (!r.ok) return alert("Delete failed");
    if (currentEditId === id) cancelEditMode();
    return loadQuestions();
  }

  // Edit
  if (btn.classList.contains("edit")) {
    const r = await api("/questions/" + id);
    if (!r.ok) return alert("Could not load question");
    const q = await r.json();

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
        .sort((a, b) => a.idx - b.idx)
        .forEach((o, i) => {
          if (inputs[i]) inputs[i].value = o.text;
          if (radios[i]) radios[i].checked = !!o.is_correct;
        });
    }

    currentEditId = q.id;
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/* =========================================================
   Fragen: Submit (create/update)
   ========================================================= */
async function onSubmitQuestion(e) {
  e.preventDefault();

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
    const val = fd.get("tf_correct"); // "true" oder "false"

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

  const res = await api(url, {
    method,
    body: JSON.stringify(payload),
  });

  toggleSaving(false);

  if (!res.ok) {
    console.error("Failed to save", await safeText(res));
    return alert("Failed to save.");
  }

  if (form) form.reset();
  setEditMode(false);
  updateEditorVisibility();
  await loadQuestions();
}

/* =========================================================
   Prüfungen: Grund-Setup
   ========================================================= */
function setupExamView() {
  updateExamTotal();

  if (countEasy) countEasy.addEventListener("input", updateExamTotal);
  if (countMedium) countMedium.addEventListener("input", updateExamTotal);
  if (countHard) countHard.addEventListener("input", updateExamTotal);

  if (examSubjectSel) {
    examSubjectSel.addEventListener("change", () => {
      if (examSubjectSel.value) loadExams(examSubjectSel.value);
    });
  }

  if (btnCreateAutoExam) {
    btnCreateAutoExam.addEventListener("click", createOrUpdateExam);
  }

  if (btnCancelExamEdit) {
    btnCancelExamEdit.addEventListener("click", cancelExamEditMode);
  }

  if (examList) {
    examList.addEventListener("click", onExamListClick);
  }

  if (examDetailBox) {
    examDetailBox.innerHTML =
      "Select an exam below and click on „Details“ to view the questions.";
  }
}

function updateExamTotal() {
  const e = parseInt(countEasy?.value || "0", 10) || 0;
  const m = parseInt(countMedium?.value || "0", 10) || 0;
  const h = parseInt(countHard?.value || "0", 10) || 0;
  if (examTotalSpan) examTotalSpan.textContent = e + m + h;
}

/* =========================================================
   Prüfungen laden
   ========================================================= */
async function loadExams(subjectId) {
  if (!examList) return;
  if (!subjectId) {
    examList.innerHTML = "<p>No subject selected.</p>";
    return;
  }

  examList.innerHTML = "<p>Loading exams …</p>";
  try {
    const res = await api("/exams?subject_id=" + encodeURIComponent(subjectId));
    if (!res.ok) throw new Error("exams fetch failed: " + res.status);
    const exams = await res.json();
    console.log("exams:", exams);

    if (!exams.length) {
      examList.innerHTML = "<p>No exams for this subject.</p>";
      return;
    }

    examList.innerHTML = exams
      .map(
        (ex) => `
        <div class="exam-card border rounded p-2 mb-2" data-id="${ex.id}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>${escapeHtml(ex.name)}</strong><br/>
              <small>
                Typ: ${escapeHtml(ex.mode)} |
                Fragen: ${escapeHtml(ex.question_count)} |
                Erstellt: ${escapeHtml(ex.created_at)}
              </small>
            </div>
            <div class="ms-2">
              <button type="button" class="btn btn-sm btn-outline-primary exam-details">
                Details
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary exam-edit ms-1">
                Edit
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger exam-del ms-1">
                Delete
              </button>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  } catch (e) {
    console.error(e);
    examList.innerHTML =
      "<p><b>Fehler:</b> Could not load exams. See console.</p>";
  }
}

/* =========================================================
   Prüfungen: Klicks in der Liste
   ========================================================= */
async function onExamListClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const card = btn.closest(".exam-card");
  if (!card) return;
  const id = parseInt(card.dataset.id || "0", 10);
  if (!id) return;

  if (btn.classList.contains("exam-del")) {
    if (!confirm("Really delete exam?")) return;
    try {
      const res = await api("/exams/" + id, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const txt = await safeText(res);
        console.error("delete exam failed", txt);
        alert("Failed to delete exam.");
        return;
      }
      if (examSubjectSel && examSubjectSel.value) {
        await loadExams(examSubjectSel.value);
      }
      if (currentExamEditId === id) cancelExamEditMode();
      if (examDetailBox && parseInt(examDetailBox.dataset.examId || "0", 10) === id) {
        examDetailBox.innerHTML =
          "Select an exam below and click on „Details“ to view the questions.";
        examDetailBox.dataset.examId = "";
      }
    } catch (err) {
      console.error(err);
      alert("Network error while deleting the exam.");
    }
    return;
  }

  if (btn.classList.contains("exam-edit")) {
    await startExamEdit(id);
    return;
  }

  if (btn.classList.contains("exam-details")) {
    await showExamDetails(id);
    return;
  }
}

/* =========================================================
   Prüfung bearbeiten (nur Name, Fragen bleiben gleich)
   ========================================================= */
async function startExamEdit(id) {
  try {
    const res = await api("/exams/" + id);
    if (!res.ok) {
      const txt = await safeText(res);
      console.error("load exam failed", txt);
      alert("Failed to load exam.");
      return;
    }

    const exam = await res.json();
    console.log("edit exam:", exam);

    currentExamEditId = exam.id;
    currentExamQuestionIds = Array.isArray(exam.questions)
      ? exam.questions.map((q) => q.id)
      : [];

    if (examSubjectSel) {
      examSubjectSel.value = String(exam.subject_id);
      examSubjectSel.disabled = true;
    }

    if (examNameInput) {
      examNameInput.value = exam.name || "";
    }

    // Counts grob anzeigen, aber im Edit nicht ändern lassen
    let counts = { easy: 0, medium: 0, hard: 0 };
    if (Array.isArray(exam.questions)) {
      exam.questions.forEach((q) => {
        if (q.difficulty && counts[q.difficulty] != null) {
          counts[q.difficulty]++;
        }
      });
    }

    if (countEasy) {
      countEasy.value = counts.easy;
      countEasy.disabled = true;
    }
    if (countMedium) {
      countMedium.value = counts.medium;
      countMedium.disabled = true;
    }
    if (countHard) {
      countHard.value = counts.hard;
      countHard.disabled = true;
    }
    updateExamTotal();

    if (btnCreateAutoExam) {
      btnCreateAutoExam.textContent = "Save changes";
    }
    if (btnCancelExamEdit) {
      btnCancelExamEdit.classList.remove("d-none");
    }
    if (examEditHint) {
      examEditHint.classList.remove("d-none");
    }
    if (examEditName) {
      examEditName.textContent = exam.name || "";
    }

    const examsView = $("#view-exams");
    if (examsView) examsView.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error(err);
    alert("Failed to load exam.");
  }
}

function cancelExamEditMode() {
  currentExamEditId = null;
  currentExamQuestionIds = [];

  if (examSubjectSel) {
    examSubjectSel.disabled = false;
  }

  if (countEasy) countEasy.disabled = false;
  if (countMedium) countMedium.disabled = false;
  if (countHard) countHard.disabled = false;

  if (examForm) examForm.reset();
  updateExamTotal();

  if (btnCreateAutoExam) {
    btnCreateAutoExam.textContent = "Create automatic exam";
  }
  if (btnCancelExamEdit) {
    btnCancelExamEdit.classList.add("d-none");
  }
  if (examEditHint) {
    examEditHint.classList.add("d-none");
  }
  if (examEditName) {
    examEditName.textContent = "";
  }
}

/* =========================================================
   Prüfung erstellen ODER Name aktualisieren
   ========================================================= */
async function createOrUpdateExam() {
  if (!examSubjectSel) {
    alert("No exam subject select found.");
    return;
  }

  const subjectId = parseInt(examSubjectSel.value || "0", 10);
  const name = (examNameInput?.value || "").trim() || "Automatic exam";

  const counts = {
    easy: parseInt(countEasy?.value || "0", 10) || 0,
    medium: parseInt(countMedium?.value || "0", 10) || 0,
    hard: parseInt(countHard?.value || "0", 10) || 0,
  };
  const total = counts.easy + counts.medium + counts.hard;

  const isEdit = !!currentExamEditId;

  if (!subjectId && !isEdit) {
    alert("Please select a subject.");
    return;
  }
  if (!isEdit && total <= 0) {
    alert("The total number of questions must be greater than 0.");
    return;
  }

  const url = isEdit ? "/exams/" + currentExamEditId : "/exams/auto";
  const method = isEdit ? "PUT" : "POST";

  const payload = isEdit
    ? { name, question_ids: currentExamQuestionIds }
    : { subject_id: subjectId, name, counts };

  try {
    const res = await api(url, {
      method,
      body: JSON.stringify(payload),
    });

    const txt = await safeText(res);
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      console.error("create/update exam failed:", txt);
      alert(
        "Error " +
          (isEdit ? "updating" : "creating") +
          " the exam: " +
          (data.error || "Unknown error")
      );
      return;
    }

    if (isEdit) {
      alert("Exam updated.");
      cancelExamEditMode();
    } else {
      alert("Exam created (ID: " + (data.id ?? "?") + ").");
      if (examNameInput) examNameInput.value = "";
    }

    const sidToReload = isEdit ? examSubjectSel.value : subjectId;
    if (sidToReload) await loadExams(sidToReload);
  } catch (err) {
    console.error(err);
    alert(
      "Network error while " +
        (isEdit ? "updating" : "creating") +
        " the exam."
    );
  }
}

/* =========================================================
   Prüfungs-Details anzeigen
   ========================================================= */
async function showExamDetails(id) {
  const detail = examDetailBox || $("#examDetail");
  if (!detail) return;

  detail.innerHTML = "Loading exam details …";
  detail.dataset.examId = String(id);

  try {
    const res = await api("/exams/" + id);
    if (!res.ok) {
      const txt = await safeText(res);
      console.error("load exam details failed", txt);
      detail.innerHTML =
        "<p><b>Error:</b> Failed to load exam details.</p>";
      return;
    }

    const exam = await res.json();
    console.log("exam detail:", exam);

    const questions = Array.isArray(exam.questions) ? exam.questions : [];

    if (!questions.length) {
      detail.innerHTML = `
        <p><strong>${escapeHtml(exam.name)}</strong></p>
        <p>This exam contains no questions.</p>
      `;
      return;
    }

    const questionsHtml = questions
      .map((q, idx) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const optionsHtml = opts.length
          ? `<ol class="mb-0 ms-3">
               ${opts
                 .sort((a, b) => a.idx - b.idx)
                 .map(
                   (o) =>
                     `<li>${escapeHtml(o.text)} ${
                       o.is_correct ? "✅" : ""
                     }</li>`
                 )
                 .join("")}
             </ol>`
          : "";

        return `
          <div class="border rounded p-2 mb-2">
            <div class="d-flex justify-content-between">
              <div>
                <span class="badge bg-secondary">${escapeHtml(
                  q.difficulty || ""
                )}</span>
                <span class="badge bg-info ms-1">${escapeHtml(
                  q.type || ""
                )}</span>
              </div>
              <div class="text-muted small">Nr. ${idx + 1}</div>
            </div>
            <div class="mt-1">${escapeHtml(q.text || "")}</div>
            ${optionsHtml}
          </div>
        `;
      })
      .join("");

    detail.innerHTML = `
      <p><strong>${escapeHtml(exam.name)}</strong></p>
      <p class="small text-muted mb-2">
        Fragen: ${escapeHtml(exam.question_count)} |
        Typ: ${escapeHtml(exam.mode || "")}
      </p>
      ${questionsHtml}
    `;
  } catch (err) {
    console.error(err);
    detail.innerHTML =
      "<p><b>Fehler:</b> Could not load exam details.</p>";
  }
}

/* =========================================================
   UI-Utils Fragen
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


// frontend/js/app.js

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
  const navButtons = document.querySelectorAll("[data-view]");
  const views = document.querySelectorAll(".view");

  if (!navButtons.length || !views.length) return;

  navButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.dataset.view; // "questions" oder "exams"

      // Buttons aktiv setzen
      navButtons.forEach((b) => b.classList.toggle("active", b === this));

      // Views zeigen / verstecken
      views.forEach((v) => {
        const isTarget = v.id === "view-" + target;
        v.classList.toggle("d-none", !isTarget);
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Load header, then init navigation (buttons live in header)
  loadPartial("header-placeholder", "partials/header.html", function () {
    initViewNavigation();
  });

  // Load footer
  loadPartial("footer-placeholder", "partials/footer.html");

  // Your existing initialization (if you have any) can go here:
  // initQuestions();
  // initExams();
});