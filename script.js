const form = document.getElementById("analyzerForm");
const fileInput = document.getElementById("resumeFile");
const uploadZone = document.getElementById("uploadZone");
const uploadTitle = document.getElementById("uploadTitle");
const uploadSub = document.getElementById("uploadSub");
const fileMessage = document.getElementById("fileMessage");
const toast = document.getElementById("toast");
const results = document.getElementById("results");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
let selectedFile = null;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setFile(file) {
  if (!file) return;
  const allowed = /\.(pdf|doc|docx|txt)$/i.test(file.name);
  const maxSize = 10 * 1024 * 1024;
  fileMessage.classList.remove("error");
  if (!allowed) {
    selectedFile = null;
    fileInput.value = "";
    fileMessage.textContent = "Please choose a PDF, DOC, DOCX, or TXT file.";
    fileMessage.classList.add("error");
    uploadTitle.textContent = "Drop your resume here";
    uploadSub.innerHTML = "or <u>browse files</u> from your device";
    return;
  }
  if (file.size > maxSize) {
    selectedFile = null;
    fileInput.value = "";
    fileMessage.textContent =
      "This file is larger than 10 MB. Please choose a smaller file.";
    fileMessage.classList.add("error");
    return;
  }
  selectedFile = file;
  uploadTitle.textContent = file.name;
  uploadSub.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready for demo`;
  fileMessage.textContent =
    "✓ File selected locally. It has not been uploaded.";
}

fileInput.addEventListener("change", (event) => setFile(event.target.files[0]));
["dragenter", "dragover"].forEach((type) =>
  uploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    uploadZone.classList.add("dragging");
  }),
);
["dragleave", "drop"].forEach((type) =>
  uploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("dragging");
  }),
);
uploadZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  setFile(file);
});

const roleSkills = {
  "Full Stack Developer": {
    matched: ["HTML", "CSS", "JavaScript", "Git"],
    missing: ["React", "REST APIs", "Testing"],
    score: 78,
  },
  "Frontend Developer": {
    matched: ["HTML", "CSS", "JavaScript", "Responsive UI"],
    missing: ["React", "Accessibility", "Testing"],
    score: 82,
  },
  "Backend Developer": {
    matched: ["JavaScript", "Git", "Problem Solving"],
    missing: ["REST APIs", "Databases", "Authentication"],
    score: 66,
  },
  "Python Developer": {
    matched: ["Python basics", "Git", "Problem Solving"],
    missing: ["FastAPI", "Testing", "SQL"],
    score: 71,
  },
  "Data Analyst": {
    matched: ["Excel", "Problem Solving", "Communication"],
    missing: ["SQL", "Power BI", "Statistics"],
    score: 64,
  },
  "AI/ML Engineer": {
    matched: ["Python basics", "Problem Solving", "Math foundations"],
    missing: ["Machine Learning", "Pandas", "Model Evaluation"],
    score: 59,
  },
  "Software Engineer": {
    matched: ["JavaScript", "Git", "Problem Solving", "Debugging"],
    missing: ["Data Structures", "Testing", "System Design"],
    score: 73,
  },
};

function fillChips(container, skills) {
  container.innerHTML = "";
  skills.forEach((skill) => {
    const chip = document.createElement("span");
    chip.textContent = skill;
    container.appendChild(chip);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const role = document.getElementById("jobRole").value;
  const button = document.getElementById("analyzeButton");
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="loading-dots">Analyzing demo...</span>';
  setTimeout(() => {
    const data = roleSkills[role] || roleSkills["Full Stack Developer"];
    document.getElementById("reportRole").textContent =
      `Sample report for ${role}${selectedFile ? ` · ${selectedFile.name}` : " · sample profile"}`;
    document.getElementById("matchScore").textContent = data.score;
    document.getElementById("scoreTrack").style.width = `${data.score}%`;
    fillChips(document.getElementById("matchedSkills"), data.matched);
    fillChips(document.getElementById("missingSkills"), data.missing);
    document.querySelector(
      ".results-grid .result-card:nth-child(2) .result-number",
    ).textContent = String(data.matched.length).padStart(2, "0");
    document.querySelector(
      ".results-grid .result-card:nth-child(3) .result-number",
    ).textContent = String(data.missing.length).padStart(2, "0");
    results.classList.remove("hidden");
    button.disabled = false;
    button.innerHTML = original;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(
      "Demo report generated. Results are illustrative, not AI analysis.",
    );
  }, 950);
});

document.querySelectorAll(".roadmap-item input").forEach((input) => {
  input.addEventListener("change", () => {
    const item = input.closest(".roadmap-item");
    item.classList.toggle("completed", input.checked);
    const checkboxes = [...document.querySelectorAll(".roadmap-item input")];
    const completed = checkboxes.filter((box) => box.checked).length;
    const percent = Math.round((completed / checkboxes.length) * 100);
    document.getElementById("progressLabel").textContent =
      `${percent}% complete`;
    document.getElementById("progressBar").style.width = `${percent}%`;
  });
});

document
  .getElementById("printReport")
  .addEventListener("click", () => window.print());
menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks
  .querySelectorAll("a")
  .forEach((link) =>
    link.addEventListener("click", () => navLinks.classList.remove("open")),
  );

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});
