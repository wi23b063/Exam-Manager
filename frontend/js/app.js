/* -------------------- Helpers -------------------- */
const api = (p, opts = {}) =>
  fetch("/api" + p, { headers: { "Content-Type": "application/json" }, ...opts });

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* -------------------- DOM refs -------------------- */
const subjectSel = $("#subject");
const diffSel = $("#difficulty");
const typeSel = $("#qtype");
const qtext = $("#qtext");
const list = $("#questionList");
const form = $("#qForm");
const saveBtn = $("#saveBtn");
let cancelBtn = $("#cancelEdit");

/* -------------------- State -------------------- */
let currentEditId = null;

/* -------------------- Init -------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Cancel-Button ggf. erzeugen
  if (!cancelBtn && form) {
    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.id = "cancelEdit";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.style.marginLeft = ".5rem";
    cancelBtn.style.display = "none";
    const submitBtn = saveBtn || form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.after(cancelBtn);
    }
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelEditMode);
  }

  if (form) {
    form.addEventListener("submit", onSubmit);
  }
  if (list) {
    list.addEventListener("click", onListClick);
  }
  if (subjectSel) {
    subjectSel.addEventListener("change", loadQuestions);
  }
  if (typeSel) {
    typeSel.addEventListener("change", updateEditorVisibility);
  }

  console.log("init OK", {
    hasSubject: !!subjectSel,
    hasForm: !!form,
    hasType: !!typeSel,
  });

  updateEditorVisibility();
  await loadSubjects();
});

/* -------------------- Editor Visibility -------------------- */
function updateEditorVisibility() {
  const t = typeSel ? typeSel.value : "SCQ";
  const editors = $$(".q-editor");
  console.log("updateEditorVisibility", t, "editors:", editors.length);

  editors.forEach(function (el) {
    if (el.dataset.editor === t) {
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  });
}

/* -------------------- Subjects -------------------- */
async function loadSubjects() {
  try {
    statusMsg("Lade Fächer …");
    const res = await api("/subjects");
    if (!res.ok) throw new Error("subjects fetch failed: " + res.status);
    const subjects = await res.json();
    console.log("subjects:", subjects);

    if (!subjectSel) {
      list.innerHTML =
        '<p><b>Fehler:</b> <code>#subject</code> nicht gefunden.</p>';
      return;
    }

    subjectSel.innerHTML = subjects
      .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
      .join("");

    if (subjects.length === 0) {
      list.innerHTML = "<p>Noch keine Fächer. Lege zuerst eines an.</p>";
      return;
    }
    await loadQuestions();
  } catch (e) {
    console.error(e);
    if (list) {
      list.innerHTML =
        "<p><b>Fehler:</b> Konnte Fächer nicht laden. Siehe Console.</p>";
    }
  }
}

/* -------------------- Questions -------------------- */
async function loadQuestions() {
  if (!subjectSel) return;
  const sid = subjectSel.value;
  if (!sid) {
    if (list) list.innerHTML = "<p>Kein Fach gewählt.</p>";
    return;
  }
  try {
    statusMsg("Lade Fragen …");
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
            <span class="badge">${escapeHtml(q.difficulty)}</span>
            <span class="badge" style="margin-left:.25rem;">${escapeHtml(
              q.type || "SCQ"
            )}</span>
            ${escapeHtml(q.text)}
          </div>
          <div>
            <button class="edit" type="button">Bearbeiten</button>
            <button class="del"  type="button">Löschen</button>
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
      : "<p>Keine Fragen im gewählten Fach.</p>";
  } catch (e) {
    console.error(e);
    if (list) {
      list.innerHTML =
        "<p><b>Fehler:</b> Konnte Fragen nicht laden. Siehe Console.</p>";
    }
  }
}

/* -------------------- List handlers -------------------- */
async function onListClick(e) {
  const btn = e.target;
  const card = btn.closest(".q");
  if (!card) return;
  const id = Number(card.dataset.id);

  // Löschen
  if (btn.classList.contains("del")) {
    if (!confirm("Frage wirklich löschen?")) return;
    const r = await api("/questions/" + id, { method: "DELETE" });
    if (!r.ok) return alert("Löschen fehlgeschlagen");
    if (currentEditId === id) cancelEditMode();
    return loadQuestions();
  }

  // Bearbeiten
  if (btn.classList.contains("edit")) {
    const r = await api("/questions/" + id);
    if (!r.ok) return alert("Konnte Frage nicht laden");
    const q = await r.json();

    if (subjectSel) subjectSel.value = q.subject_id;
    if (diffSel) diffSel.value = q.difficulty;
    if (qtext) qtext.value = q.text;

    // Typ setzen
    if (typeSel) {
      if (q.type) typeSel.value = q.type;
      else typeSel.value = "SCQ";
    }
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
    } else {
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

/* -------------------- Submit (create/update) -------------------- */
async function onSubmit(e) {
  e.preventDefault();

  if (!subjectSel || !qtext || !diffSel || !typeSel) {
    alert("Formular nicht vollständig initialisiert.");
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
        "Bitte Fragetext, alle 4 Optionen ausfüllen und genau eine korrekte Option wählen."
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
      alert("Bitte Fragetext und alle 4 Optionen ausfüllen.");
      return;
    }
    if (correctValues.length === 0) {
      alert("Bitte mindestens eine korrekte Option wählen.");
      return;
    }

    options = opts.map((t, i) => ({
      text: t,
      is_correct: correctValues.includes(i),
    }));
  } else {
    alert("Unsupported question type im Frontend: " + type);
    return;
  }

  const payload = {
    subject_id: sid,
    text,
    difficulty: diff,
    type: type,
    options: options,
  };

  toggleSaving(true);

  const url = currentEditId
    ? "/questions/" + currentEditId
    : "/questions";
  const method = currentEditId ? "PUT" : "POST";

  const res = await api(url, {
    method: method,
    body: JSON.stringify(payload),
  });

  toggleSaving(false);

  if (!res.ok) {
    console.error("save failed", await safeText(res));
    return alert("Speichern fehlgeschlagen.");
  }

  if (form) form.reset();
  setEditMode(false);
  updateEditorVisibility();
  await loadQuestions();
}

/* -------------------- UI utils -------------------- */
function setEditMode(on) {
  const btn = saveBtn || (form && form.querySelector('button[type="submit"]'));
  if (btn) btn.textContent = on ? "Änderungen speichern" : "Speichern";
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
    ? "Speichere …"
    : currentEditId
    ? "Änderungen speichern"
    : "Speichern";
}

function statusMsg(msg) {
  if (!list) return;
  list.innerHTML = `<p style="opacity:.8">${escapeHtml(msg)}</p>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
