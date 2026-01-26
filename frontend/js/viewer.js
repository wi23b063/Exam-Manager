function initViewerView() {
  loadViewerSubjects();
}

async function loadViewerSubjects() {
  const subjects = await apiJson("/subjects");

  const opts = subjects
    .map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");

  $("#viewerExamSubject").innerHTML = opts;
  $("#viewerQuestionSubject").innerHTML = opts;

  $("#viewerExamSubject").addEventListener("change", loadViewerExams);
  $("#viewerQuestionSubject").addEventListener("change", loadViewerQuestions);

  if (subjects[0]) {
    $("#viewerExamSubject").value = subjects[0].id;
    $("#viewerQuestionSubject").value = subjects[0].id;
    loadViewerExams();
    loadViewerQuestions();
  }
}

async function loadViewerExams() {
  const sid = $("#viewerExamSubject").value;
  const exams = await apiJson(`/exams?subject_id=${sid}`);

  $("#viewerExamList").innerHTML = exams.length
    ? exams.map(e => `
      <div class="border rounded p-2 mb-2">
        <strong>${escapeHtml(e.name)}</strong><br>
        <small>Questions: ${e.question_count}</small>
      </div>
    `).join("")
    : "<p>No exams.</p>";
}

async function loadViewerQuestions() {
  const sid = $("#viewerQuestionSubject").value;
  const qs = await apiJson(`/questions?subject_id=${sid}`);

  $("#viewerQuestionList").innerHTML = qs.length
    ? qs.map(q => `
      <div class="border rounded p-2 mb-2">
        <span class="badge bg-secondary">${q.difficulty}</span>
        <span class="badge bg-info ms-1">${q.type}</span><br>
        ${escapeHtml(q.text)}
      </div>
    `).join("")
    : "<p>No questions.</p>";
}