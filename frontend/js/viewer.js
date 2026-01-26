function initViewerView() {
  loadViewerSubjects();
}

async function loadViewerSubjects() {
  const subjects = await apiJson("/subjects");

  const opts = subjects
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");

  const exSel = document.getElementById("viewerExamSubject");
  const qSel = document.getElementById("viewerQuestionSubject");

  if (exSel) exSel.innerHTML = opts;
  if (qSel) qSel.innerHTML = opts;

  exSel?.addEventListener("change", loadViewerExams);
  qSel?.addEventListener("change", loadViewerQuestions);

  if (subjects[0]) {
    if (exSel) exSel.value = subjects[0].id;
    if (qSel) qSel.value = subjects[0].id;

    loadViewerExams();
    loadViewerQuestions();
  }
}

/* =========================================================
   Exams list + details
   ========================================================= */

async function loadViewerExams() {
  const sid = document.getElementById("viewerExamSubject")?.value;
  const listEl = document.getElementById("viewerExamList");
  const detailEl = document.getElementById("viewerExamDetail");

  if (!listEl) return;

  listEl.innerHTML = `<div class="text-muted">Loading exams…</div>`;
  if (detailEl) {
    detailEl.innerHTML = `Select an exam to see its questions.`;
    detailEl.dataset.examId = "";
  }

  try {
    const exams = await apiJson(`/exams?subject_id=${encodeURIComponent(sid)}`);

    if (!Array.isArray(exams) || exams.length === 0) {
      listEl.innerHTML = `<div class="text-muted">No exams.</div>`;
      return;
    }

    listEl.innerHTML = exams
      .map(
        (e) => `
        <div class="border rounded p-2 mb-2 d-flex justify-content-between align-items-start gap-2"
             data-exam-id="${e.id}">
          <div>
            <strong>${escapeHtml(e.name)}</strong><br/>
            <small class="text-muted">
              Questions: ${escapeHtml(e.question_count ?? "")}
            </small>
          </div>
          <div>
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="exam-details">
              Details
            </button>
          </div>
        </div>
      `
      )
      .join("");

    // delegated click for details buttons
    listEl.onclick = async (evt) => {
      const btn = evt.target.closest("button[data-action='exam-details']");
      if (!btn) return;

      const row = btn.closest("[data-exam-id]");
      if (!row) return;

      const id = row.dataset.examId;
      if (!id) return;

      await showViewerExamDetails(id);

      // optional: mark selected
      listEl.querySelectorAll("[data-exam-id]").forEach((r) => r.classList.remove("bg-light"));
      row.classList.add("bg-light");
    };
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="text-danger">Failed to load exams.</div>`;
  }
}

async function showViewerExamDetails(examId) {
  const detailEl = document.getElementById("viewerExamDetail");
  if (!detailEl) return;

  detailEl.innerHTML = `<div class="text-muted">Loading exam details…</div>`;
  detailEl.dataset.examId = String(examId);

  try {
    const exam = await apiJson(`/exams/${encodeURIComponent(examId)}`);
    const questions = Array.isArray(exam.questions) ? exam.questions : [];

    if (!questions.length) {
      detailEl.innerHTML = `
        <div>
          <strong>${escapeHtml(exam.name || "")}</strong>
          <div class="text-muted">This exam has no questions.</div>
        </div>
      `;
      return;
    }

    const questionsHtml = questions
      .map((q, idx) => {
        const opts = Array.isArray(q.options) ? q.options.slice().sort((a,b)=>a.idx-b.idx) : [];
        const optionsHtml = opts.length
          ? `<ol class="mb-0 ms-3">
              ${opts.map(o => `<li>${escapeHtml(o.text)} ${o.is_correct ? "✅" : ""}</li>`).join("")}
             </ol>`
          : "";

        return `
          <div class="border rounded p-2 mb-2">
            <div class="d-flex justify-content-between">
              <div>
                <span class="badge bg-secondary">${escapeHtml(q.difficulty || "")}</span>
                <span class="badge bg-info ms-1">${escapeHtml(q.type || "")}</span>
              </div>
              <div class="text-muted small">#${idx + 1}</div>
            </div>
            <div class="mt-1">${escapeHtml(q.text || "")}</div>
            ${optionsHtml}
          </div>
        `;
      })
      .join("");

    detailEl.innerHTML = `
      <div class="mb-2">
        <strong>${escapeHtml(exam.name || "")}</strong>
        <div class="text-muted small">
          Questions: ${escapeHtml(exam.question_count ?? questions.length)}
          ${exam.mode ? `| Type: ${escapeHtml(exam.mode)}` : ""}
        </div>
      </div>
      ${questionsHtml}
    `;
  } catch (err) {
    console.error(err);
    detailEl.innerHTML = `<div class="text-danger">Could not load exam details.</div>`;
  }
}

/* =========================================================
   Questions (by subject) – unchanged
   ========================================================= */

async function loadViewerQuestions() {
  const sid = document.getElementById("viewerQuestionSubject")?.value;
  const listEl = document.getElementById("viewerQuestionList");
  if (!listEl) return;

  listEl.innerHTML = `<div class="text-muted">Loading questions…</div>`;

  try {
    const qs = await apiJson(`/questions?subject_id=${encodeURIComponent(sid)}`);

    listEl.innerHTML = Array.isArray(qs) && qs.length
      ? qs
          .map(
            (q) => `
        <div class="border rounded p-2 mb-2">
          <span class="badge bg-secondary">${escapeHtml(q.difficulty)}</span>
          <span class="badge bg-info ms-1">${escapeHtml(q.type || "")}</span><br/>
          ${escapeHtml(q.text)}
        </div>
      `
          )
          .join("")
      : "<div class='text-muted'>No questions.</div>";
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="text-danger">Failed to load questions.</div>`;
  }
}