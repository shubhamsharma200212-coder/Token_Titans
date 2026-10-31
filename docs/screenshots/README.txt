Screenshots to create for README.md (save in this folder: docs/screenshots/)
=============================================================================

1. hero.png
   - What to capture: The top hero section and the "Resume & Role Analyzer" input panel.
   - State to show: Either the clean initial empty state ("Upload a resume to see your match") or right after loading `samples/sample_resume_aarav_sharma.txt` and clicking "Load sample Data Engineer JD".
   - Recommended viewport: 1440x900 desktop.

2. report.png
   - What to capture: The top of the generated Career Report (`#results`) after running an analysis.
   - State to show: The Candidate / Target Role / Goal Company spotlight bar and the 3 summary score cards (Overall Compatibility with the 5-row point breakdown: Mandatory 60 pts, Preferred 15 pts, Projects & Experience 15 pts, Education 5 pts, Certifications 5 pts; Matched Skills; Skills to Build).
   - Recommended viewport: 1440x900 desktop.

3. evidence-view.png
   - What to capture: Tab "02. Skill Gaps & Evidence" (`#tab-gaps`).
   - State to show: Priority Skill Gaps cards at the top and the "All Requirements with JD Quotes & Resume Proof" table (`#evidenceTableBody`) showing `Detected`, `Adjacent skill (0 pts)`, and `Missing (0 pts)` statuses alongside exact quotes from the job description and resume.
   - Recommended viewport: 1440x900 desktop.

4. roadmap.png
   - What to capture: Tab "01. Detailed Career Roadmap" (`#tab-roadmap`).
   - State to show: The 4-phase interactive skill tree on the left (with at least one node marked "✓ Done" to show the progress bar updating) and the sticky Node Inspector on the right displaying subtopics, practice task, and Free/Paid courses from `backend/resources.json`.
   - Recommended viewport: 1440x900 desktop.

5. mobile.png
   - What to capture: The responsive mobile view of the Career Report or Analyzer panel with the mobile navigation drawer.
   - Recommended viewport: 390x844 (iPhone 14 / mobile responsiveness view in browser DevTools).
