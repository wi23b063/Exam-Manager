// frontend/js/manualExams.js

(() => {
  const SUBJECTS_ENDPOINT = "/api/subjects";
  const QUESTIONS_FILTER_ENDPOINT = "/api/questions/filter";
  const CREATE_MANUAL_EXAM_ENDPOINT = "/api/exams/manual";

  let offset = 0;
  const limit = 25;

  // selected questions map: id -> question object (in insertion order)
  const selected = new Map();

  // ------- DOM -------
  const el = (id) => document.getElementById(id);
  function viewRoot() { return el("view-manual-exams"); }

  function els() {
    return {
      subject: el("meSubject"),
      difficulty: el("meDifficulty"),
      type: el("meType"),
      search: el("meSearch"),
      apply: el("meApplyFilters"),
      reset: el("meResetFilters"),
      prev: el("mePrev"),
      next: el("meNext"),
      list: el("meQuestionList"),
      info: el("meInfo"),

      examName: el("meExamName"),
      selectedList: el("meSelectedList"),
      clear: el("meClearSelected"),
      create: el("meCreateExam"),
      createMsg: el("meCreateMsg"),
    };
  }

  // ------- Helpers: API wrappers -------
  async function apiGET(url) {
    if (typeof window.apiGet === "function") return window.apiGet(url);
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    return await r.json();
  }

  async function apiPOST(url, data) {
    if (typeof window.apiPost === "function") return window.apiPost(url, data);
    const r = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return await r.json();
  }

  // ------- View init hook (called from main.js) -------
  window.initManualExamsView = async function initManualExamsView() {
    const r = viewRoot();
    if (!r) return; // partial not loaded yet

    const $ = els();

    // prevent double binding
    if (r.dataset.bound === "1") return;
    r.dataset.bound = "1";

    // Events
    $.apply?.addEventListener("click", async () => {
      offset = 0;
      await loadQuestions();
    });

    $.reset?.addEventListener("click", async () => {
      $.difficulty.value = "";
      $.type.value = "";
      $.search.value = "";
      offset = 0;
      await loadQuestions();
    });

    $.prev?.addEventListener("click", async () => {
      offset = Math.max(0, offset - limit);
      await loadQuestions();
    });

    $.next?.addEventListener("click", async () => {
      offset = offset + limit;
      await loadQuestions();
    });

    $.clear?.addEventListener("click", () => {
      selected.clear();
      renderSelected();
      // left-side checkboxes are re-synced next time list renders
    });

    // When subject changes, reload questions for that subject
    $.subject?.addEventListener("change", async () => {
      offset = 0;
      await loadQuestions();
    });

    // Create manual exam -> CALL BACKEND
    $.create?.addEventListener("click", async () => {
      const subject_id = parseInt($.subject.value || "0", 10);
      const name = $.examName.value.trim();
      const question_ids = Array.from(selected.keys()); // keeps UI order

      if (!subject_id) {
        $.createMsg.textContent = "Please select a subject.";
        $.createMsg.className = "mt-2 small text-danger";
        return;
      }

      if (!name) {
        $.createMsg.textContent = "Please enter an exam name.";
        $.createMsg.className = "mt-2 small text-danger";
        return;
      }

      if (question_ids.length === 0) {
        $.createMsg.textContent = "Please select at least one question.";
        $.createMsg.className = "mt-2 small text-danger";
        return;
      }

      $.create.disabled = true;
      $.createMsg.textContent = "Saving...";
      $.createMsg.className = "mt-2 small text-muted";

      try {
        const payload = { subject_id, name, question_ids };
        await apiPOST(CREATE_MANUAL_EXAM_ENDPOINT, payload);

        $.createMsg.textContent = "Manual exam created successfully.";
        $.createMsg.className = "mt-2 small text-success";

        // Reset UI
        selected.clear();
        renderSelected();
        $.examName.value = "";

        // reload questions (so checkboxes reset)
        offset = 0;
        await loadQuestions();
      } catch (e) {
        console.error(e);
        $.createMsg.textContent =
          "Error creating manual exam. Open DevTools > Network to see details.";
        $.createMsg.className = "mt-2 small text-danger";
      } finally {
        $.create.disabled = false;
      }
    });

    // Load initial data
    await loadSubjects();
    offset = 0;
    await loadQuestions();
  };

  async function loadSubjects() {
    const $ = els();
    if (!$.subject) return;

    $.subject.innerHTML = "";

    const subjects = await apiGET(SUBJECTS_ENDPOINT);

    // subjects can be array OR {data:[...]}
    const list = Array.isArray(subjects) ? subjects : (subjects.data ?? subjects.subjects ?? []);
    if (!list.length) {
      $.subject.innerHTML = `<option value="">No subjects</option>`;
      return;
    }

    for (const s of list) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      $.subject.appendChild(opt);
    }
  }

  async function loadQuestions() {
    const $ = els();
    if (!$.list) return;

    const params = new URLSearchParams();
    const subjectId = parseInt($.subject.value || "0", 10);

    if (subjectId > 0) params.set("subject_id", String(subjectId));
    if ($.difficulty.value) params.set("difficulty", $.difficulty.value);
    if ($.type.value) params.set("type", $.type.value);
    if ($.search.value.trim()) params.set("q", $.search.value.trim());

    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const res = await apiGET(`${QUESTIONS_FILTER_ENDPOINT}?${params.toString()}`);

    const data = Array.isArray(res) ? res : (res.data ?? res.questions ?? []);
    renderQuestions(data);

    if ($.info) {
      $.info.textContent = `Showing ${data.length} questions (offset ${offset}, limit ${limit})`;
    }
  }

  function renderQuestions(questions) {
    const $ = els();
    $.list.innerHTML = "";

    if (!questions.length) {
      $.list.innerHTML = `<div class="text-muted p-2">No questions found.</div>`;
      return;
    }

    for (const q of questions) {
      const id = q.id;
      const isSelected = selected.has(id);

      const item = document.createElement("label");
      item.className = "list-group-item d-flex gap-2 align-items-start";

      item.innerHTML = `
        <input class="form-check-input mt-1" type="checkbox" ${isSelected ? "checked" : ""} />
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between gap-2">
            <strong>#${id}</strong>
            <span class="badge bg-secondary">${escapeHtml(q.type)}</span>
          </div>
          <div class="small text-muted mb-1">${escapeHtml(q.difficulty)}</div>
          <div>${escapeHtml(q.text)}</div>
        </div>
      `;

      const checkbox = item.querySelector("input[type=checkbox]");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selected.set(id, q);
        } else {
          selected.delete(id);
        }
        renderSelected();
      });

      $.list.appendChild(item);
    }
  }

  function renderSelected() {
    const $ = els();
    $.selectedList.innerHTML = "";

    if (selected.size === 0) {
      $.selectedList.innerHTML = `<div class="text-muted p-2">No selected questions.</div>`;
      return;
    }

    for (const [id, q] of selected.entries()) {
      const item = document.createElement("div");
      item.className = "list-group-item";

      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <strong>#${id}</strong> <span class="badge bg-secondary">${escapeHtml(q.type)}</span>
            <div class="small text-muted">${escapeHtml(q.difficulty)}</div>
            <div class="small">${escapeHtml(q.text)}</div>
          </div>
          <div class="d-flex flex-column gap-1">
            <button class="btn btn-sm btn-outline-secondary" type="button" data-action="up">↑</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" data-action="down">↓</button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-action="remove">✕</button>
          </div>
        </div>
      `;

      item.querySelector('[data-action="remove"]').addEventListener("click", () => {
        selected.delete(id);
        renderSelected();
      });

      item.querySelector('[data-action="up"]').addEventListener("click", () => moveSelected(id, -1));
      item.querySelector('[data-action="down"]').addEventListener("click", () => moveSelected(id, +1));

      $.selectedList.appendChild(item);
    }
  }

  function moveSelected(id, dir) {
    const keys = Array.from(selected.keys());
    const idx = keys.indexOf(id);
    if (idx === -1) return;

    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= keys.length) return;

    // swap keys
    const tmp = keys[idx];
    keys[idx] = keys[newIdx];
    keys[newIdx] = tmp;

    // rebuild map in new order
    const entries = keys.map((k) => [k, selected.get(k)]);
    selected.clear();
    for (const [k, v] of entries) selected.set(k, v);

    renderSelected();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
