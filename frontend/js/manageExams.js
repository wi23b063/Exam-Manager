/* =========================================================
   Manage Exams (complete)
   Requires:
   - helpers.js: api(), $, $$, safeText(), escapeHtml()
   - Backend endpoints:
       GET    /api/exams?subject_id=...
       GET    /api/exams/{id}
       PUT    /api/exams/{id}        { name?, question_ids: [...] }
       DELETE /api/exams/{id}
       GET    /api/questions/filter?subject_id=...&difficulty=...&type=...&q=...&limit=...&offset=...
       GET    /api/questions/{id}
   ========================================================= */

   let mxSubjectSel, mxExamList, mxExamDetail;
   let mxAddSection;


   // Pool UI
   let mxDifficulty,
     mxType,
     mxSearch,
     mxApply,
     mxReset,
     mxPrev,
     mxNext,
     mxInfo,
     mxPoolList;
   
   let mxPoolOffset = 0;
   const mxPoolLimit = 25;
   
   // State
   let mxCurrentExam = null; // exam object from GET /exams/{id}
   let mxQuestionOrder = []; // ordered list of questions in exam (objects)
   
   /* =========================================================
      Init
      ========================================================= */
   function initManageExamsView() {
     console.log("Manage Exams view initialized (complete).");
   
     mxSubjectSel = document.getElementById("mxSubject");
     mxExamList = document.getElementById("mxExamList");
     mxExamDetail = document.getElementById("mxExamDetail");
     mxAddSection = document.getElementById("mxAddSection");

   
     // Pool DOM
     mxDifficulty = document.getElementById("mxDifficulty");
     mxType = document.getElementById("mxType");
     mxSearch = document.getElementById("mxSearch");
     mxApply = document.getElementById("mxApplyFilters");
     mxReset = document.getElementById("mxResetFilters");
     mxPrev = document.getElementById("mxPrev");
     mxNext = document.getElementById("mxNext");
     mxInfo = document.getElementById("mxInfo");
     mxPoolList = document.getElementById("mxPoolList");
   
     if (!mxSubjectSel || !mxExamList || !mxExamDetail) {
       console.warn("Manage Exams: missing DOM", {
         mxSubjectSel,
         mxExamList,
         mxExamDetail,
       });
       return;
     }
   
     mxSubjectSel.addEventListener("change", () => {
       const sid = mxSubjectSel.value;
       if (sid) loadManageExams(sid);
     });
   
     // pool events (if pool exists in HTML)
     mxApply?.addEventListener("click", () => {
       mxPoolOffset = 0;
       loadManagePool();
     });
   
     mxReset?.addEventListener("click", () => {
       if (mxDifficulty) mxDifficulty.value = "";
       if (mxType) mxType.value = "";
       if (mxSearch) mxSearch.value = "";
       mxPoolOffset = 0;
       loadManagePool();
     });
   
     mxPrev?.addEventListener("click", () => {
       mxPoolOffset = Math.max(0, mxPoolOffset - mxPoolLimit);
       loadManagePool();
     });
   
     mxNext?.addEventListener("click", () => {
       mxPoolOffset += mxPoolLimit;
       loadManagePool();
     });
   
     // Event delegation for ALL manage exams buttons
     document.addEventListener("click", onManageExamsClick);
   
     // initial load if value present
     if (mxSubjectSel.value) loadManageExams(mxSubjectSel.value);
   }
   
   /* =========================================================
      Exams list
      ========================================================= */
   async function loadManageExams(subjectId) {
     mxExamList.innerHTML = "<p>Loading exams…</p>";
     mxExamDetail.innerHTML = 'Select an exam and click <b>Details</b>.';
   
     mxCurrentExam = null;
     mxQuestionOrder = [];
     mxPoolOffset = 0;

     // hide add-question section when switching subject
    if (mxAddSection) {
        mxAddSection.classList.add("d-none");
    }
  
   
     if (mxPoolList) mxPoolList.innerHTML = "";
     if (mxInfo) mxInfo.textContent = "";
   
     try {
       const res = await api("/exams?subject_id=" + encodeURIComponent(subjectId));
       if (!res.ok) throw new Error("HTTP " + res.status);
   
       const exams = await res.json();
   
       if (!Array.isArray(exams) || exams.length === 0) {
         mxExamList.innerHTML = "<p>No exams for this subject.</p>";
         return;
       }
   
       mxExamList.innerHTML = exams
         .map(
           (ex) => `
           <div class="exam-card border rounded p-2 mb-2" data-id="${ex.id}">
             <div class="d-flex justify-content-between align-items-start gap-2">
               <div>
                 <strong>${escapeHtml(ex.name)}</strong><br/>
                 <small class="text-muted">
                   Type: ${escapeHtml(ex.mode)} |
                   Questions: ${escapeHtml(ex.question_count)} |
                   Created: ${escapeHtml(ex.created_at || "")}
                 </small>
               </div>
               <div class="ms-2 d-flex gap-1">
                 <button type="button" class="btn btn-sm btn-outline-primary mx-details">
                   Details
                 </button>
                 <button type="button" class="btn btn-sm btn-outline-danger mx-del">
                   Delete
                 </button>
               </div>
             </div>
           </div>
         `
         )
         .join("");
     } catch (e) {
       console.error("Manage Exams list load failed:", e);
       mxExamList.innerHTML =
         "<p><b>Error:</b> Could not load exams. See console.</p>";
     }
   }
   
   /* =========================================================
      Click handling (delegated)
      ========================================================= */
      async function onManageExamsClick(e) {
        const btn = e.target.closest("button, [data-add-qid]");
        if (!btn) return;
      
        // ADD from pool
        const addQidAttr = btn.dataset?.addQid;
        if (addQidAttr && mxCurrentExam) {
          const qid = parseInt(addQidAttr || "0", 10);
          if (!qid) return;
          await addQuestionToExam(qid);
          return;
        }
      
        // Save changes
        if (btn.id === "mxSaveChanges") {
          await saveManageExamChanges();
          return;
        }
      
        // Clicks inside exam list cards
        const card = btn.closest(".exam-card");
        if (card) {
          const id = parseInt(card.dataset.id || "0", 10);
          if (!id) return;
      
          if (btn.classList.contains("mx-del")) {
            await onManageDeleteExam(id);
            return;
          }
      
          if (btn.classList.contains("mx-details")) {
            await showManageExamDetails(id);
            return;
          }
        }
      
        // Reorder / remove inside detail question rows
        const qItem = btn.closest("[data-qid]");
        if (qItem) {
          const qid = parseInt(qItem.dataset.qid || "0", 10);
          if (!qid) return;
      
          if (btn.classList.contains("mx-q-up")) {
            moveManageQuestion(qid, -1);
            return;
          }
          if (btn.classList.contains("mx-q-down")) {
            moveManageQuestion(qid, +1);
            return;
          }
          if (btn.classList.contains("mx-q-remove")) {
            removeQuestionFromExam(qid);
            return;
          }
        }
      }
      
   
   /* =========================================================
      Details
      ========================================================= */
      async function showManageExamDetails(id) {
        mxExamDetail.innerHTML = "Loading details…";
        mxCurrentExam = null;
        mxQuestionOrder = [];
        mxPoolOffset = 0;
      
        // hide until success
        if (mxAddSection) mxAddSection.classList.add("d-none");
      
        try {
          const res = await api("/exams/" + id);
          if (!res.ok) throw new Error("HTTP " + res.status);
      
          const exam = await res.json();
          mxCurrentExam = exam;
      
          const qs = Array.isArray(exam.questions) ? exam.questions : [];
          mxQuestionOrder = qs.slice();
      
          renderManageExamDetail();
      
          // show add-question section when details loaded
          if (mxAddSection) mxAddSection.classList.remove("d-none");
      
          loadManagePool();
        } catch (e) {
          console.error("Manage Exams details failed:", e);
          mxExamDetail.innerHTML =
            "<p><b>Error:</b> Could not load details. See console.</p>";
        }
      }
      
   
   function renderManageExamDetail() {
     if (!mxExamDetail || !mxCurrentExam) return;
   
     const exam = mxCurrentExam;
     const qs = mxQuestionOrder;
   
     const listHtml = qs.length
       ? qs
           .map(
             (q, idx) => `
           <div class="border rounded p-2 mb-2" data-qid="${q.id}">
             <div class="d-flex justify-content-between align-items-start gap-2">
               <div class="flex-grow-1">
                 <div class="small text-muted">
                   #${idx + 1} · ${escapeHtml(q.difficulty)} · ${escapeHtml(q.type)} · #${q.id}
                 </div>
                 <div>${escapeHtml(q.text)}</div>
               </div>
               <div class="d-flex flex-column gap-1">
                 <button class="btn btn-sm btn-outline-secondary mx-q-up" type="button">↑</button>
                 <button class="btn btn-sm btn-outline-secondary mx-q-down" type="button">↓</button>
                 <button class="btn btn-sm btn-outline-danger mx-q-remove" type="button">✕</button>
               </div>
             </div>
           </div>
         `
           )
           .join("")
       : `<div class="text-muted">This exam contains no questions.</div>`;
   
       mxExamDetail.innerHTML = `
       <div class="mb-2">
         <label class="form-label" for="mxExamName">Exam name</label>
         <input
           id="mxExamName"
           class="form-control"
           value="${escapeHtml(exam.name || "")}"
           placeholder="Exam name..."
         />
         <small class="text-muted">Change name and click “Save changes”.</small>
       </div>
     
       <p class="small text-muted mb-2">
         Type: ${escapeHtml(exam.mode)} |
         Questions: ${qs.length}
       </p>
     
       <div class="mb-3 d-flex align-items-center gap-2 flex-wrap">
         <button class="btn btn-sm btn-success" type="button" id="mxSaveChanges">
           Save changes
         </button>
         <small id="mxSaveMsg" class="text-muted"></small>
       </div>
     
       ${listHtml}
     `;
     
     const nameInput = document.getElementById("mxExamName");
        if (nameInput) {
        nameInput.addEventListener("input", () => {
            if (!mxCurrentExam) return;
            mxCurrentExam.name = nameInput.value;
            markUnsaved("Name changed (not saved yet)");
        });
        }

   }
   
   function markUnsaved(msgText = "Changed (not saved yet)") {
     const msg = document.getElementById("mxSaveMsg");
     if (msg) msg.textContent = msgText;
   }
   
   /* =========================================================
      Reorder / remove selected
      ========================================================= */
   function moveManageQuestion(qid, dir) {
     const idx = mxQuestionOrder.findIndex((q) => q.id === qid);
     if (idx === -1) return;
   
     const newIdx = idx + dir;
     if (newIdx < 0 || newIdx >= mxQuestionOrder.length) return;
   
     const tmp = mxQuestionOrder[idx];
     mxQuestionOrder[idx] = mxQuestionOrder[newIdx];
     mxQuestionOrder[newIdx] = tmp;
   
     renderManageExamDetail();
     markUnsaved();
   }
   
   function removeQuestionFromExam(qid) {
     mxQuestionOrder = mxQuestionOrder.filter((q) => q.id !== qid);
     renderManageExamDetail();
     loadManagePool(); // refresh pool buttons
     markUnsaved();
   }
   
   /* =========================================================
      Pool: load questions to add
      ========================================================= */
   async function loadManagePool() {
     if (!mxPoolList) return;
   
     // If pool section not in HTML, just skip silently
     if (!mxCurrentExam) {
       mxPoolList.innerHTML = "<div class='text-muted'>Select an exam to load pool.</div>";
       return;
     }
   
     mxPoolList.innerHTML = "<p class='text-muted'>Loading question pool…</p>";
   
     const params = new URLSearchParams();
     params.set("subject_id", String(mxCurrentExam.subject_id));
     if (mxDifficulty?.value) params.set("difficulty", mxDifficulty.value);
     if (mxType?.value) params.set("type", mxType.value);
     if (mxSearch?.value?.trim()) params.set("q", mxSearch.value.trim());
     params.set("limit", String(mxPoolLimit));
     params.set("offset", String(mxPoolOffset));
   
     try {
       const res = await api("/questions/filter?" + params.toString());
       if (!res.ok) throw new Error("HTTP " + res.status);
   
       const payload = await res.json();
       const items = Array.isArray(payload) ? payload : payload.data || [];
   
       renderManagePool(items);
   
       if (mxInfo) {
         mxInfo.textContent = `Showing ${items.length} (offset ${mxPoolOffset}, limit ${mxPoolLimit})`;
       }
     } catch (e) {
       console.error("Pool load failed:", e);
       mxPoolList.innerHTML =
         "<p><b>Error:</b> Could not load question pool.</p>";
     }
   }
   
   function renderManagePool(items) {
     if (!mxPoolList) return;
   
     if (!items.length) {
       mxPoolList.innerHTML = "<div class='text-muted'>No questions found.</div>";
       return;
     }
   
     const selectedSet = new Set(mxQuestionOrder.map((q) => q.id));
   
     mxPoolList.innerHTML = items
       .map((q) => {
         const already = selectedSet.has(q.id);
         return `
         <div class="border rounded p-2 mb-2 d-flex justify-content-between gap-2">
           <div>
             <div class="small text-muted">
               ${escapeHtml(q.difficulty)} · ${escapeHtml(q.type)} · #${q.id}
             </div>
             <div>${escapeHtml(q.text)}</div>
           </div>
           <div class="d-flex align-items-start">
             <button
               type="button"
               class="btn btn-sm ${already ? "btn-outline-secondary" : "btn-outline-success"}"
               data-add-qid="${q.id}"
               ${already ? "disabled" : ""}>
               +
             </button>
           </div>
         </div>
       `;
       })
       .join("");
   }
   
   /* =========================================================
      Add question to current exam (fetch full question by id)
      ========================================================= */
   async function addQuestionToExam(qid) {
     if (!mxCurrentExam) return;
   
     // prevent duplicates
     if (mxQuestionOrder.some((q) => q.id === qid)) return;
   
     try {
       const res = await api("/questions/" + qid);
       if (!res.ok) {
         const txt = await safeText(res);
         throw new Error(txt || "HTTP " + res.status);
       }
   
       const q = await res.json();
   
       // normalize minimal fields we need
       const toInsert = {
         id: q.id,
         text: q.text,
         difficulty: q.difficulty,
         type: q.type,
       };
   
       mxQuestionOrder.push(toInsert);
   
       renderManageExamDetail();
       loadManagePool();
       markUnsaved();
     } catch (e) {
       console.error(e);
       alert("Could not add question. See console.");
     }
   }
   
   /* =========================================================
      Save changes (PUT /exams/{id})
      ========================================================= */
      async function saveManageExamChanges() {
        if (!mxCurrentExam) return;
      
        const msg = document.getElementById("mxSaveMsg");
        const btn = document.getElementById("mxSaveChanges");
      
        // Validate name
        const newName = (mxCurrentExam.name || "").trim();
        if (!newName) {
          if (msg) msg.textContent = "Please enter an exam name.";
          return;
        }
      
        // Validate question_ids
        const question_ids = mxQuestionOrder.map((q) => q.id);
        if (question_ids.length === 0) {
          if (msg) msg.textContent = "Please keep at least one question in the exam.";
          return;
        }
      
        try {
          if (btn) btn.disabled = true;
          if (msg) msg.textContent = "Saving…";
      
          const res = await api("/exams/" + mxCurrentExam.id, {
            method: "PUT",
            body: JSON.stringify({
              name: newName,
              question_ids,
            }),
          });
      
          if (!res.ok) {
            const txt = await safeText(res);
            throw new Error(txt || "HTTP " + res.status);
          }
      
          // persist normalized name back to state (trimmed)
          mxCurrentExam.name = newName;
      
          if (msg) msg.textContent = "Saved";
      
          // reload exam list so the new name + question_count appear
          if (mxSubjectSel?.value) {
            await loadManageExams(mxSubjectSel.value);
          }
      
          // (optional but nice) re-open the same exam details after list reload
          // comment this out if you don't want the detail view to refresh
          await showManageExamDetails(mxCurrentExam.id);
      
          // refresh pool buttons (if the section exists)
          loadManagePool();
        } catch (e) {
          console.error(e);
          if (msg) msg.textContent = "Save failed (see console)";
        } finally {
          if (btn) btn.disabled = false;
        }
      }
      
   
   
   /* =========================================================
      Delete exam
      ========================================================= */
   async function onManageDeleteExam(id) {
     if (!confirm("Really delete exam?")) return;
   
     try {
       const res = await api("/exams/" + id, { method: "DELETE" });
   
       if (!res.ok && res.status !== 204) {
         const txt = await safeText(res);
         console.error("Delete failed:", txt);
         alert("Delete failed.");
         return;
       }
   
       // Reset details if same exam deleted
       if (mxCurrentExam && mxCurrentExam.id === id) {
         mxCurrentExam = null;
         mxQuestionOrder = [];
         mxExamDetail.innerHTML = 'Select an exam and click <b>Details</b>.';
         if (mxPoolList) mxPoolList.innerHTML = "";
         if (mxInfo) mxInfo.textContent = "";
         if (mxAddSection) mxAddSection.classList.add("d-none");

       }
   
       if (mxSubjectSel?.value) loadManageExams(mxSubjectSel.value);
     } catch (e) {
       console.error(e);
       alert("Network error while deleting exam.");
     }
   }
   