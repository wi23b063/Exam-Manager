/* =========================================================
   DOM Refs (Exams) – will be assigned later
   ========================================================= */

let examForm,
  examSubjectSel,
  examNameInput,
  examList,
  countEasy,
  countMedium,
  countHard,
  examTotalSpan,
  btnCreateAutoExam,
  btnCancelExamEdit,
  examEditHint,
  examEditName,
  examDetailBox;

/* =========================================================
   State (Exams)
   ========================================================= */
let currentExamEditId = null;
let currentExamQuestionIds = [];

/* =========================================================
   Init: Exams view
   ========================================================= */
function initExamView() {
  examForm = $("#examForm");
  examSubjectSel = $("#examSubject");
  examNameInput = $("#examName");
  examList = $("#examList");
  countEasy = $("#countEasy");
  countMedium = $("#countMedium");
  countHard = $("#countHard");
  examTotalSpan = $("#examTotal");
  btnCreateAutoExam = $("#btnCreateAutoExam");
  btnCancelExamEdit = $("#btnCancelExamEdit");
  examEditHint = $("#examEditHint");
  examEditName = $("#examEditName");
  examDetailBox = $("#examDetail");

  if (!examForm) {
    console.warn("Exam view not found (initExamView).");
    return;
  }

  setupExamView();

  console.log("Exam view initialized.", {
    hasExamSubject: !!examSubjectSel,
    hasExamForm: !!examForm,
  });
}

/* =========================================================
   Exams: basic setup
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
      'Select an exam below and click on "Details" to view the questions.';
  }
}

function updateExamTotal() {
  const e = parseInt(countEasy?.value || "0", 10) || 0;
  const m = parseInt(countMedium?.value || "0", 10) || 0;
  const h = parseInt(countHard?.value || "0", 10) || 0;
  if (examTotalSpan) examTotalSpan.textContent = e + m + h;
}

/* =========================================================
   Exams: load
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
   Exams: list click handlers
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
      if (
        examDetailBox &&
        parseInt(examDetailBox.dataset.examId || "0", 10) === id
      ) {
        examDetailBox.innerHTML =
          'Select an exam below and click on "Details" to view the questions.';
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
   Exams: edit / cancel / save
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
   Exams: create or update
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
   Exams: details
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