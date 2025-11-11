/* -------------------- Helpers -------------------- */
const api = (p, opts = {}) =>
  fetch("/api" + p, { headers: { "Content-Type": "application/json" }, ...opts });

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* -------------------- DOM refs -------------------- */
const subjectSel = $("#subject");
const diffSel = $("#difficulty");
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
    (saveBtn || form.querySelector('button[type="submit"]'))?.after(cancelBtn);
  }
  cancelBtn?.addEventListener("click", cancelEditMode);

  form?.addEventListener("submit", onSubmit);
  list?.addEventListener("click", onListClick);
  subjectSel?.addEventListener("change", loadQuestions);

  console.log("init OK", { hasSubject: !!subjectSel, hasForm: !!form });
  await loadSubjects();
});

/* -------------------- Subjects -------------------- */
async function loadSubjects() {
  try {
    statusMsg("Lade Fächer …");
    const res = await api("/subjects");
    if (!res.ok) throw new Error("subjects fetch failed: " + res.status);
    const subjects = await res.json();
    console.log("subjects:", subjects);

    if (!subjectSel) {
      return (list.innerHTML =
        '<p><b>Fehler:</b> <code>#subject</code> nicht gefunden.</p>');
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
    list.innerHTML =
      "<p><b>Fehler:</b> Konnte Fächer nicht laden. Siehe Console.</p>";
  }
}

/* -------------------- Questions -------------------- */
async function loadQuestions() {
  const sid = subjectSel?.value;
  if (!sid) {
    list.innerHTML = "<p>Kein Fach gewählt.</p>";
    return;
  }
  try {
    statusMsg("Lade Fragen …");
    const res = await api(`/questions?subject_id=${encodeURIComponent(sid)}`);
    if (!res.ok) throw new Error("questions fetch failed: " + res.status);
    const items = await res.json();
    console.log("questions:", items);

    list.innerHTML = items.length
      ? items
          .map(
            (q) => `
      <div class="q" data-id="${q.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
          <div><span class="badge">${escapeHtml(q.difficulty)}</span> ${escapeHtml(q.text)}</div>
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
    list.innerHTML =
      "<p><b>Fehler:</b> Konnte Fragen nicht laden. Siehe Console.</p>";
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
    const r = await api(`/questions/${id}`, { method: "DELETE" });
    if (!r.ok) return alert("Löschen fehlgeschlagen");
    if (currentEditId === id) cancelEditMode();
    return loadQuestions();
  }

  // Bearbeiten
  if (btn.classList.contains("edit")) {
    const r = await api(`/questions/${id}`);
    if (!r.ok) return alert("Konnte Frage nicht laden");
    const q = await r.json();

    subjectSel.value = q.subject_id;
    diffSel.value = q.difficulty;
    qtext.value = q.text;

    const inputs = $$(".opt");
    const radios = $$('input[name="correct"]');

    q.options
      .sort((a, b) => a.idx - b.idx)
      .forEach((o, i) => {
        if (inputs[i]) inputs[i].value = o.text;
        if (radios[i]) radios[i].checked = !!o.is_correct;
      });

    currentEditId = q.id;
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/* -------------------- Submit (create/update) -------------------- */
async function onSubmit(e) {
  e.preventDefault();

  const sid = parseInt(subjectSel.value, 10);
  const text = qtext.value.trim();
  const diff = diffSel.value;

  const optInputs = $$(".opt");
  const opts = optInputs.map((i) => i.value.trim());
  const correct = parseInt(new FormData(form).get("correct"), 10);

  // einfache Validierung
  if (!text || opts.some((t) => t === "") || Number.isNaN(correct)) {
    alert(
      "Bitte Fragetext, alle 4 Optionen ausfüllen und genau eine korrekte Option wählen."
    );
    return;
  }

  const payload = {
    subject_id: sid,
    text,
    difficulty: diff,
    options: opts.map((t, i) => ({ text: t, is_correct: i === correct })),
  };

  toggleSaving(true);

  const res = await api(
    currentEditId ? `/questions/${currentEditId}` : "/questions",
    {
      method: currentEditId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }
  );

  toggleSaving(false);

  if (!res.ok) {
    console.error("save failed", await safeText(res));
    return alert("Speichern fehlgeschlagen.");
  }

  form.reset();
  optInputs.forEach((i) => (i.value = ""));
  setEditMode(false);
  await loadQuestions();
}

/* -------------------- UI utils -------------------- */
function setEditMode(on) {
  const btn = saveBtn || form.querySelector('button[type="submit"]');
  if (btn) btn.textContent = on ? "Änderungen speichern" : "Speichern";
  if (cancelBtn) cancelBtn.style.display = on ? "inline-block" : "none";
  if (!on) currentEditId = null;
}

function cancelEditMode() {
  form.reset();
  $$(".opt").forEach((i) => (i.value = ""));
  setEditMode(false);
}

function toggleSaving(isSaving) {
  const btn = saveBtn || form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = isSaving;
  btn.textContent = isSaving
    ? currentEditId
      ? "Speichere …"
      : "Speichere …"
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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
