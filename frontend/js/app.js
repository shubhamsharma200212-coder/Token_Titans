/**
 * CareerMatch AI — Pure Vanilla JavaScript Frontend Controller
 * Communicates with the Python FastAPI + SQLite + Google Gemini Backend via Fetch API.
 */

(function () {
  "use strict";

  // Application State
  const state = {
    roles: [],
    demos: [],
    dashboard: null,
    currentResume: null,
    selectedRoleTitle: "Full Stack Developer",
    goalCompany: "",
    jobUrl: "",
    customJdText: "",
    showPasteResume: false,
    report: null,
    selectedNodeId: "",
    completedNodeIds: {},
    courseFilter: "ALL",
    simSelectedSkills: [],
    sampleJdText: "",
  };

  // XSS & URL Sanitization Helpers
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    try {
      const parsed = new URL(String(url || "").trim());
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.href;
      }
      return "#";
    } catch (_err) {
      return "#";
    }
  }

  // DOM Lookup Helper
  function $(id) {
    return document.getElementById(id);
  }

  // Initialize Application
  async function initApp() {
    bindStaticEvents();
    try {
      const resp = await fetch("/api/bootstrap");
      if (!resp.ok) throw new Error("Failed to load initial data");
      const data = await resp.json();

      state.roles = data.roles || [];
      state.demos = data.demos || [];
      state.dashboard = data.dashboard || null;
      state.sampleJdText = data.sampleJdText || "";

      renderRoleSelects();
      renderDemoButtons();
      renderDashboard();
    } catch (err) {
      console.error("Bootstrap error:", err);
    }
  }

  function bindStaticEvents() {
    // Mobile Menu Drawer
    const mobileBtn = $("mobileMenuBtn");
    const mobileDrawer = $("mobileDrawer");
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener("click", () => {
        mobileDrawer.classList.toggle("open");
      });
      mobileDrawer.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => mobileDrawer.classList.remove("open"));
      });
    }

    // Expandable SQLite History Card
    const toggleHistoryBtn = $("toggleHistoryBtn");
    if (toggleHistoryBtn) {
      toggleHistoryBtn.addEventListener("click", () => {
        const card = $("historyExpandCard");
        const body = $("historyExpandBody");
        card.classList.toggle("is-expanded");
        body.classList.toggle("hidden");
      });
    }

    // Toggle Paste Resume vs File Upload
    const togglePasteBtn = $("togglePasteBtn");
    if (togglePasteBtn) {
      togglePasteBtn.addEventListener("click", () => {
        state.showPasteResume = !state.showPasteResume;
        $("uploadZone").classList.toggle("hidden", state.showPasteResume);
        $("pastedResumeInput").classList.toggle("hidden", !state.showPasteResume);
        togglePasteBtn.textContent = state.showPasteResume
          ? "Upload file instead"
          : "Or paste resume text";
      });
    }

    // File Upload & Drag-and-Drop
    const fileInput = $("resumeFileInput");
    const uploadZone = $("uploadZone");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleFileUpload(file);
      });
    }
    if (uploadZone) {
      uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("drag-active");
      });
      uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("drag-active");
      });
      uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("drag-active");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
      });
    }

    // Live Preview Sync on Role & Company Inputs
    $("roleSelect").addEventListener("change", (e) => {
      state.selectedRoleTitle = e.target.value;
      $("previewRoleName").textContent = state.selectedRoleTitle;
    });

    $("goalCompanyInput").addEventListener("input", (e) => {
      state.goalCompany = e.target.value.trim();
      $("previewCompanyName").textContent = state.goalCompany || "Industry Benchmark";
    });

    // Submit Analyzer Form
    $("analyzerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      await runCareerAnalysis();
    });

    // Spotlight Quick Role Switcher
    $("spotRoleSwitcher").addEventListener("change", async (e) => {
      state.selectedRoleTitle = e.target.value;
      $("roleSelect").value = state.selectedRoleTitle;
      $("previewRoleName").textContent = state.selectedRoleTitle;
      await runCareerAnalysis();
    });

    // Spotlight Goal Company Inline Editor
    $("toggleEditCompanyBtn").addEventListener("click", () => {
      const box = $("spotCompanyEditBox");
      const isHidden = box.classList.contains("hidden");
      if (isHidden) {
        box.classList.remove("hidden");
        $("spotCompanyInput").value = state.goalCompany;
        $("spotCompanyInput").focus();
        $("toggleEditCompanyBtn").textContent = "Save";
      } else {
        state.goalCompany = $("spotCompanyInput").value.trim();
        $("goalCompanyInput").value = state.goalCompany;
        $("previewCompanyName").textContent = state.goalCompany || "Industry Benchmark";
        box.classList.add("hidden");
        $("toggleEditCompanyBtn").textContent = "Change";
        runCareerAnalysis();
      }
    });

    document.querySelectorAll(".company-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const company = btn.getAttribute("data-company") || "";
        state.goalCompany = company;
        $("goalCompanyInput").value = company;
        $("spotCompanyInput").value = company;
        $("previewCompanyName").textContent = company;
        $("spotCompanyEditBox").classList.add("hidden");
        $("toggleEditCompanyBtn").textContent = "Change";
        runCareerAnalysis();
      });
    });

    // Jump to Edit Skills Tab
    $("jumpEditSkillsBtn").addEventListener("click", () => {
      switchTab("tab-skills");
    });

    // Main Report Tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        if (tabId) switchTab(tabId);
      });
    });

    // Course Filter Buttons (All / Free / Paid)
    document.querySelectorAll("#courseFilterBar button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#courseFilterBar button")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.courseFilter = btn.getAttribute("data-filter") || "ALL";
        renderCoursesAndWebsites();
      });
    });

    // Custom Gemini Course Search
    $("customCourseForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const query = $("customCourseInput").value.trim();
      await runCareerAnalysis(query, false);
    });

    // Add Skill Form (SQLite Skill Editor)
    $("addSkillForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("newSkillInput");
      const val = input.value.trim();
      if (!val || !state.currentResume) return;

      const updatedSkills = Array.from(
        new Set([...(state.currentResume.technicalSkills || []), val])
      );
      input.value = "";
      await updateCandidateSkills(updatedSkills);
    });

    // Toggle Raw Resume Text
    $("toggleRawTextBtn").addEventListener("click", () => {
      $("rawTextExpandCard").classList.toggle("is-expanded");
      $("rawTextExpandBody").classList.toggle("hidden");
    });

    // Quick-fill Sample Data Engineer JD
    const loadSampleJdBtn = $("loadSampleJdBtn");
    if (loadSampleJdBtn) {
      loadSampleJdBtn.addEventListener("click", () => {
        if (state.sampleJdText) {
          $("customJdInput").value = state.sampleJdText;
          $("customJdInput").rows = 5;
          $("roleSelect").value = "Data Engineer";
          state.selectedRoleTitle = "Data Engineer";
          $("previewRoleName").textContent = "Data Engineer";
          $("goalCompanyInput").value = "CloudPulse Technologies";
          state.goalCompany = "CloudPulse Technologies";
          $("previewCompanyName").textContent = "CloudPulse Technologies";
          $("uploadStatusMsg").textContent = "✓ Loaded sample Data Engineer JD (Mandatory, Preferred & Optional tiers)";
        }
      });
    }

    // Download JSON Report
    const downloadJsonBtn = $("downloadJsonReportBtn");
    if (downloadJsonBtn) {
      downloadJsonBtn.addEventListener("click", () => {
        if (!state.report) return;
        const rawJson = JSON.stringify(state.report, null, 2);
        const blob = new Blob([rawJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeName = ((state.currentResume && state.currentResume.contact && state.currentResume.contact.name) || "Candidate").replace(/\s+/g, "_");
        a.href = url;
        a.download = `CareerMatch_Report_${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }

  function switchTab(targetTabId) {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tab") === targetTabId);
    });
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.classList.toggle("hidden", pane.id !== targetTabId);
    });
  }

  // Render Role Select Dropdowns
  function renderRoleSelects() {
    const html = state.roles
      .map(
        (r) =>
          `<option value="${escapeHtml(r.title)}" ${
            r.title === state.selectedRoleTitle ? "selected" : ""
          }>${escapeHtml(r.title)}</option>`
      )
      .join("");
    $("roleSelect").innerHTML = html;
    $("spotRoleSwitcher").innerHTML = html;
  }

  // Render Optional Demo Profile Buttons
  function renderDemoButtons() {
    const container = $("demoButtonsContainer");
    if (!container) return;

    container.innerHTML = state.demos
      .map(
        (demo) =>
          `<button type="button" class="demo-btn ${
            state.currentResume && state.currentResume.id === demo.id ? "active" : ""
          }" data-demo-id="${escapeHtml(demo.id)}">${escapeHtml(
            demo.contact.name
          )}</button>`
      )
      .join("");

    container.querySelectorAll("button[data-demo-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const demoId = btn.getAttribute("data-demo-id");
        const found = state.demos.find((d) => d.id === demoId);
        if (!found) return;
        state.currentResume = JSON.parse(JSON.stringify(found));
        updateAnalyzerResumePreview();
        renderDemoButtons();
        await runCareerAnalysis();
      });
    });
  }

  function updateAnalyzerResumePreview() {
    if (!state.currentResume) return;
    const name = state.currentResume.contact.name;
    const count = (state.currentResume.technicalSkills || []).length;
    $("previewCandidateName").textContent = name;
    $("uploadTitle").textContent = `${name} (${state.currentResume.filename})`;
    $("uploadStatusMsg").textContent = `✓ Loaded ${name} (${count} skills detected)`;
  }

  // Handle PDF / DOCX / TXT File Upload
  function handleFileUpload(file) {
    if (file.size > 10 * 1024 * 1024) {
      $("uploadStatusMsg").textContent = "File exceeds 10 MB limit.";
      return;
    }
    $("uploadTitle").textContent = `Reading ${file.name}...`;
    $("uploadStatusMsg").textContent = "Extracting skills with Python parser...";

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dontSave = Boolean(
          $("dontSaveResumeCheckbox") && $("dontSaveResumeCheckbox").checked
        );
        const resp = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            base64Data: String(reader.result || ""),
            dontSave: dontSave,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          $("uploadStatusMsg").textContent = data.detail || "Could not parse file.";
          return;
        }
        state.currentResume = data.resume;
        if (data.dashboard) {
          state.dashboard = data.dashboard;
          renderDashboard();
        }
        updateAnalyzerResumePreview();
        renderDemoButtons();
      } catch (_err) {
        $("uploadStatusMsg").textContent = "Error uploading file.";
      }
    };
    reader.readAsDataURL(file);
  }

  // Run Full Semantic + Gemini Analysis
  async function runCareerAnalysis(customFocus = "", persistRecord = true) {
    const submitBtn = $("analyzeSubmitBtn");
    const statusBadge = $("reportStatusBadge");
    const dontSave = Boolean(
      $("dontSaveResumeCheckbox") && $("dontSaveResumeCheckbox").checked
    );

    // If user pasted resume text and hasn't parsed yet, parse it first
    const pastedText = $("pastedResumeInput").value.trim();
    if (!state.currentResume && pastedText.length >= 20) {
      const parseResp = await fetch("/api/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "Pasted_Resume.txt",
          pastedText: pastedText,
          dontSave: dontSave,
        }),
      });
      const parseData = await parseResp.json();
      if (parseResp.ok && parseData.resume) {
        state.currentResume = parseData.resume;
        updateAnalyzerResumePreview();
      }
    }

    if (!state.currentResume) {
      $("uploadStatusMsg").textContent =
        "Please upload a resume file, paste text, or click a sample student profile above.";
      return;
    }

    state.selectedRoleTitle = $("roleSelect").value || state.selectedRoleTitle;
    state.goalCompany = $("goalCompanyInput").value.trim();
    state.jobUrl = $("jobUrlInput").value.trim();
    state.customJdText = $("customJdInput").value.trim();

    if (submitBtn) submitBtn.textContent = "Analyzing with Python & Gemini AI...";
    if (statusBadge) statusBadge.textContent = "SYNTHESIZING AI INSIGHTS...";

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: state.currentResume,
          roleTitle: state.selectedRoleTitle,
          goalCompany: state.goalCompany,
          customJdText: state.customJdText,
          jobUrl: state.jobUrl,
          customFocus: customFocus,
          persistRecord: persistRecord && !dontSave,
          dontSave: dontSave,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        $("uploadStatusMsg").textContent = data.detail || "Analysis error.";
        return;
      }

      state.report = data;
      state.currentResume = data.resume;
      state.dashboard = data.dashboard;
      state.completedNodeIds = data.completedNodes || {};
      state.simSelectedSkills = [];

      const nodes = data.roadmapNodes || [];
      const firstGap = nodes.find((n) => n.status !== "mastered") || nodes[0];
      state.selectedNodeId = firstGap ? firstGap.id : "";

      renderDashboard();
      renderHeroCard();
      renderFullReport();

      $("results").classList.remove("hidden");
      $("navResultsLink").classList.remove("hidden");
      if (persistRecord) {
        $("results").scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      if (submitBtn) submitBtn.textContent = "Generate career report ↗";
      if (statusBadge) {
        const src = state.report && state.report.source === "ai" ? "SOURCE: AI (GEMINI)" : "SOURCE: TEMPLATE";
        statusBadge.textContent = src;
      }
    }
  }

  // Render SQLite Student Dashboard (safe no-op when dashboard section is removed)
  function renderDashboard() {
    const d = state.dashboard;
    if (!d || !$("dashTotalResumes")) return;

    $("dashTotalResumes").textContent = String(d.totalResumes || 0);
    $("dashTotalJobs").textContent = String(d.totalJobsCompared || 0);
    $("dashAvgScore").textContent = `${d.averageCompatibilityScore || 0}%`;
    $("dashboardReadinessBadge").textContent = d.readinessStatus || "Ready";

    const topMissing = (d.topMissingSkills || [])[0];
    $("dashTopMissing").textContent = topMissing ? topMissing.skill : "None";

    $("dashMatchedChips").innerHTML =
      (d.topMatchedSkills || [])
        .map((item) => `<span>${escapeHtml(item.skill)} (${item.count})</span>`)
        .join("") || "<span>No records yet</span>";

    $("dashMissingChips").innerHTML =
      (d.topMissingSkills || [])
        .map((item) => `<span>${escapeHtml(item.skill)} (${item.count})</span>`)
        .join("") || "<span>No gaps recorded</span>";

    const tbody = $("dashHistoryTableBody");
    const history = d.recentHistory || [];
    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--text-muted);">No analyses stored yet. Run an analysis below.</td></tr>`;
      return;
    }

    tbody.innerHTML = history
      .map(
        (row) => `
        <tr>
          <td><strong>${escapeHtml(row.candidateName)}</strong></td>
          <td>${escapeHtml(row.targetRole)}</td>
          <td class="sky-text">${escapeHtml(row.goalCompany)}</td>
          <td><strong class="green-text tabular-nums">${row.overallScore}%</strong></td>
          <td style="color:var(--text-muted);">${escapeHtml(row.createdAt)}</td>
          <td style="display:flex;gap:0.65rem;align-items:center;">
            <button type="button" class="link-btn" data-load-id="${row.id}" style="color:#38bdf8;">Load ↗</button>
            <button type="button" class="link-btn" data-delete-id="${row.id}" style="color:#f87171;">Delete</button>
          </td>
        </tr>
      `
      )
      .join("");

    tbody.querySelectorAll("button[data-load-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-load-id");
        const resp = await fetch(`/api/history/${id}`);
        const data = await resp.json();
        if (resp.ok && data.resume) {
          state.report = data;
          state.currentResume = data.resume;
          state.completedNodeIds = data.completedNodes || {};
          state.selectedRoleTitle = data.activeJob.title;
          state.goalCompany = data.activeJob.companyName;
          const nodes = data.roadmapNodes || [];
          const firstGap = nodes.find((n) => n.status !== "mastered") || nodes[0];
          state.selectedNodeId = firstGap ? firstGap.id : "";
          updateAnalyzerResumePreview();
          renderHeroCard();
          renderFullReport();
          $("results").classList.remove("hidden");
          $("navResultsLink").classList.remove("hidden");
          $("results").scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    tbody.querySelectorAll("button[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete-id");
        const resp = await fetch(`/api/history/${id}`, { method: "DELETE" });
        const data = await resp.json();
        if (resp.ok && data.dashboard) {
          state.dashboard = data.dashboard;
          renderDashboard();
        }
      });
    });
  }

  // Update Hero Card with Live Report Data
  function renderHeroCard() {
    if (!state.report) return;
    const { resume, activeJob, matchResult, skillGaps } = state.report;
    const score = Math.round(matchResult.overallScore);

    if ($("heroEmptyState")) $("heroEmptyState").classList.add("hidden");
    if ($("heroLiveSnapshot")) $("heroLiveSnapshot").classList.remove("hidden");

    $("heroCandidateName").textContent = resume.contact.name;
    $("heroStatusPill").textContent = "Live";
    $("heroScoreNum").textContent = String(score);
    $("heroScoreRing").style.background = `conic-gradient(#8b5cf6 0% ${score}%, rgba(255,255,255,0.08) ${score}% 100%)`;
    $("heroRoleTitle").textContent = activeJob.title;
    $("heroCompanyTitle").textContent = activeJob.companyName;
    $("heroPotentialText").textContent = `↑ +${Math.max(
      10,
      100 - score
    )}% potential with roadmap`;

    const matched = matchResult.matchedSkills || [];
    const total =
      matched.length +
      (matchResult.partialSkills || []).length +
      (matchResult.missingSkills || []).length;
    $("heroSkillCount").textContent = `${matched.length} of ${total} matched`;

    const bars = [];
    matched.slice(0, 2).forEach((m) => {
      const pct = Math.round(m.similarity * 100);
      bars.push(`
        <div class="skill-line">
          <div><span>${escapeHtml(m.jobSkill)}</span><b class="tabular-nums">${pct}%</b></div>
          <i><em style="width:${pct}%"></em></i>
        </div>
      `);
    });
    if (skillGaps && skillGaps[0]) {
      bars.push(`
        <div class="skill-line">
          <div><span>${escapeHtml(skillGaps[0].skillName)} (Gap)</span><b class="tabular-nums">35%</b></div>
          <i class="bar-warn"><em style="width:35%"></em></i>
        </div>
      `);
    }
    $("heroSkillBars").innerHTML = bars.join("");
  }

  // Render Complete Career Report
  function renderFullReport() {
    if (!state.report) return;
    const { resume, activeJob, matchResult, skillGaps } = state.report;

    // 1. Spotlight Cards (Candidate Name, Target Role, Goal Company)
    $("spotCandidateName").textContent = resume.contact.name;
    $("spotFilename").textContent = resume.filename;
    $("spotSkillCountBadge").textContent = `${
      (resume.technicalSkills || []).length
    } Skills`;

    $("spotTargetRole").textContent = activeJob.title;
    $("spotRoleSwitcher").value = activeJob.title;

    $("spotGoalCompany").textContent = activeJob.companyName;

    // 2. Top 3 Summary Score Cards
    $("resOverallScore").textContent = String(matchResult.overallScore);
    $("resScoreBar").style.width = `${Math.min(100, matchResult.overallScore)}%`;
    const breakdownList = (matchResult.scoreBreakdown || [])
      .map(
        (b) =>
          `<div style="display:flex;justify-content:space-between;font-size:0.74rem;margin-top:0.2rem;"><span>${escapeHtml(
            b.category
          )} (${escapeHtml(b.reason || "")})</span><strong style="color:#fff;">${b.pointsContributed}/${b.weightPct} pts</strong></div>`
      )
      .join("");
    $("resMandatorySummary").innerHTML =
      `Mandatory met: <strong style="color:#fff;">${matchResult.mandatorySatisfiedPct}%</strong> · Preferred met: <strong style="color:#fff;">${matchResult.preferredSatisfiedPct}%</strong>` +
      (breakdownList ? `<div style="margin-top:0.45rem;padding-top:0.45rem;border-top:1px solid rgba(255,255,255,0.08);">${breakdownList}</div>` : "");

    const matched = matchResult.matchedSkills || [];
    $("resMatchedCount").textContent = String(matched.length).padStart(2, "0");
    $("resMatchedChips").innerHTML = matched
      .map(
        (m) =>
          `<span>${escapeHtml(m.jobSkill)} (${escapeHtml(m.tier)})</span>`
      )
      .join("");

    $("resMissingCount").textContent = String(skillGaps.length).padStart(2, "0");
    $("resMissingChips").innerHTML = skillGaps
      .map(
        (g) =>
          `<span data-gap-skill="${escapeHtml(g.skillName)}">${escapeHtml(
            g.skillName
          )} · ${escapeHtml(g.tier)}</span>`
      )
      .join("");

    // Clicking any missing skill chip jumps to that node on the roadmap
    document.querySelectorAll("#resMissingChips span[data-gap-skill]").forEach((el) => {
      el.addEventListener("click", () => {
        const sk = el.getAttribute("data-gap-skill");
        const node = (state.report.roadmapNodes || []).find((n) => n.skillName === sk);
        if (node) {
          state.selectedNodeId = node.id;
          switchTab("tab-roadmap");
          renderRoadmapTree();
        }
      });
    });

    // 3. Render Tab Contents
    renderRoadmapTree();
    renderCoursesAndWebsites();
    renderStagesAndProjects();
    renderSkillGapsAndEvidence();
    renderSimulatorAndImprovements();
    renderRoleComparison();
    renderEditableSkills();
  }

  // Render Interactive Career Roadmap Tree + Sticky Node Inspector
  function renderRoadmapTree() {
    const nodes = (state.report && state.report.roadmapNodes) || [];
    const activeJob = state.report.activeJob;
    $("roadmapRoleHeading").textContent = `${activeJob.title} Roadmap`;

    const isDone = (n) => n.status === "mastered" || Boolean(state.completedNodeIds[n.id]);
    const doneCount = nodes.filter(isDone).length;
    const totalCount = Math.max(1, nodes.length);
    const pct = Math.round((doneCount / totalCount) * 100);

    $("roadmapMasteryLabel").textContent = `${pct}% (${doneCount}/${totalCount})`;
    $("roadmapMasteryBar").style.width = `${pct}%`;

    // Group nodes by phaseIndex
    const phasesMap = new Map();
    nodes.forEach((node) => {
      if (!phasesMap.has(node.phaseIndex)) {
        phasesMap.set(node.phaseIndex, { title: node.phaseTitle, items: [] });
      }
      phasesMap.get(node.phaseIndex).items.push(node);
    });

    const treeContainer = $("roadmapTreeContainer");
    treeContainer.innerHTML = Array.from(phasesMap.entries())
      .map(([phaseIdx, group]) => {
        const cardsHtml = group.items
          .map((node) => {
            const completed = isDone(node);
            const selected = node.id === state.selectedNodeId;
            const cls = completed
              ? "node-mastered"
              : node.status === "mandatory_gap"
              ? "node-gap-mandatory"
              : "node-gap-preferred";
            const badgeText =
              completed && node.status !== "mastered" ? "✓ Done" : node.statusLabel;

            return `
              <button type="button" class="roadmap-node-card ${cls} ${
              selected ? "node-selected" : ""
            }" data-node-id="${escapeHtml(node.id)}">
                <div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:0.25rem;">
                  <span style="font-weight:700;">${escapeHtml(badgeText)}</span>
                  <span style="color:var(--text-muted);">${escapeHtml(
                    node.estimatedTime
                  )}</span>
                </div>
                <div style="font-size:1rem;font-weight:700;">${escapeHtml(
                  node.skillName
                )}</div>
              </button>
            `;
          })
          .join("");

        return `
          <div class="roadmap-phase-block" data-phase="${phaseIdx}">
            <div class="roadmap-phase-pill">${escapeHtml(group.title)}</div>
            <div class="roadmap-nodes-row">${cardsHtml}</div>
          </div>
        `;
      })
      .join("");

    treeContainer.querySelectorAll("button[data-node-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedNodeId = btn.getAttribute("data-node-id") || "";
        renderRoadmapTree();
      });
    });

    // Render Right Sticky Node Inspector
    const selectedNode =
      nodes.find((n) => n.id === state.selectedNodeId) || nodes[0];
    const inspector = $("nodeInspector");
    if (!selectedNode) {
      inspector.innerHTML = "<p>Select a node to inspect details.</p>";
      return;
    }

    const nodeCompleted = isDone(selectedNode);
    const freeUrl = sanitizeUrl(selectedNode.freeCourse.url);
    const paidUrl = sanitizeUrl(selectedNode.paidCourse.url);

    inspector.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem;padding-bottom:0.9rem;border-bottom:1px solid var(--border-subtle);margin-bottom:1rem;">
        <div>
          <span class="tiny-label">${escapeHtml(selectedNode.phaseTitle)}</span>
          <h4 style="margin:0.2rem 0 0;font-size:1.3rem;">${escapeHtml(
            selectedNode.skillName
          )}</h4>
        </div>
        ${
          selectedNode.status !== "mastered"
            ? `<button type="button" class="demo-btn ${
                nodeCompleted ? "active" : ""
              }" id="toggleNodeDoneBtn">${
                nodeCompleted ? "✓ Done" : "Mark Done"
              }</button>`
            : `<span class="course-badge-free">In Resume</span>`
        }
      </div>

      <div style="margin-bottom:1rem;">
        <span class="tiny-label" style="margin-bottom:0.4rem;">KEY TOPICS</span>
        <ul style="margin:0;padding-left:1.1rem;font-size:0.84rem;color:#cbd5e1;">
          ${(selectedNode.subtopics || [])
            .map((s) => `<li style="margin-bottom:0.25rem;">${escapeHtml(s)}</li>`)
            .join("")}
        </ul>
      </div>

      <!-- Expandable Why It Matters & Practice Task -->
      <div class="expandable-card" id="inspectorExpandCard" style="margin-bottom:1rem;">
        <button type="button" class="expandable-trigger" id="inspectorExpandBtn">
          <div>
            <b style="font-size:0.84rem;color:#38bdf8;">Why it matters &amp; practice task</b>
            <div style="font-size:0.72rem;color:var(--text-muted);">Click to expand</div>
          </div>
          <span class="expandable-chevron">▼</span>
        </button>
        <div class="expandable-content hidden" id="inspectorExpandBody">
          <p style="margin:0 0 0.6rem;">${escapeHtml(selectedNode.whyItMatters)}</p>
          <div style="padding:0.65rem;border-radius:0.6rem;background:rgba(255,255,255,0.05);">
            <strong class="green-text">Practice:</strong> ${escapeHtml(
              selectedNode.practicalTask
            )}
          </div>
        </div>
      </div>

      <div>
        <span class="tiny-label" style="margin-bottom:0.55rem;">VERIFIED COURSES FOR ${escapeHtml(
          selectedNode.skillName.toUpperCase()
        )}</span>

        <div style="padding:0.8rem;border-radius:0.85rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);display:flex;justify-content:space-between;align-items:center;gap:0.75rem;margin-bottom:0.65rem;">
          <div>
            <span class="course-badge-free">Free</span>
            <small style="color:var(--text-muted);margin-left:0.4rem;">${escapeHtml(
              selectedNode.freeCourse.platform
            )}</small>
            <div style="font-weight:700;font-size:0.86rem;margin-top:0.25rem;">${escapeHtml(
              selectedNode.freeCourse.title
            )}</div>
          </div>
          <a href="${freeUrl}" target="_blank" rel="noopener noreferrer" class="demo-btn" style="white-space:nowrap;">Open ↗</a>
        </div>

        <div style="padding:0.8rem;border-radius:0.85rem;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.3);display:flex;justify-content:space-between;align-items:center;gap:0.75rem;">
          <div>
            <span class="course-badge-paid">Paid</span>
            <small style="color:var(--text-muted);margin-left:0.4rem;">${escapeHtml(
              selectedNode.paidCourse.platform
            )}</small>
            <div style="font-weight:700;font-size:0.86rem;margin-top:0.25rem;">${escapeHtml(
              selectedNode.paidCourse.title
            )}</div>
          </div>
          <a href="${paidUrl}" target="_blank" rel="noopener noreferrer" class="demo-btn" style="white-space:nowrap;">Open ↗</a>
        </div>
      </div>
    `;

    const toggleDoneBtn = $("toggleNodeDoneBtn");
    if (toggleDoneBtn) {
      toggleDoneBtn.addEventListener("click", async () => {
        state.completedNodeIds[selectedNode.id] = !state.completedNodeIds[selectedNode.id];
        renderRoadmapTree();
        if (state.currentResume && state.report && state.report.activeJob) {
          try {
            await fetch("/api/roadmap/progress", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resumeId: state.currentResume.id,
                targetRole: state.report.activeJob.title,
                completedNodes: state.completedNodeIds,
              }),
            });
          } catch (err) {
            console.error("Failed to save roadmap progress:", err);
          }
        }
      });
    }

    const expBtn = $("inspectorExpandBtn");
    if (expBtn) {
      expBtn.addEventListener("click", () => {
        $("inspectorExpandCard").classList.toggle("is-expanded");
        $("inspectorExpandBody").classList.toggle("hidden");
      });
    }
  }

  // Render Online Courses (Free & Paid) + Verified Practice Websites with Expandable Details
  function renderCoursesAndWebsites() {
    const advisor = (state.report && state.report.advisor) || {};
    const allCourses = advisor.viableCourses || [];
    const filtered =
      state.courseFilter === "ALL"
        ? allCourses
        : allCourses.filter((c) => c.pricingType === state.courseFilter);

    const coursesGrid = $("coursesGrid");
    coursesGrid.innerHTML = filtered
      .map((c, idx) => {
        const isFree = c.pricingType === "Free";
        const safeHref = sanitizeUrl(c.url);
        return `
          <div class="expandable-card" data-course-card="${idx}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.55rem;">
              <span class="${isFree ? "course-badge-free" : "course-badge-paid"}">${
          isFree ? "Free" : "Paid"
        }</span>
              <span style="font-size:0.76rem;font-weight:600;color:#cbd5e1;">${escapeHtml(
                c.provider
              )}</span>
            </div>
            <h4 style="margin:0 0 0.35rem;font-size:1rem;">${escapeHtml(c.title)}</h4>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.85rem;">
              ${escapeHtml(c.duration)} · <span class="sky-text">${escapeHtml(
          c.skillFocus
        )}</span>
            </div>
            <div style="padding-top:0.7rem;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;">
              <button type="button" class="link-btn" data-toggle-course="${idx}">Why this course ▼</button>
              <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="green-text" style="font-weight:700;">Open Course ↗</a>
            </div>
            <div class="expandable-content hidden" id="courseExpandBody-${idx}">
              <p style="margin:0 0 0.45rem;">${escapeHtml(c.whyViable)}</p>
              <div style="font-size:0.75rem;color:var(--text-muted);">Access: <strong style="color:#fff;">${escapeHtml(
                c.priceDetail || c.pricingType
              )}</strong></div>
            </div>
          </div>
        `;
      })
      .join("");

    coursesGrid.querySelectorAll("button[data-toggle-course]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-toggle-course");
        const card = coursesGrid.querySelector(`[data-course-card="${idx}"]`);
        const body = $(`courseExpandBody-${idx}`);
        card.classList.toggle("is-expanded");
        body.classList.toggle("hidden");
      });
    });

    // Verified Practice Websites, Sandboxes & Study Materials
    const websites = advisor.websitesAndMaterials || [];
    const websitesGrid = $("websitesGrid");
    websitesGrid.innerHTML = websites
      .map((site, idx) => {
        const safeHref = sanitizeUrl(site.url);
        return `
          <div class="expandable-card" data-site-card="${idx}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
              <div>
                <div style="font-size:0.7rem;font-weight:700;color:#34d399;">${escapeHtml(
                  site.category
                )}</div>
                <strong style="font-size:0.95rem;display:block;margin-top:0.15rem;">${escapeHtml(
                  site.name
                )}</strong>
              </div>
              <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="sky-text" style="font-size:0.78rem;font-weight:700;white-space:nowrap;">Visit ↗</a>
            </div>
            <div style="margin-top:0.65rem;">
              <button type="button" class="link-btn" data-toggle-site="${idx}" style="color:var(--text-muted);">What to practice ▼</button>
            </div>
            <div class="expandable-content hidden" id="siteExpandBody-${idx}">
              ${escapeHtml(site.summary)}
            </div>
          </div>
        `;
      })
      .join("");

    websitesGrid.querySelectorAll("button[data-toggle-site]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-toggle-site");
        const card = websitesGrid.querySelector(`[data-site-card="${idx}"]`);
        const body = $(`siteExpandBody-${idx}`);
        card.classList.toggle("is-expanded");
        body.classList.toggle("hidden");
      });
    });
  }

  // Render 3-Stage Checklist & Portfolio Projects (Expandable)
  function renderStagesAndProjects() {
    const stages = (state.report && state.report.stages) || [];
    const projects = (state.report && state.report.projects) || [];

    const stagesContainer = $("stagesContainer");
    stagesContainer.innerHTML = stages
      .map(
        (st, idx) => `
        <div class="expandable-card" data-stage-card="${idx}">
          <button type="button" class="expandable-trigger" data-toggle-stage="${idx}">
            <div>
              <b style="font-size:0.92rem;">${escapeHtml(st.stageName)}</b>
              <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(
                st.estimatedCompletionTime
              )}</div>
            </div>
            <span class="expandable-chevron">▼</span>
          </button>
          <div class="expandable-content hidden" id="stageBody-${idx}">
            <ul style="margin:0 0 0.6rem;padding-left:1.1rem;">
              ${(st.learningObjectives || [])
                .map((o) => `<li>${escapeHtml(o)}</li>`)
                .join("")}
            </ul>
            <div style="padding:0.6rem;border-radius:0.55rem;background:rgba(255,255,255,0.05);" class="sky-text">
              <strong>Project:</strong> ${escapeHtml(st.projectAssignment)}
            </div>
          </div>
        </div>
      `
      )
      .join("");

    stagesContainer.querySelectorAll("button[data-toggle-stage]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-toggle-stage");
        const card = stagesContainer.querySelector(`[data-stage-card="${idx}"]`);
        const body = $(`stageBody-${idx}`);
        card.classList.toggle("is-expanded");
        body.classList.toggle("hidden");
      });
    });

    const projectsContainer = $("projectsContainer");
    projectsContainer.innerHTML = projects
      .map(
        (p, idx) => `
        <div class="expandable-card" data-proj-card="${idx}">
          <button type="button" class="expandable-trigger" data-toggle-proj="${idx}">
            <div>
              <b style="font-size:0.92rem;">${escapeHtml(p.title)}</b>
              <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(
                p.difficulty
              )} · ${escapeHtml(p.estimatedDuration)}</div>
            </div>
            <span class="expandable-chevron">▼</span>
          </button>
          <div class="expandable-content hidden" id="projBody-${idx}">
            <p style="margin:0 0 0.5rem;">${escapeHtml(p.problemStatement)}</p>
            <div class="sky-text" style="font-size:0.76rem;">
              <strong>Skills:</strong> ${escapeHtml(
                (p.skillsCovered || []).join(", ")
              )}
            </div>
          </div>
        </div>
      `
      )
      .join("");

    projectsContainer.querySelectorAll("button[data-toggle-proj]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-toggle-proj");
        const card = projectsContainer.querySelector(`[data-proj-card="${idx}"]`);
        const body = $(`projBody-${idx}`);
        card.classList.toggle("is-expanded");
        body.classList.toggle("hidden");
      });
    });
  }

  // Render Tab 2: Priority Skill Gaps & Resume Proof Table
  function renderSkillGapsAndEvidence() {
    const gaps = (state.report && state.report.skillGaps) || [];
    const matchResult = (state.report && state.report.matchResult) || {};

    const gapsGrid = $("gapsCardsGrid");
    gapsGrid.innerHTML =
      gaps
        .map(
          (g, idx) => `
        <div class="expandable-card" data-gap-card="${idx}">
          <button type="button" class="expandable-trigger" data-toggle-gap="${idx}">
            <div>
              <div style="font-size:0.72rem;color:#c4b5fd;font-weight:700;">#${
                g.priorityRank
              } · ${escapeHtml(g.tier)} · ${escapeHtml(g.estimatedDuration)}</div>
              <strong style="font-size:1.05rem;display:block;margin-top:0.15rem;">${escapeHtml(
                g.skillName
              )}</strong>
            </div>
            <span class="expandable-chevron">▼</span>
          </button>
          <div class="expandable-content hidden" id="gapBody-${idx}">
            <p style="margin:0 0 0.55rem;">${escapeHtml(g.whyItMatters)}</p>
            <div style="padding:0.65rem;border-radius:0.55rem;background:rgba(255,255,255,0.05);">
              <strong class="sky-text">Practice Task:</strong> ${escapeHtml(
                g.practicalExercise
              )}
            </div>
          </div>
        </div>
      `
        )
        .join("") || "<p>All role skills are satisfied!</p>";

    gapsGrid.querySelectorAll("button[data-toggle-gap]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-toggle-gap");
        const card = gapsGrid.querySelector(`[data-gap-card="${idx}"]`);
        const body = $(`gapBody-${idx}`);
        card.classList.toggle("is-expanded");
        body.classList.toggle("hidden");
      });
    });

    // Show all job requirements (each skill has strictly ONE status: matched, adjacent, or missing)
    const evidenceRows = [
      ...(matchResult.matchedSkills || []),
      ...(matchResult.partialSkills || []),
      ...(matchResult.missingSkills || []),
    ];
    $("evidenceTableBody").innerHTML = evidenceRows
      .map((item) => {
        const statusCls =
          item.matchType === "Detected"
            ? "green-text"
            : item.matchType === "Adjacent skill"
            ? "sky-text"
            : "purple-text";
        const statusText =
          item.matchType === "Detected"
            ? "✓ Detected"
            : item.matchType === "Adjacent skill"
            ? escapeHtml(item.explanation || `Adjacent: ${item.resumeSkill} (0 pts)`)
            : "Missing (0 pts)";
        return `
        <tr>
          <td><strong>${escapeHtml(item.jobSkill)}</strong> <span style="color:var(--text-muted);">(${escapeHtml(
            item.tier
          )})</span></td>
          <td class="${statusCls}"><strong>${statusText}</strong></td>
          <td style="color:#94a3b8;font-size:0.8rem;">“${escapeHtml(
            item.jobQuote || `${item.tier} requirement: ${item.jobSkill}`
          )}”</td>
          <td style="color:#cbd5e1;">“${escapeHtml(item.resumeEvidence)}”</td>
        </tr>
      `;
      })
      .join("");
  }

  // Render Tab 3: What-If Score Simulator & Gemini Resume Improvements
  function renderSimulatorAndImprovements() {
    const gaps = (state.report && state.report.skillGaps) || [];
    const matchResult = (state.report && state.report.matchResult) || {};
    const activeJob = (state.report && state.report.activeJob) || {};
    const improvements = (state.report && state.report.improvements) || {};

    const baseScore = matchResult.overallScore || 0;
    const mandTotal = Math.max(1, (activeJob.mandatorySkills || []).length);
    const prefTotal = Math.max(1, (activeJob.preferredSkills || []).length);

    function getSkillExactPoints(tier) {
      if (tier === "Mandatory") return Math.round((60 / mandTotal) * 10) / 10;
      if (tier === "Preferred") return Math.round((15 / prefTotal) * 10) / 10;
      return 0;
    }

    const togglesContainer = $("simSkillToggles");
    togglesContainer.innerHTML = gaps
      .map((g) => {
        const checked = state.simSelectedSkills.includes(g.skillName);
        const pts = getSkillExactPoints(g.tier);
        const ptsLabel = pts > 0 ? `+${pts} pts` : "Bonus (0 pts)";
        return `
          <button type="button" class="demo-btn ${
            checked ? "active" : ""
          }" data-sim-skill="${escapeHtml(
          g.skillName
        )}" style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;text-align:left;">
            <span><strong>${escapeHtml(g.skillName)}</strong> (${escapeHtml(
          g.tier
        )} · ${ptsLabel})</span>
            <span>${checked ? "✓ Selected" : "+ Simulate"}</span>
          </button>
        `;
      })
      .join("");

    togglesContainer.querySelectorAll("button[data-sim-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sk = btn.getAttribute("data-sim-skill");
        if (!sk) return;
        if (state.simSelectedSkills.includes(sk)) {
          state.simSelectedSkills = state.simSelectedSkills.filter((x) => x !== sk);
        } else {
          state.simSelectedSkills.push(sk);
        }
        renderSimulatorAndImprovements();
      });
    });

    const steps = [{ label: "Current Match Score", score: baseScore }];
    let running = baseScore;
    state.simSelectedSkills.forEach((sk) => {
      const gapObj = gaps.find((g) => g.skillName === sk);
      const exactBoost = gapObj ? getSkillExactPoints(gapObj.tier) : 0;
      running = Math.min(100, Math.round((running + exactBoost) * 10) / 10);
      steps.push({ label: `After learning ${sk} (+${exactBoost} pts)`, score: running });
    });

    $("simProjectedScore").textContent = `${running}%`;
    $("simProgressionBars").innerHTML = steps
      .map(
        (st) => `
        <div class="skill-line">
          <div><span>${escapeHtml(st.label)}</span><b class="green-text tabular-nums">${
            st.score
          }%</b></div>
          <i><em style="width:${Math.min(100, st.score)}%"></em></i>
        </div>
      `
      )
      .join("");

    const rewritesHtml = (improvements.bulletRewrites || [])
      .map(
        (rw) => `
        <div class="expandable-card is-expanded" style="grid-column: 1 / -1;">
          <span class="tiny-label green-text">GROUNDED RESUME BULLET REWRITE</span>
          <div style="margin-top:0.5rem;font-size:0.82rem;color:#94a3b8;">
            <strong>Before:</strong> “${escapeHtml(rw.before || "")}”
          </div>
          <div style="margin-top:0.4rem;font-size:0.86rem;color:#e2e8f0;">
            <strong class="green-text">After:</strong> “${escapeHtml(rw.after || "")}”
          </div>
          ${
            rw.reason
              ? `<div style="margin-top:0.35rem;font-size:0.75rem;color:var(--text-muted);">Why: ${escapeHtml(
                  rw.reason
                )}</div>`
              : ""
          }
        </div>
      `
      )
      .join("");

    const tipsHtml = (improvements.actionTips || [])
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join("");

    $("improvementsGrid").innerHTML = `
      <div class="expandable-card is-expanded">
        <span class="tiny-label purple-text">PROFESSIONAL SUMMARY UPGRADE</span>
        <p style="margin:0.5rem 0 0;font-size:0.86rem;color:#e2e8f0;">“${escapeHtml(
          improvements.improvedSummary || ""
        )}”</p>
      </div>
      <div class="expandable-card is-expanded">
        <span class="tiny-label sky-text">RECOMMENDED ATS SKILL GROUPING</span>
        <ul style="margin:0.5rem 0 0;padding-left:1.1rem;font-size:0.84rem;color:#cbd5e1;">
          ${(improvements.skillGrouping || [])
            .map((g) => `<li>${escapeHtml(g)}</li>`)
            .join("")}
        </ul>
      </div>
      ${
        tipsHtml
          ? `<div class="expandable-card is-expanded">
              <span class="tiny-label green-text">ACTIONABLE RESUME TIPS</span>
              <ul style="margin:0.5rem 0 0;padding-left:1.1rem;font-size:0.84rem;color:#cbd5e1;">${tipsHtml}</ul>
            </div>`
          : ""
      }
      ${rewritesHtml}
    `;
  }

  // Render Tab 4: Multi-Role Comparison & Market Benchmark
  function renderRoleComparison() {
    const comparisons = (state.report && state.report.roleComparisons) || [];
    const activeTitle = state.report.activeJob.title;

    const grid = $("roleCompareGrid");
    grid.innerHTML = comparisons
      .map(
        (c) => `
        <div class="expandable-card ${
          c.title === activeTitle ? "is-expanded" : ""
        }">
          <strong style="font-size:1rem;">${escapeHtml(c.title)}</strong>
          <div class="green-text tabular-nums" style="font-size:1.75rem;font-weight:700;margin:0.3rem 0;">${
            c.overallScore
          }%</div>
          <div style="font-size:0.76rem;color:var(--text-muted);margin-bottom:0.75rem;">
            Mandatory met: ${c.mandatorySatisfiedPct}% · Missing: ${c.missingCount}
          </div>
          <button type="button" class="demo-btn" data-switch-role="${escapeHtml(
            c.title
          )}" style="width:100%;">${
          c.title === activeTitle ? "Active Role" : `Switch to ${escapeHtml(c.title)}`
        }</button>
        </div>
      `
      )
      .join("");

    grid.querySelectorAll("button[data-switch-role]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const nextRole = btn.getAttribute("data-switch-role");
        if (!nextRole) return;
        state.selectedRoleTitle = nextRole;
        $("roleSelect").value = nextRole;
        await runCareerAnalysis();
      });
    });
  }

  // Render Tab 5: Editable Candidate Skills & Structured Parsed Resume Sections
  function renderEditableSkills() {
    if (!state.currentResume) return;
    const r = state.currentResume;
    const skills = r.technicalSkills || [];

    const container = $("editableSkillsList");
    container.innerHTML = skills
      .map(
        (sk) => `
        <span style="display:inline-flex;align-items:center;gap:0.4rem;">
          ${escapeHtml(sk)}
          <button type="button" data-remove-skill="${escapeHtml(
            sk
          )}" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-weight:700;padding:0;">×</button>
        </span>
      `
      )
      .join("");

    container.querySelectorAll("button[data-remove-skill]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const rm = btn.getAttribute("data-remove-skill");
        const nextSkills = skills.filter((s) => s !== rm);
        await updateCandidateSkills(nextSkills);
      });
    });

    // Render structured Education, Work Experience, Projects, and Certifications
    const detailsGrid = $("parsedResumeDetailsGrid");
    if (detailsGrid) {
      const eduHtml =
        (r.education || [])
          .map(
            (e) =>
              `<div style="margin-bottom:0.5rem;"><strong>${escapeHtml(
                e.degree || "Degree"
              )}</strong><div style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(
                [e.institution, e.year, e.score].filter(Boolean).join(" · ")
              )}</div></div>`
          )
          .join("") || "<span style='color:var(--text-muted);font-size:0.82rem;'>None detected</span>";

      const expHtml =
        (r.workExperience || [])
          .map(
            (w) =>
              `<div style="margin-bottom:0.65rem;"><strong>${escapeHtml(
                w.role || "Role"
              )}</strong> <span class="sky-text">${
                w.company ? `— ${escapeHtml(w.company)}` : ""
              }</span><div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(
                w.duration || ""
              )}</div><ul style="margin:0.25rem 0 0;padding-left:1.1rem;font-size:0.78rem;color:#cbd5e1;">${(
                w.highlights || []
              )
                .map((h) => `<li>${escapeHtml(h)}</li>`)
                .join("")}</ul></div>`
          )
          .join("") || "<span style='color:var(--text-muted);font-size:0.82rem;'>No formal experience entries detected</span>";

      const projHtml =
        (r.projects || [])
          .map(
            (p) =>
              `<div style="margin-bottom:0.55rem;"><strong>${escapeHtml(
                p.title || "Project"
              )}</strong><div style="font-size:0.78rem;color:#cbd5e1;margin-top:0.15rem;">${escapeHtml(
                p.description || ""
              )}</div></div>`
          )
          .join("") || "<span style='color:var(--text-muted);font-size:0.82rem;'>None detected</span>";

      const certHtml =
        (r.certifications || [])
          .map((c) => `<li style="margin-bottom:0.25rem;">${escapeHtml(c)}</li>`)
          .join("") || "<li style='color:var(--text-muted);'>None detected</li>";

      detailsGrid.innerHTML = `
        <div class="expandable-card is-expanded">
          <span class="tiny-label green-text">DETECTED EDUCATION</span>
          <div style="margin-top:0.45rem;">${eduHtml}</div>
        </div>
        <div class="expandable-card is-expanded">
          <span class="tiny-label sky-text">DETECTED WORK EXPERIENCE</span>
          <div style="margin-top:0.45rem;">${expHtml}</div>
        </div>
        <div class="expandable-card is-expanded">
          <span class="tiny-label purple-text">DETECTED PROJECTS</span>
          <div style="margin-top:0.45rem;">${projHtml}</div>
        </div>
        <div class="expandable-card is-expanded">
          <span class="tiny-label green-text">DETECTED CERTIFICATIONS</span>
          <ul style="margin:0.45rem 0 0;padding-left:1.1rem;font-size:0.82rem;color:#cbd5e1;">${certHtml}</ul>
        </div>
      `;
    }

    $("rawResumeTextPre").textContent = r.rawText || "";
  }

  async function updateCandidateSkills(nextSkills) {
    if (!state.currentResume) return;
    try {
      const resp = await fetch("/api/resume/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: state.currentResume.id,
          skills: nextSkills,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.resume) {
        state.currentResume = data.resume;
        updateAnalyzerResumePreview();
        await runCareerAnalysis("", false);
      }
    } catch (err) {
      console.error("Failed to update skills:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", initApp);
})();
