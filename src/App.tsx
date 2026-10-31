import React, { useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  RotateCcw,
  Trash2,
  ChevronDown,
  User,
  Briefcase,
  Building2,
  Menu,
  X,
} from 'lucide-react';
import {
  ResumeProfile,
  JobRoleProfile,
  ScoringWeights,
  LearningStage,
  RecommendedProject,
  ResumeImprovementReport,
  MarketBenchmarkDataset,
  DEFAULT_SCORING_WEIGHTS,
  PRELOADED_ROLE_TEMPLATES,
  SAMPLE_RESUMES,
  INITIAL_OCTOBER_2026_BENCHMARK,
  extractStructuredResumeFromText,
  extractJobProfileFromText,
  getAllResumeTechnicalSkills,
  matchResumeToJob,
  buildSkillGaps,
} from './data/careerData';
import { InteractiveCareerRoadmap, AdvisorPayload } from './components/InteractiveCareerRoadmap';
import {
  sanitizePlainText,
  sanitizeShortField,
  sanitizeExternalUrl,
} from './utils/security';

type ResultTab =
  | 'detailed_roadmap'
  | 'evidence_gaps'
  | 'simulator_resume'
  | 'multijob_market'
  | 'edit_profile';

export default function App() {
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string>('Full Stack Developer');
  const [customCompany, setCustomCompany] = useState<string>('');
  const [customJobUrl, setCustomJobUrl] = useState<string>('');
  const [customJdText, setCustomJdText] = useState<string>('');
  const [pastedResumeText, setPastedResumeText] = useState<string>('');
  const [showPasteResume, setShowPasteResume] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('detailed_roadmap');

  // Weights & Simulator State
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_SCORING_WEIGHTS);
  const [selectedSimSkills, setSelectedSimSkills] = useState<string[]>([]);
  const [includeCapstoneProject, setIncludeCapstoneProject] = useState<boolean>(false);

  // Expandable UI States (Independent cards so spacing never breaks)
  const [completedMilestones, setCompletedMilestones] = useState<Record<number, boolean>>({});
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [expandedGaps, setExpandedGaps] = useState<Record<string, boolean>>({});
  const [showWeightsPanel, setShowWeightsPanel] = useState<boolean>(false);
  const [showEvidenceTable, setShowEvidenceTable] = useState<boolean>(true);
  const [showRawResumeText, setShowRawResumeText] = useState<boolean>(false);
  const [editingGoalCompany, setEditingGoalCompany] = useState<boolean>(false);

  // Gemini AI Data States
  const [stages, setStages] = useState<LearningStage[]>([]);
  const [projects, setProjects] = useState<RecommendedProject[]>([]);
  const [advisor, setAdvisor] = useState<AdvisorPayload | null>(null);
  const [improvementReport, setImprovementReport] = useState<ResumeImprovementReport | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Market Benchmark & Skill Editor States
  const [benchmark] = useState<MarketBenchmarkDataset>(
    INITIAL_OCTOBER_2026_BENCHMARK
  );
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  const resultsSectionRef = useRef<HTMLElement | null>(null);

  // Resolve Active Job Role Profile
  const activeJob: JobRoleProfile = useMemo(() => {
    const cleanJd = sanitizePlainText(customJdText, 20000);
    const safeCompany = sanitizeShortField(customCompany, 100);
    const safeUrl = sanitizeExternalUrl(customJobUrl) || undefined;

    if (cleanJd.trim().length > 20) {
      return extractJobProfileFromText(
        cleanJd,
        selectedRoleName,
        safeCompany || 'Target Company',
        safeUrl
      );
    }
    const tpl =
      PRELOADED_ROLE_TEMPLATES.find((t) => t.title === selectedRoleName) ||
      PRELOADED_ROLE_TEMPLATES[3];
    return {
      ...tpl,
      companyName: safeCompany || tpl.companyName,
      sourceUrl: safeUrl || tpl.sourceUrl,
    };
  }, [selectedRoleName, customJdText, customCompany, customJobUrl]);

  // Compute Semantic Match & Skill Gaps
  const matchResult = useMemo(
    () => (resume ? matchResumeToJob(resume, activeJob, weights) : null),
    [resume, activeJob, weights]
  );

  const skillGaps = useMemo(
    () => (resume && matchResult ? buildSkillGaps(matchResult, resume) : []),
    [resume, matchResult]
  );

  // Fetch AI Recommendations
  const fetchAiIntelligence = async (
    targetResume: ResumeProfile,
    targetJob: JobRoleProfile,
    gapsList: string[],
    customFocus = ''
  ) => {
    setLoadingAi(true);
    try {
      const existingSkills = getAllResumeTechnicalSkills(targetResume).map((s) =>
        sanitizeShortField(s, 80)
      );
      const safeGaps = gapsList.map((g) => sanitizeShortField(g, 80));
      const safeRole = sanitizeShortField(targetJob.title, 100);
      const safeFocus = sanitizeShortField(customFocus, 200);

      const [roadmapResp, advisorResp, projResp, improveResp] = await Promise.all([
        fetch('/api/ai/roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            existingSkills,
            missingSkills: safeGaps,
            targetRole: safeRole,
          }),
        }),
        fetch('/api/ai/skill-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            existingSkills,
            missingSkills: safeGaps,
            targetRole: safeRole,
            customFocus: safeFocus,
          }),
        }),
        fetch('/api/ai/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            existingSkills,
            missingSkills: safeGaps,
            targetRole: safeRole,
          }),
        }),
        fetch('/api/ai/resume-improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume: targetResume,
            targetJobTitle: safeRole,
            missingSkills: safeGaps,
          }),
        }),
      ]);

      const [rData, aData, pData, iData] = await Promise.all([
        roadmapResp.json(),
        advisorResp.json(),
        projResp.json(),
        improveResp.json(),
      ]);

      if (Array.isArray(rData.stages)) setStages(rData.stages);
      if (aData.advisor) setAdvisor(aData.advisor);
      if (Array.isArray(pData.projects)) setProjects(pData.projects);
      if (iData.report) setImprovementReport(iData.report);
    } catch {
      // Fallbacks handled server-side
    } finally {
      setLoadingAi(false);
    }
  };

  // Process File Helper (supports both click upload and drag-and-drop)
  const processUploadedFile = async (file: File) => {
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadStatusMsg('File exceeds 10 MB limit.');
      return;
    }

    const safeFileName = sanitizeShortField(file.name, 120);
    setIsExtractingFile(true);
    setUploadStatusMsg(`Reading ${safeFileName}...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const resultStr = String(reader.result || '');
        const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;

        const resp = await fetch('/api/document/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: safeFileName, base64Data }),
        });
        const data = await resp.json();

        if (!resp.ok || data.error) {
          setUploadStatusMsg(data.error || 'Could not extract text from file.');
          setIsExtractingFile(false);
          return;
        }

        const sanitizedText = sanitizePlainText(data.text, 50000);
        const parsed = extractStructuredResumeFromText(sanitizedText, safeFileName);
        setResume(parsed);
        setUploadStatusMsg(
          `✓ Loaded ${parsed.contact.name} (${getAllResumeTechnicalSkills(parsed).length} skills)`
        );
        setIsExtractingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadStatusMsg('Error reading file.');
      setIsExtractingFile(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processUploadedFile(file);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processUploadedFile(file);
  };

  // Generate Career Report Handler
  const handleGenerateReport = async (
    e?: React.FormEvent,
    overrideResume?: ResumeProfile
  ) => {
    if (e) e.preventDefault();

    let targetResume = overrideResume || resume;
    if (!targetResume && pastedResumeText.trim()) {
      const cleanPaste = sanitizePlainText(pastedResumeText, 50000);
      targetResume = extractStructuredResumeFromText(
        cleanPaste,
        'Pasted_Resume.txt'
      );
      setResume(targetResume);
    }

    if (!targetResume) {
      setUploadStatusMsg(
        'Upload a resume, paste text, or pick a demo profile below.'
      );
      return;
    }

    const computedMatch = matchResumeToJob(targetResume, activeJob, weights);
    const computedGaps = buildSkillGaps(computedMatch, targetResume);

    setReportGenerated(true);
    setSelectedSimSkills([]);
    setIncludeCapstoneProject(false);
    setCompletedMilestones({});

    setTimeout(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    await fetchAiIntelligence(
      targetResume,
      activeJob,
      computedGaps.map((g) => g.skillName)
    );
  };

  // Select Optional Demo Profile
  const handleSelectOptionalDemo = (demo: ResumeProfile) => {
    setResume(demo);
    setUploadStatusMsg(`✓ Demo Active: ${demo.contact.name}`);
    handleGenerateReport(undefined, demo);
  };

  // Roadmap Checkbox Progress
  const totalMilestones = Math.max(stages.length, 3);
  const completedCount = Object.values(completedMilestones).filter(Boolean).length;
  const roadmapProgressPct = Math.round((completedCount / totalMilestones) * 100);

  // Career What-If Simulator Calculation
  const simulatedProgression = useMemo(() => {
    if (!resume || !matchResult) return [];
    const steps: Array<{ label: string; score: number }> = [
      { label: 'Current Match', score: matchResult.overallScore },
    ];
    const running: string[] = [];
    for (const s of selectedSimSkills) {
      running.push(s);
      const simRes = matchResumeToJob(
        { ...resume, technicalSkills: [...resume.technicalSkills, ...running] },
        activeJob,
        weights
      );
      steps.push({ label: `+ ${s}`, score: simRes.overallScore });
    }
    if (includeCapstoneProject) {
      const simProj = matchResumeToJob(
        {
          ...resume,
          technicalSkills: [...resume.technicalSkills, ...running],
          projects: [
            ...resume.projects,
            {
              title: `${activeJob.title} Portfolio Project`,
              techStack: running,
              description: 'Capstone project addressing role gaps',
            },
          ],
        },
        activeJob,
        weights
      );
      steps.push({
        label: '+ Portfolio Project',
        score: simProj.overallScore,
      });
    }
    return steps;
  }, [resume, matchResult, selectedSimSkills, includeCapstoneProject, activeJob, weights]);

  const projectedScore =
    simulatedProgression.length > 0
      ? simulatedProgression[simulatedProgression.length - 1].score
      : matchResult?.overallScore || 78;

  // Hero Card Dynamic Values
  const heroScore = matchResult ? Math.round(matchResult.overallScore) : 78;
  const heroRoleTitle = activeJob.title;
  const heroMatchedCount = matchResult ? matchResult.matchedSkills.length : 4;
  const heroTotalCount = matchResult
    ? matchResult.matchedSkills.length +
      matchResult.partialSkills.length +
      matchResult.missingSkills.length
    : 6;

  return (
    <div>
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>

      {/* Responsive Navbar */}
      <header className="navbar">
        <a className="brand" href="#home" aria-label="CareerMatch AI home">
          <span className="brand-mark">✳</span>
          <span>
            career<span className="brand-accent">match</span>
            <sup>AI</sup>
          </span>
        </a>

        <nav className="nav-links" id="navLinks">
          <a href="#how-it-works">How it works</a>
          <a href="#analyzer">Analyzer</a>
          {reportGenerated && <a href="#results">Career Report</a>}
          <a href="#features">Features</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <a href="#analyzer" className="nav-cta">
            Analyze resume <span>↗</span>
          </a>
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl bg-white/10 text-white border-0 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden section-wrap py-4 px-5 bg-slate-900/95 border-b border-white/10 flex flex-col gap-3 text-sm">
          <a href="#how-it-works" onClick={() => setMobileNavOpen(false)}>
            How it works
          </a>
          <a href="#analyzer" onClick={() => setMobileNavOpen(false)}>
            Analyzer
          </a>
          {reportGenerated && (
            <a href="#results" onClick={() => setMobileNavOpen(false)}>
              Career Report
            </a>
          )}
          <a href="#features" onClick={() => setMobileNavOpen(false)}>
            Features
          </a>
        </div>
      )}

      <main>
        {/* HERO SECTION */}
        <section className="hero section-wrap" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span> AI CAREER READINESS
            </div>
            <h1>
              Your next career move
              <br />
              starts <span className="gradient-text">with clarity.</span>
            </h1>
            <p className="hero-subtitle">
              Match your resume against real roles, spot missing skills, and follow a personalized roadmap with Free and Paid courses.
            </p>
            <div className="hero-actions">
              <a href="#analyzer" className="button button-primary">
                Analyze my resume <span>↗</span>
              </a>
              <a href="#how-it-works" className="button button-ghost">
                <span>▶</span> How it works
              </a>
            </div>
            <div className="social-proof">
              <div className="avatar-stack">
                <span>AS</span>
                <span>PN</span>
                <span>RK</span>
                <span>+</span>
              </div>
              <div>
                <strong>Built for students &amp; job seekers</strong>
                <small>Instant skill gap analysis · Verified courses</small>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="dashboard-card floating-card">
              <div className="mock-top">
                <div>
                  <span className="tiny-label">CANDIDATE SNAPSHOT</span>
                  <h3 className="text-xl font-bold text-white">
                    {resume ? resume.contact.name : 'Your Match Report'}
                  </h3>
                </div>
                <span className="status-pill">
                  {resume ? 'Live' : 'Preview'}
                </span>
              </div>

              <div className="score-row">
                <div
                  className="score-ring"
                  style={{
                    background: `conic-gradient(#8b5cf6 0% ${heroScore}%, rgba(255, 255, 255, 0.08) ${heroScore}% 100%)`,
                  }}
                >
                  <div>
                    <strong className="tabular-nums">
                      {heroScore}
                      <span>%</span>
                    </strong>
                    <small>match</small>
                  </div>
                </div>
                <div className="score-copy">
                  <strong className="text-lg text-white">{heroRoleTitle}</strong>
                  <p className="text-sky-300 font-medium">
                    {customCompany || activeJob.companyName}
                  </p>
                  <span className="positive">
                    ↑ +{Math.max(12, Math.round(100 - heroScore))}% potential with roadmap
                  </span>
                </div>
              </div>

              <div className="mini-divider"></div>

              <div className="skill-head">
                <span>SKILL ALIGNMENT</span>
                <span className="tabular-nums">
                  {heroMatchedCount} of {heroTotalCount} matched
                </span>
              </div>

              {matchResult ? (
                <>
                  {matchResult.matchedSkills.slice(0, 2).map((m) => (
                    <div className="skill-line" key={m.jobSkill}>
                      <div>
                        <span>{m.jobSkill}</span>
                        <b className="tabular-nums">{Math.round(m.similarity * 100)}%</b>
                      </div>
                      <i>
                        <em style={{ width: `${Math.round(m.similarity * 100)}%` }}></em>
                      </i>
                    </div>
                  ))}
                  {skillGaps.slice(0, 1).map((g) => (
                    <div className="skill-line" key={g.skillName}>
                      <div>
                        <span>{g.skillName} (Gap)</span>
                        <b className="tabular-nums">35%</b>
                      </div>
                      <i className="bar-warn">
                        <em style={{ width: '35%' }}></em>
                      </i>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="skill-line">
                    <div>
                      <span>Python &amp; SQL</span>
                      <b className="tabular-nums">92%</b>
                    </div>
                    <i>
                      <em style={{ width: '92%' }}></em>
                    </i>
                  </div>
                  <div className="skill-line">
                    <div>
                      <span>REST APIs &amp; Git</span>
                      <b className="tabular-nums">96%</b>
                    </div>
                    <i>
                      <em style={{ width: '96%' }}></em>
                    </i>
                  </div>
                  <div className="skill-line">
                    <div>
                      <span>Cloud &amp; Spark</span>
                      <b className="tabular-nums">35%</b>
                    </div>
                    <i className="bar-warn">
                      <em style={{ width: '35%' }}></em>
                    </i>
                  </div>
                </>
              )}

              <div className="floating-tag tag-top">
                <span className="tag-icon purple">✦</span>
                <div>
                  <b>Top Gap</b>
                  <small>{skillGaps[0]?.skillName || 'Cloud & Spark'}</small>
                </div>
              </div>
              <div className="floating-tag tag-bottom">
                <span className="tag-icon green">✓</span>
                <div>
                  <b>Action Plan</b>
                  <small>Free &amp; Paid courses</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="trust-strip section-wrap">
          <span>BUILT FOR FAST CLARITY</span>
          <div className="trust-items">
            <span>✳ Skill gap detection</span>
            <span>◈ Interactive roadmap</span>
            <span>⌁ Free &amp; Paid courses</span>
            <span>↗ What-If score simulator</span>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section-wrap section-space" id="how-it-works">
          <div className="section-heading">
            <div className="eyebrow">3 SIMPLE STEPS</div>
            <h2>
              From resume to
              <br />
              <span className="gradient-text">actionable roadmap.</span>
            </h2>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <div className="step-number">
                01 <span>↗</span>
              </div>
              <div className="step-icon icon-purple">▤</div>
              <h3>Upload your resume</h3>
              <p>
                Drop a PDF, DOCX, or TXT file—or try an optional demo profile—and pick your target role and company.
              </p>
              <div className="step-foot">RESUME + TARGET ROLE</div>
            </article>

            <article className="step-card featured-step">
              <div className="step-number">
                02 <span>↗</span>
              </div>
              <div className="step-icon icon-blue">⌕</div>
              <h3>See what matches &amp; what’s missing</h3>
              <p>
                Get an instant compatibility score with matched skills and prioritized gaps.
              </p>
              <div className="step-foot">SKILL GAP ANALYSIS</div>
            </article>

            <article className="step-card">
              <div className="step-number">
                03 <span>↗</span>
              </div>
              <div className="step-icon icon-green">⌁</div>
              <h3>Follow your learning path</h3>
              <p>
                Explore your interactive skill tree, Free &amp; Paid courses, and portfolio projects.
              </p>
              <div className="step-foot">PERSONALIZED ROADMAP</div>
            </article>
          </div>
        </section>

        {/* ANALYZER SECTION */}
        <section className="analyzer-section" id="analyzer">
          <div className="section-wrap analyzer-layout">
            <div className="analyzer-intro">
              <div className="eyebrow">
                <span className="eyebrow-dot"></span> START YOUR ANALYSIS
              </div>
              <h2>
                Let’s map your
                <br />
                <span className="gradient-text">next career step.</span>
              </h2>
              <p>
                Upload your resume and choose a target role, or test right away with a sample student profile.
              </p>

              {/* Optional Demo Profile Selector */}
              <div className="privacy-note" style={{ flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <b>Optional: Try a demo profile</b>
                  <small>Click a sample student below to generate a live report:</small>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {SAMPLE_RESUMES.map((demo) => (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => handleSelectOptionalDemo(demo)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        background:
                          resume?.id === demo.id
                            ? 'linear-gradient(135deg, #7c3aed, #2563eb)'
                            : 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: '#ffffff',
                      }}
                    >
                      {demo.contact.name}
                    </button>
                  ))}
                  {resume && (
                    <button
                      type="button"
                      onClick={() => {
                        setResume(null);
                        setReportGenerated(false);
                        setUploadStatusMsg('');
                      }}
                      className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Live Selected Identity Preview inside Analyzer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Candidate
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {resume ? resume.contact.name : 'Not uploaded yet'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                    Target Role
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {selectedRoleName}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                    Goal Company
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {customCompany.trim() || 'Industry Benchmark'}
                  </div>
                </div>
              </div>
            </div>

            <div className="analyzer-panel">
              <div className="panel-heading">
                <div>
                  <span className="tiny-label">CAREER ANALYZER</span>
                  <h3>Build your report</h3>
                </div>
                <span className="panel-step">READY</span>
              </div>

              <form id="analyzerForm" onSubmit={(e) => handleGenerateReport(e)}>
                <div className="field-label">
                  <span>Resume (PDF, DOCX, TXT)</span>
                  <button
                    type="button"
                    onClick={() => setShowPasteResume((v) => !v)}
                    className="text-xs text-sky-400 hover:underline cursor-pointer bg-transparent border-0"
                  >
                    {showPasteResume ? 'Upload file instead' : 'Or paste text'}
                  </button>
                </div>

                {!showPasteResume ? (
                  <label
                    className={`upload-zone ${isDraggingFile ? 'drag-active' : ''}`}
                    id="uploadZone"
                    htmlFor="resumeFile"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={handleFileDrop}
                  >
                    <input
                      type="file"
                      id="resumeFile"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleResumeUpload}
                    />
                    <span className="upload-icon">↑</span>
                    <strong id="uploadTitle">
                      {isExtractingFile
                        ? 'Reading resume...'
                        : resume
                        ? `${resume.contact.name} (${resume.filename})`
                        : 'Drop your resume here'}
                    </strong>
                    <small id="uploadSub">
                      or <u>browse files</u>
                    </small>
                    <span className="upload-limit">MAX 10 MB</span>
                  </label>
                ) : (
                  <textarea
                    rows={4}
                    placeholder="Paste your resume text (education, skills, projects, experience)..."
                    value={pastedResumeText}
                    onChange={(e) => setPastedResumeText(e.target.value)}
                  />
                )}

                {uploadStatusMsg && (
                  <div className="mt-2.5 text-xs text-emerald-400 font-medium">
                    {uploadStatusMsg}
                  </div>
                )}

                <label className="field-label" htmlFor="jobRole">
                  Target Role <span>8 ROLES</span>
                </label>
                <div className="select-wrap">
                  <select
                    id="jobRole"
                    value={selectedRoleName}
                    onChange={(e) => setSelectedRoleName(e.target.value)}
                  >
                    {PRELOADED_ROLE_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.title}>
                        {tpl.title}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="field-label" htmlFor="goalCompanyInput">
                  Goal Company &amp; Job Description <span>OPTIONAL</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                  <input
                    id="goalCompanyInput"
                    type="text"
                    placeholder="Goal company (e.g. Google, Stripe, Razorpay)"
                    maxLength={100}
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                  />
                  <input
                    type="url"
                    placeholder="Job posting URL (optional)"
                    maxLength={300}
                    value={customJobUrl}
                    onChange={(e) => setCustomJobUrl(e.target.value)}
                  />
                </div>
                <textarea
                  id="jobDescription"
                  rows={2}
                  value={customJdText}
                  onChange={(e) => setCustomJdText(e.target.value)}
                  placeholder="Optional: Paste a custom job description..."
                ></textarea>

                <button
                  type="submit"
                  className="button button-primary analyze-button"
                  id="analyzeButton"
                >
                  Generate career report <span>↗</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* RESULTS & FULL INTELLIGENCE HUB */}
        {reportGenerated && resume && matchResult && (
          <section
            className="results-section section-wrap"
            id="results"
            ref={resultsSectionRef}
          >
            <div className="results-header">
              <div>
                <div className="eyebrow">CAREER INTELLIGENCE REPORT</div>
                <h2>
                  Your roadmap is <span className="gradient-text">ready.</span>
                </h2>
              </div>
              <span className="demo-badge">
                {loadingAi ? 'UPDATING AI COURSES...' : 'LIVE REPORT'}
              </span>
            </div>

            {/* HIGH-CONTRAST SPOTLIGHT BAR: CANDIDATE NAME, TARGET ROLE, GOAL COMPANY */}
            <div className="identity-spotlight-grid">
              {/* 1. Candidate / Resume Name Spotlight */}
              <div className="spotlight-card spotlight-candidate">
                <div className="flex items-center justify-between gap-2">
                  <span className="spotlight-label text-emerald-400">
                    <User className="w-3.5 h-3.5" />
                    <span>Candidate Profile</span>
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
                    {getAllResumeTechnicalSkills(resume).length} Skills
                  </span>
                </div>
                <div className="spotlight-value">{resume.contact.name}</div>
                <div className="spotlight-sub flex items-center justify-between gap-2">
                  <span className="truncate">{resume.filename}</span>
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('edit_profile')}
                    className="text-xs text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer p-0 shrink-0 font-semibold"
                  >
                    Edit skills ↗
                  </button>
                </div>
              </div>

              {/* 2. Target Role Spotlight (Interactive Switcher) */}
              <div className="spotlight-card spotlight-role">
                <div className="flex items-center justify-between gap-2">
                  <span className="spotlight-label text-violet-300">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Target Role</span>
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 font-semibold">
                    Switch Role
                  </span>
                </div>
                <div className="spotlight-value">{activeJob.title}</div>
                <div className="pt-1">
                  <select
                    aria-label="Switch target job role"
                    value={selectedRoleName}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      setSelectedRoleName(nextRole);
                      const nextJob =
                        PRELOADED_ROLE_TEMPLATES.find((t) => t.title === nextRole) ||
                        activeJob;
                      const nextMatch = matchResumeToJob(resume, nextJob, weights);
                      const nextGaps = buildSkillGaps(nextMatch, resume);
                      fetchAiIntelligence(
                        resume,
                        nextJob,
                        nextGaps.map((g) => g.skillName)
                      );
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-violet-400/30 text-xs text-slate-200 outline-none cursor-pointer"
                  >
                    {PRELOADED_ROLE_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.title}>
                        Switch to: {tpl.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Goal Company Spotlight (Interactive Inline Editor) */}
              <div className="spotlight-card spotlight-company">
                <div className="flex items-center justify-between gap-2">
                  <span className="spotlight-label text-sky-300">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Goal Company</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingGoalCompany((v) => !v)}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 font-semibold cursor-pointer border-0"
                  >
                    {editingGoalCompany ? 'Done' : 'Change'}
                  </button>
                </div>

                {editingGoalCompany ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Enter goal company (e.g. Google, Stripe)..."
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-sky-400/40 text-sm text-white outline-none"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['Google', 'Microsoft', 'Amazon', 'Razorpay', 'Flipkart'].map((co) => (
                        <button
                          key={co}
                          type="button"
                          onClick={() => {
                            setCustomCompany(co);
                            setEditingGoalCompany(false);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-slate-200 border-0 cursor-pointer"
                        >
                          {co}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="spotlight-value">
                      {customCompany.trim() || activeJob.companyName}
                    </div>
                    <div className="spotlight-sub flex items-center justify-between gap-2">
                      <span>
                        {customCompany.trim() ? 'Custom Target Company' : 'Industry Role Benchmark'}
                      </span>
                      {activeJob.sourceUrl && sanitizeExternalUrl(activeJob.sourceUrl) && (
                        <a
                          href={sanitizeExternalUrl(activeJob.sourceUrl)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Job Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top 3 Core Result Cards */}
            <div className="results-grid">
              <article className="result-card match-card">
                <span className="tiny-label">OVERALL COMPATIBILITY</span>
                <div className="big-score tabular-nums">
                  <strong id="matchScore">{matchResult.overallScore}</strong>
                  <span>%</span>
                </div>
                <div className="score-track">
                  <i
                    id="scoreTrack"
                    style={{ width: `${Math.min(100, matchResult.overallScore)}%` }}
                  ></i>
                </div>
                <p className="text-xs text-slate-400">
                  Mandatory met: <strong className="text-white">{matchResult.mandatorySatisfiedPct}%</strong> · Preferred met:{' '}
                  <strong className="text-white">{matchResult.preferredSatisfiedPct}%</strong>
                </p>
              </article>

              <article className="result-card">
                <span className="tiny-label">MATCHED SKILLS</span>
                <div className="result-number green-text tabular-nums">
                  {String(matchResult.matchedSkills.length).padStart(2, '0')}
                </div>
                <div className="chip-list" id="matchedSkills">
                  {matchResult.matchedSkills.map((m) => (
                    <span key={m.jobSkill}>
                      {m.jobSkill} ({Math.round(m.similarity * 100)}%)
                    </span>
                  ))}
                </div>
              </article>

              <article className="result-card">
                <span className="tiny-label">SKILLS TO BUILD</span>
                <div className="result-number purple-text tabular-nums">
                  {String(skillGaps.length).padStart(2, '0')}
                </div>
                <div className="chip-list missing-chips" id="missingSkills">
                  {skillGaps.map((g) => (
                    <span
                      key={g.skillName}
                      onClick={() => setActiveResultTab('detailed_roadmap')}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      title="Click to view in roadmap"
                    >
                      {g.skillName} · {g.tier}
                    </span>
                  ))}
                </div>
              </article>
            </div>

            {/* Clean Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 rounded-2xl bg-slate-900/80 border border-white/10">
              {[
                { id: 'detailed_roadmap', label: '01. Detailed Career Roadmap' },
                { id: 'evidence_gaps', label: '02. Skill Gaps & Evidence' },
                { id: 'simulator_resume', label: '03. Score Simulator & Resume AI' },
                { id: 'multijob_market', label: '04. Role Compare & Market Data' },
                { id: 'edit_profile', label: '05. Edit Skills' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveResultTab(tab.id as ResultTab)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0 ${
                    activeResultTab === tab.id
                      ? 'bg-violet-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: DETAILED CAREER ROADMAP */}
            {activeResultTab === 'detailed_roadmap' && (
              <div className="space-y-8">
                <InteractiveCareerRoadmap
                  resume={resume}
                  job={activeJob}
                  matchResult={matchResult}
                  skillGaps={skillGaps}
                  stages={stages}
                  advisor={advisor}
                  loadingAi={loadingAi}
                  onAskGeminiAdvisor={(query: string) =>
                    fetchAiIntelligence(
                      resume,
                      activeJob,
                      skillGaps.map((g) => g.skillName),
                      query
                    )
                  }
                />

                {/* 3-Stage Action Plan & Recommended Portfolio Projects (with Expandable Details) */}
                <div className="results-lower items-start">
                  <article className="result-card roadmap-card" id="roadmap-stages">
                    <div className="card-title-row">
                      <div>
                        <span className="tiny-label">MILESTONE CHECKLIST</span>
                        <h3>3-Stage Action Plan</h3>
                      </div>
                      <span className="time-pill">3 STAGES</span>
                    </div>

                    <div className="roadmap-list">
                      {stages.map((stage, idx) => {
                        const checked = Boolean(completedMilestones[idx]);
                        const isExpanded = Boolean(expandedStages[idx]);
                        return (
                          <div
                            key={idx}
                            className={`expandable-card ${isExpanded ? 'is-expanded' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setCompletedMilestones((prev) => ({
                                      ...prev,
                                      [idx]: !prev[idx],
                                    }))
                                  }
                                  className="accent-violet-500 w-4 h-4"
                                />
                                <b className="text-sm text-white">{stage.stageName}</b>
                              </label>

                              <div className="flex items-center gap-2">
                                <span className="roadmap-duration">
                                  {stage.estimatedCompletionTime}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedStages((prev) => ({
                                      ...prev,
                                      [idx]: !prev[idx],
                                    }))
                                  }
                                  className="expandable-chevron border-0 cursor-pointer"
                                  aria-label="Toggle stage details"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="expandable-content space-y-2 text-xs">
                                <ul className="space-y-1 text-slate-300">
                                  {(stage.learningObjectives || []).map((obj, oIdx) => (
                                    <li key={oIdx}>• {obj}</li>
                                  ))}
                                </ul>
                                <div className="p-2.5 rounded-lg bg-white/5 text-sky-300">
                                  <strong>Milestone Project:</strong> {stage.projectAssignment}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="roadmap-progress">
                      <div>
                        <span>Checklist progress</span>
                        <b id="progressLabel" className="tabular-nums">
                          {roadmapProgressPct}% complete
                        </b>
                      </div>
                      <div className="progress-track">
                        <i
                          id="progressBar"
                          style={{ width: `${roadmapProgressPct}%` }}
                        ></i>
                      </div>
                    </div>
                  </article>

                  <article className="result-card projects-card">
                    <span className="tiny-label">PORTFOLIO BUILDER</span>
                    <h3>Recommended Projects</h3>

                    <div className="space-y-3 mt-4">
                      {projects.map((proj, idx) => {
                        const isProjExpanded = Boolean(expandedProjects[idx]);
                        return (
                          <div
                            key={idx}
                            className={`expandable-card ${isProjExpanded ? 'is-expanded' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedProjects((prev) => ({
                                  ...prev,
                                  [idx]: !prev[idx],
                                }))
                              }
                              className="expandable-trigger"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`project-symbol ${
                                    idx === 1
                                      ? 'blue-symbol'
                                      : idx === 2
                                      ? 'green-symbol'
                                      : ''
                                  }`}
                                >
                                  {idx === 0 ? '⌘' : idx === 1 ? '⌁' : '▦'}
                                </div>
                                <div>
                                  <b className="text-sm text-white block">{proj.title}</b>
                                  <span className="text-[11px] text-slate-400">
                                    {proj.difficulty.toUpperCase()} · {proj.estimatedDuration.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <span className="expandable-chevron">
                                <ChevronDown className="w-4 h-4" />
                              </span>
                            </button>

                            {isProjExpanded && (
                              <div className="expandable-content space-y-2 text-xs text-slate-300">
                                <p>{proj.problemStatement}</p>
                                {proj.skillsCovered?.length > 0 && (
                                  <div className="text-sky-300">
                                    <strong>Skills:</strong> {proj.skillsCovered.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="button button-secondary mt-5 w-full"
                      id="printReport"
                      onClick={() => window.print()}
                    >
                      Print / Save Report <span>↗</span>
                    </button>
                  </article>
                </div>
              </div>
            )}

            {/* TAB 2: SKILL GAPS & EVIDENCE (Expandable Cards + Collapsible Rubric) */}
            {activeResultTab === 'evidence_gaps' && (
              <div className="space-y-8">
                {/* Prioritized Skill Gaps as Independent Expandable Cards */}
                <article className="result-card space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="tiny-label">PRIORITY GAPS</span>
                      <h3 className="text-lg font-bold text-white">
                        Skills to Build ({skillGaps.length})
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400">
                      Click any card to view why it matters &amp; practice task
                    </span>
                  </div>

                  <div className="dynamic-cards-grid">
                    {skillGaps.map((gap) => {
                      const isGapOpen = Boolean(expandedGaps[gap.skillName]);
                      return (
                        <div
                          key={gap.skillName}
                          className={`expandable-card ${isGapOpen ? 'is-expanded' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGaps((prev) => ({
                                ...prev,
                                [gap.skillName]: !prev[gap.skillName],
                              }))
                            }
                            className="expandable-trigger"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-xs mb-1">
                                <span className="text-violet-300 font-semibold">
                                  #{gap.recommendedPriorityRank} · {gap.tier}
                                </span>
                                <span className="text-slate-400">
                                  · {gap.estimatedDuration}
                                </span>
                              </div>
                              <div className="text-base font-bold text-white">
                                {gap.skillName}
                              </div>
                            </div>
                            <span className="expandable-chevron">
                              <ChevronDown className="w-4 h-4" />
                            </span>
                          </button>

                          {isGapOpen && (
                            <div className="expandable-content space-y-2.5 text-xs">
                              <p className="text-slate-300 leading-relaxed">
                                {gap.whyItMatters}
                              </p>
                              <div className="p-3 rounded-lg bg-white/5 text-slate-200">
                                <strong className="text-sky-300">Practice Task:</strong>{' '}
                                {gap.practicalExercise}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>

                {/* Expandable Scoring Weights Card */}
                <article className="result-card">
                  <button
                    type="button"
                    onClick={() => setShowWeightsPanel((v) => !v)}
                    className="expandable-trigger"
                  >
                    <div>
                      <span className="tiny-label">CUSTOMIZE SCORING WEIGHTS</span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        Role Weight Breakdown
                      </h3>
                    </div>
                    <span className="expandable-chevron">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showWeightsPanel ? 'rotate-180 text-sky-400' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {showWeightsPanel && (
                    <div className="expandable-content space-y-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setWeights(DEFAULT_SCORING_WEIGHTS)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Defaults</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs">
                        {[
                          { key: 'technicalSkills' as const, label: 'Technical', score: matchResult.technicalScore },
                          { key: 'projectsExperience' as const, label: 'Projects', score: matchResult.projectsExperienceScore },
                          { key: 'education' as const, label: 'Education', score: matchResult.educationScore },
                          { key: 'certifications' as const, label: 'Certifications', score: matchResult.certificationsScore },
                          { key: 'softSkills' as const, label: 'Soft Skills', score: matchResult.softSkillsScore },
                        ].map((item) => {
                          const pct = Math.round(weights[item.key] * 100);
                          return (
                            <div
                              key={item.key}
                              className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2"
                            >
                              <div className="flex justify-between text-slate-300">
                                <span>{item.label}</span>
                                <span className="tabular-nums font-bold text-white">{pct}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={80}
                                step={5}
                                value={pct}
                                onChange={(e) =>
                                  setWeights({
                                    ...weights,
                                    [item.key]: Number(e.target.value) / 100,
                                  })
                                }
                                className="w-full accent-violet-500 cursor-pointer"
                              />
                              <div className="text-[11px] text-emerald-400 tabular-nums">
                                Score: {item.score}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>

                {/* Expandable Resume Evidence Table */}
                <article className="result-card">
                  <button
                    type="button"
                    onClick={() => setShowEvidenceTable((v) => !v)}
                    className="expandable-trigger"
                  >
                    <div>
                      <span className="tiny-label">RESUME PROOF</span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        Matched Skills &amp; Supporting Evidence
                      </h3>
                    </div>
                    <span className="expandable-chevron">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showEvidenceTable ? 'rotate-180 text-sky-400' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {showEvidenceTable && (
                    <div className="expandable-content overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400">
                            <th className="py-3 pr-4">Requirement</th>
                            <th className="py-3 px-4">Resume Match</th>
                            <th className="py-3 px-4 text-right">Match %</th>
                            <th className="py-3 pl-4">Resume Evidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {[...matchResult.matchedSkills, ...matchResult.partialSkills].map(
                            (item) => (
                              <tr key={item.jobSkill}>
                                <td className="py-3.5 pr-4 font-bold text-white">
                                  {item.jobSkill}{' '}
                                  <span className="text-slate-400 font-normal">
                                    ({item.tier})
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-emerald-400">
                                  {item.resumeSkill}
                                </td>
                                <td className="py-3.5 px-4 text-right tabular-nums font-bold text-sky-300">
                                  {Math.round(item.similarity * 100)}%
                                </td>
                                <td className="py-3.5 pl-4 text-slate-300 max-w-md">
                                  “{item.resumeEvidence}”
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              </div>
            )}

            {/* TAB 3: CAREER WHAT-IF SIMULATOR & RESUME AI */}
            {activeResultTab === 'simulator_resume' && (
              <div className="space-y-8">
                <article className="result-card space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                      <span className="tiny-label">WHAT-IF SIMULATOR</span>
                      <h3 className="text-xl font-bold text-white">
                        Preview Your Score After Learning New Skills
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Projected Match</div>
                      <div className="text-3xl font-bold text-emerald-400 tabular-nums">
                        {projectedScore}%{' '}
                        <span className="text-sm text-sky-400">
                          (+{Number((projectedScore - matchResult.overallScore).toFixed(1))}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-300">
                        Select skills to simulate:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {skillGaps.map((g) => {
                          const active = selectedSimSkills.includes(g.skillName);
                          return (
                            <button
                              key={g.skillName}
                              type="button"
                              onClick={() =>
                                setSelectedSimSkills((prev) =>
                                  prev.includes(g.skillName)
                                    ? prev.filter((x) => x !== g.skillName)
                                    : [...prev, g.skillName]
                                )
                              }
                              className="p-3.5 rounded-xl text-left flex items-center justify-between text-xs cursor-pointer transition-all"
                              style={{
                                background: active
                                  ? 'rgba(16, 185, 129, 0.18)'
                                  : 'rgba(15, 23, 42, 0.6)',
                                border: active
                                  ? '1px solid rgba(16, 185, 129, 0.5)'
                                  : '1px solid rgba(255,255,255,0.1)',
                                color: '#ffffff',
                              }}
                            >
                              <span>
                                <strong>{g.skillName}</strong> ({g.tier})
                              </span>
                              <input type="checkbox" checked={active} readOnly />
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIncludeCapstoneProject((v) => !v)}
                        className="w-full p-4 rounded-xl text-left flex items-center justify-between text-xs cursor-pointer mt-2"
                        style={{
                          background: includeCapstoneProject
                            ? 'rgba(139, 92, 246, 0.22)'
                            : 'rgba(15, 23, 42, 0.6)',
                          border: includeCapstoneProject
                            ? '1px solid rgba(139, 92, 246, 0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                          color: '#ffffff',
                        }}
                      >
                        <span>
                          <strong>+ Add 1 Targeted Portfolio Project</strong>
                        </span>
                        <input type="checkbox" checked={includeCapstoneProject} readOnly />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-300">
                        Score Progression:
                      </div>
                      <div className="space-y-3">
                        {simulatedProgression.map((step, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-200">{step.label}</span>
                              <span className="font-bold text-emerald-400 tabular-nums">
                                {step.score}%
                              </span>
                            </div>
                            <div className="score-track">
                              <i style={{ width: `${Math.min(100, step.score)}%` }}></i>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>

                {/* Resume Improvement Assistant */}
                {improvementReport && (
                  <article className="result-card space-y-5">
                    <div>
                      <span className="tiny-label">RESUME AI ASSISTANT</span>
                      <h3 className="text-lg font-bold text-white">
                        Suggested Resume Upgrades
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs items-start">
                      <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                        <div className="font-bold text-violet-300">
                          Professional Summary Draft
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          “{improvementReport.professionalSummary.improvedDraft}”
                        </p>
                      </div>

                      <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                        <div className="font-bold text-sky-300">
                          ATS Skill Grouping
                        </div>
                        <ul className="space-y-1 text-slate-300">
                          {(
                            improvementReport.technicalSkillsSection
                              .recommendedGrouping || []
                          ).map((g, i) => (
                            <li key={i}>· {g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                )}
              </div>
            )}

            {/* TAB 4: MULTI-JOB COMPARISON & MARKET BENCHMARKS */}
            {activeResultTab === 'multijob_market' && (
              <div className="space-y-8">
                <article className="result-card space-y-5">
                  <div>
                    <span className="tiny-label">ROLE COMPARISON</span>
                    <h3 className="text-lg font-bold text-white">
                      Your Fit Across All 8 Tech Roles
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    {PRELOADED_ROLE_TEMPLATES.map((tpl) => {
                      const res = matchResumeToJob(resume, tpl, weights);
                      const isCurrent = tpl.title === activeJob.title;
                      return (
                        <div
                          key={tpl.id}
                          className={`p-4 rounded-xl bg-slate-900/60 border flex flex-col justify-between gap-3 ${
                            isCurrent ? 'border-violet-500/60' : 'border-white/10'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold text-white">{tpl.title}</div>
                            <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">
                              {res.overallScore}%
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Mandatory: {res.mandatorySatisfiedPct}% · Gaps:{' '}
                              {res.missingSkills.length}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoleName(tpl.title);
                              setCustomJdText('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white cursor-pointer border-0"
                          >
                            {isCurrent ? 'Active Role' : `Switch to ${tpl.title}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>

                {/* Market Benchmark */}
                <article className="result-card space-y-6">
                  <div>
                    <span className="tiny-label">
                      MARKET DEMAND · {benchmark.metadata.primarySampleSize.toLocaleString()} POSTINGS
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      In-Demand Roles &amp; Technologies
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-violet-300 uppercase">
                        Top Roles
                      </div>
                      {benchmark.popularJobRoles.map((r) => (
                        <div className="skill-line" key={r.role}>
                          <div>
                            <span>{r.role}</span>
                            <b className="tabular-nums">{r.sharePct}%</b>
                          </div>
                          <i>
                            <em style={{ width: `${Math.min(100, r.sharePct * 4)}%` }}></em>
                          </i>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-bold text-sky-300 uppercase">
                        Top Requested Skills
                      </div>
                      {benchmark.frequentlyMentionedTechnologies.map((t) => (
                        <div className="skill-line" key={t.skill}>
                          <div>
                            <span>{t.skill}</span>
                            <b className="tabular-nums">{t.demandPct}%</b>
                          </div>
                          <i>
                            <em style={{ width: `${Math.min(100, t.demandPct * 2.5)}%` }}></em>
                          </i>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </div>
            )}

            {/* TAB 5: EDIT EXTRACTED SKILLS */}
            {activeResultTab === 'edit_profile' && (
              <div className="space-y-8">
                <article className="result-card space-y-5">
                  <div>
                    <span className="tiny-label">SKILL EDITOR</span>
                    <h3 className="text-lg font-bold text-white">
                      {resume.contact.name}’s Extracted Skills ({getAllResumeTechnicalSkills(resume).length})
                    </h3>
                  </div>

                  <div className="flex gap-2.5 max-w-md">
                    <input
                      type="text"
                      placeholder="Add a skill (e.g. Apache Spark, Docker)..."
                      maxLength={60}
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cleanSkill = sanitizeShortField(newSkillInput, 60);
                        if (!cleanSkill) return;
                        setResume({
                          ...resume,
                          technicalSkills: Array.from(
                            new Set([...resume.technicalSkills, cleanSkill])
                          ),
                        });
                        setNewSkillInput('');
                      }}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-xs font-semibold text-white cursor-pointer border-0"
                    >
                      + Add Skill
                    </button>
                  </div>

                  <div className="chip-list">
                    {getAllResumeTechnicalSkills(resume).map((s) => (
                      <span key={s} className="inline-flex items-center gap-1.5">
                        {s}
                        <button
                          type="button"
                          title={`Remove ${s}`}
                          onClick={() => {
                            setResume({
                              ...resume,
                              technicalSkills: resume.technicalSkills.filter((x) => x !== s),
                              programmingLanguages: resume.programmingLanguages.filter((x) => x !== s),
                              frameworksLibraries: resume.frameworksLibraries.filter((x) => x !== s),
                              databases: resume.databases.filter((x: string) => x !== s),
                              cloudDevops: resume.cloudDevops.filter((x: string) => x !== s),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-400 bg-transparent border-0 cursor-pointer p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </article>

                {/* Collapsible Raw Resume Text */}
                <article className="result-card">
                  <button
                    type="button"
                    onClick={() => setShowRawResumeText((v) => !v)}
                    className="expandable-trigger"
                  >
                    <div>
                      <span className="tiny-label">SOURCE TEXT</span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        Extracted Resume Text
                      </h3>
                    </div>
                    <span className="expandable-chevron">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showRawResumeText ? 'rotate-180 text-sky-400' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {showRawResumeText && (
                    <div className="expandable-content">
                      <pre className="p-4 rounded-xl bg-slate-950/90 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto max-h-72 whitespace-pre-wrap">
                        {resume.rawText}
                      </pre>
                    </div>
                  )}
                </article>
              </div>
            )}
          </section>
        )}

        {/* FEATURES SECTION */}
        <section className="features-section section-wrap section-space" id="features">
          <div className="section-heading">
            <div className="eyebrow">WHY CAREERMATCH AI</div>
            <h2>
              Career growth, <span className="gradient-text">made actionable.</span>
            </h2>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <span className="feature-icon icon-purple">◉</span>
              <h3>Clear role matching</h3>
              <p>
                See how your skills and projects line up against mandatory and preferred role requirements.
              </p>
              <span className="feature-index">01 / INSIGHT</span>
            </article>

            <article className="feature-card">
              <span className="feature-icon icon-blue">⌘</span>
              <h3>Interactive skill roadmap</h3>
              <p>
                Explore your personalized skill tree with Free and Paid courses for every milestone.
              </p>
              <span className="feature-index">02 / ROADMAP</span>
            </article>

            <article className="feature-card">
              <span className="feature-icon icon-green">⌁</span>
              <h3>What-If score simulator</h3>
              <p>
                Preview how learning specific skills or building a capstone project boosts your job match.
              </p>
              <span className="feature-index">03 / SIMULATOR</span>
            </article>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta section-wrap">
          <div>
            <div className="eyebrow">READY TO START?</div>
            <h2>
              Make your next move
              <br />
              <span className="gradient-text">a smarter one.</span>
            </h2>
          </div>
          <a href="#analyzer" className="button button-primary">
            Build my career roadmap <span>↗</span>
          </a>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer section-wrap">
        <a className="brand" href="#home">
          <span className="brand-mark">✳</span>
          <span>
            career<span className="brand-accent">match</span>
            <sup>AI</sup>
          </span>
        </a>
        <span>Built for ambitious students &amp; job seekers.</span>
        <span>© 2026 CareerMatch AI</span>
      </footer>
    </div>
  );
}
