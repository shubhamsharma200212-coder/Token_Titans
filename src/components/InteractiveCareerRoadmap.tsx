import React, { useMemo, useState } from 'react';
import {
  ExternalLink,
  ChevronDown,
  Globe,
} from 'lucide-react';
import {
  ResumeProfile,
  JobRoleProfile,
  MatchAnalysisResult,
  SkillGapDetail,
  LearningStage,
} from '../data/careerData';
import { sanitizeExternalUrl, sanitizeShortField } from '../utils/security';

export interface ViableCourseItem {
  title: string;
  provider: string;
  instructorOrOrg?: string;
  pricingType: 'Free' | 'Paid';
  priceDetail?: string;
  skillFocus: string;
  duration: string;
  certificateIncluded?: boolean;
  url: string;
  whyViable: string;
}

export interface AdvisorPayload {
  skillsToAcquire: Array<{
    skill: string;
    urgency: string;
    reason: string;
    howToProve: string;
  }>;
  viableCourses: ViableCourseItem[];
  websitesAndMaterials: Array<{
    name: string;
    category: string;
    url: string;
    summary: string;
  }>;
}

interface RoadmapTreeNode {
  id: string;
  skillName: string;
  phaseIndex: number;
  phaseTitle: string;
  status: 'mastered' | 'mandatory_gap' | 'preferred_gap' | 'partial_bridge';
  statusLabel: string;
  estimatedTime: string;
  whyItMatters: string;
  subtopics: string[];
  practicalTask: string;
  freeCourse: {
    title: string;
    platform: string;
    url: string;
  };
  paidCourse: {
    title: string;
    platform: string;
    priceNote: string;
    url: string;
  };
}

interface InteractiveCareerRoadmapProps {
  resume: ResumeProfile;
  job: JobRoleProfile;
  matchResult: MatchAnalysisResult;
  skillGaps: SkillGapDetail[];
  stages: LearningStage[];
  advisor: AdvisorPayload | null;
  loadingAi: boolean;
  onAskGeminiAdvisor: (customFocus: string) => void;
}

const SKILL_SUBTOPICS_CURATED: Record<
  string,
  {
    subtopics: string[];
    freeCourse: { title: string; platform: string; url: string };
    paidCourse: { title: string; platform: string; priceNote: string; url: string };
  }
> = {
  Python: {
    subtopics: ['Data structures, generators & typing', 'Virtual environments & pytest testing', 'Async I/O & modular packaging'],
    freeCourse: { title: 'Scientific Computing & Python Curriculum', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn' },
    paidCourse: { title: 'Python for Everybody & Data Engineering Specialization', platform: 'Coursera', priceNote: 'Paid Certificate (Free Audit)', url: 'https://www.coursera.org/' },
  },
  SQL: {
    subtopics: ['Window functions (ROW_NUMBER, LAG/LEAD)', 'CTEs, query plans & composite indexing', 'Transactions & ACID isolation levels'],
    freeCourse: { title: 'Interactive SQL & Analytics Tutorial', platform: 'Kaggle Learn', url: 'https://www.kaggle.com/learn' },
    paidCourse: { title: 'Learn SQL Basics for Data Science Specialization', platform: 'Coursera (UC Davis)', priceNote: 'Paid Verified Certificate', url: 'https://www.coursera.org/' },
  },
  React: {
    subtopics: ['Component state, Hooks & custom hooks', 'Performance optimization & memoization', 'Accessible routing & API state synchronization'],
    freeCourse: { title: 'Official React.dev Interactive Learn Track', platform: 'React.dev', url: 'https://react.dev/learn' },
    paidCourse: { title: 'Meta Front-End Developer Professional Certificate', platform: 'Coursera (Meta)', priceNote: 'Paid Accredited Track', url: 'https://www.coursera.org/' },
  },
  TypeScript: {
    subtopics: ['Strict typing, generics & utility types', 'Discriminated unions & runtime schema validation', 'Typed REST/GraphQL client contracts'],
    freeCourse: { title: 'TypeScript Official Handbook & Playground', platform: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/' },
    paidCourse: { title: 'Understanding TypeScript — Production Bootcamp', platform: 'Udemy', priceNote: 'Paid One-Time Access', url: 'https://www.udemy.com/' },
  },
  'Apache Spark': {
    subtopics: ['Spark SQL, DataFrames & Catalyst optimizer', 'Partitioning, bucketing & broadcast joins', 'Structured Streaming & fault tolerance'],
    freeCourse: { title: 'Apache Spark Official Quickstart & Programming Guide', platform: 'Apache.org', url: 'https://spark.apache.org/docs/latest/' },
    paidCourse: { title: 'Big Data Analysis with Scala and Spark', platform: 'Coursera (EPFL)', priceNote: 'Paid Certificate Track', url: 'https://www.coursera.org/' },
  },
  AWS: {
    subtopics: ['IAM least-privilege roles & VPC security', 'S3 storage classes, Glue ETL & Athena', 'ECS/Lambda serverless deployment & CloudWatch'],
    freeCourse: { title: 'AWS Cloud Practitioner Essentials (Digital Training)', platform: 'AWS Skill Builder', url: 'https://explore.skillbuilder.aws/' },
    paidCourse: { title: 'AWS Certified Solutions Architect / Developer Prep', platform: 'Udemy / Coursera', priceNote: 'Paid Exam Prep + Labs', url: 'https://www.coursera.org/' },
  },
  Docker: {
    subtopics: ['Multi-stage Dockerfiles & layer caching', 'Non-root container security hardening', 'Docker Compose multi-service networking'],
    freeCourse: { title: 'Introduction to Containers & Docker Labs', platform: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/' },
    paidCourse: { title: 'Docker & Kubernetes: The Practical Guide', platform: 'Udemy', priceNote: 'Paid Hands-On Course', url: 'https://www.udemy.com/' },
  },
  Kubernetes: {
    subtopics: ['Pods, Deployments, Services & Ingress', 'ConfigMaps, Secrets & RBAC policies', 'Horizontal Pod Autoscaling & liveness probes'],
    freeCourse: { title: 'Introduction to Kubernetes (LFS158)', platform: 'edX / Linux Foundation', url: 'https://www.edx.org/' },
    paidCourse: { title: 'Certified Kubernetes Application Developer (CKAD)', platform: 'Coursera / Udemy', priceNote: 'Paid Certification Track', url: 'https://www.udemy.com/' },
  },
};

export const InteractiveCareerRoadmap: React.FC<InteractiveCareerRoadmapProps> = ({
  job,
  matchResult,
  skillGaps,
  advisor,
  loadingAi,
  onAskGeminiAdvisor,
}) => {
  const roadmapNodes: RoadmapTreeNode[] = useMemo(() => {
    const nodes: RoadmapTreeNode[] = [];

    const buildNode = (
      skillName: string,
      phaseIndex: number,
      phaseTitle: string,
      status: RoadmapTreeNode['status'],
      statusLabel: string,
      estimatedTime: string,
      whyItMatters: string,
      practicalTask: string
    ): RoadmapTreeNode => {
      const curated = SKILL_SUBTOPICS_CURATED[skillName];
      return {
        id: `node-${phaseIndex}-${skillName}`,
        skillName,
        phaseIndex,
        phaseTitle,
        status,
        statusLabel,
        estimatedTime,
        whyItMatters,
        subtopics: curated?.subtopics || [
          `Core concepts & patterns in ${skillName}`,
          `Production error handling & security in ${skillName}`,
          `Testing & performance optimization with ${skillName}`,
        ],
        practicalTask,
        freeCourse: curated?.freeCourse || {
          title: `${skillName} Interactive Learning Path`,
          platform: 'Microsoft Learn / freeCodeCamp',
          url: 'https://learn.microsoft.com/en-us/training/',
        },
        paidCourse: curated?.paidCourse || {
          title: `${skillName} Professional Specialization`,
          platform: 'Coursera / Udemy',
          priceNote: 'Paid Verified Certificate',
          url: 'https://www.coursera.org/',
        },
      };
    };

    // Phase 1: Verified Foundation Nodes from Candidate Resume
    const phase1Matched = matchResult.matchedSkills.slice(0, 4);
    for (const m of phase1Matched) {
      nodes.push(
        buildNode(
          m.jobSkill,
          1,
          'Phase 01 · Verified Foundations',
          'mastered',
          '✓ In Resume',
          'Ready',
          m.explanation,
          `Demonstrated in resume: "${m.resumeEvidence}"`
        )
      );
    }

    // Phase 2: Ecosystem Bridges & Partial Matches
    const phase2Partial = matchResult.partialSkills;
    for (const p of phase2Partial) {
      nodes.push(
        buildNode(
          p.jobSkill,
          2,
          'Phase 02 · Core Stack Bridges',
          'partial_bridge',
          `◈ Bridge from ${p.resumeSkill}`,
          '1–2 Weeks',
          p.explanation,
          `Adapt a module from your ${p.resumeSkill} project into ${p.jobSkill}.`
        )
      );
    }

    for (const m of matchResult.matchedSkills.slice(4)) {
      nodes.push(
        buildNode(
          m.jobSkill,
          2,
          'Phase 02 · Core Stack Bridges',
          'mastered',
          '✓ In Resume',
          'Ready',
          m.explanation,
          `Demonstrated in resume: "${m.resumeEvidence}"`
        )
      );
    }

    // Phase 3: Mandatory Role Skill Gaps
    const mandatoryGaps = skillGaps.filter((g) => g.tier === 'Mandatory');
    for (const g of mandatoryGaps) {
      nodes.push(
        buildNode(
          g.skillName,
          3,
          'Phase 03 · Mandatory Skill Gaps',
          'mandatory_gap',
          '⚡ Priority Gap',
          g.estimatedDuration,
          g.whyItMatters,
          g.practicalExercise
        )
      );
    }

    // Phase 4: Preferred & Production Differentiators
    const preferredGaps = skillGaps.filter((g) => g.tier !== 'Mandatory');
    for (const g of preferredGaps) {
      nodes.push(
        buildNode(
          g.skillName,
          4,
          'Phase 04 · Production & Cloud Mastery',
          'preferred_gap',
          `★ ${g.tier}`,
          g.estimatedDuration,
          g.whyItMatters,
          g.practicalExercise
        )
      );
    }

    return nodes;
  }, [matchResult, skillGaps]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    () => roadmapNodes.find((n) => n.status !== 'mastered')?.id || roadmapNodes[0]?.id || ''
  );

  const [userCompletedNodeIds, setUserCompletedNodeIds] = useState<Record<string, boolean>>({});
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'Free' | 'Paid'>('ALL');
  const [customCourseQuery, setCustomCourseQuery] = useState('');
  const [showInspectorDetails, setShowInspectorDetails] = useState<boolean>(false);
  const [expandedCourses, setExpandedCourses] = useState<Record<number, boolean>>({});
  const [expandedSites, setExpandedSites] = useState<Record<number, boolean>>({});

  const selectedNode =
    roadmapNodes.find((n) => n.id === selectedNodeId) || roadmapNodes[0] || null;

  const isNodeComplete = (node: RoadmapTreeNode) =>
    node.status === 'mastered' || Boolean(userCompletedNodeIds[node.id]);

  const completedNodesCount = roadmapNodes.filter(isNodeComplete).length;
  const totalNodesCount = Math.max(1, roadmapNodes.length);
  const overallTreePct = Math.round((completedNodesCount / totalNodesCount) * 100);

  const groupedPhases = useMemo(() => {
    const map = new Map<number, { title: string; items: RoadmapTreeNode[] }>();
    for (const node of roadmapNodes) {
      if (!map.has(node.phaseIndex)) {
        map.set(node.phaseIndex, { title: node.phaseTitle, items: [] });
      }
      map.get(node.phaseIndex)!.items.push(node);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [roadmapNodes]);

  const filteredCourses = useMemo(() => {
    const list = advisor?.viableCourses || [];
    if (courseFilter === 'ALL') return list;
    return list.filter((c) => c.pricingType === courseFilter);
  }, [advisor, courseFilter]);

  return (
    <div className="space-y-8">
      {/* SECTION 1: INTERACTIVE VISUAL SKILL TREE */}
      <article className="result-card space-y-6" id="roadmap">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <span className="tiny-label">PERSONALIZED SKILL MAP</span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {job.title} Roadmap
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select any skill node to view topics and Free or Paid courses.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Skills Mastered
              </div>
              <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                {overallTreePct}%{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({completedNodesCount}/{totalNodesCount})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Legend & Progress */}
        <div className="space-y-2.5">
          <div className="progress-track">
            <i style={{ width: `${overallTreePct}%` }}></i>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              Verified / Done
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block"></span>
              Priority Gap
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
              Bridge / Preferred
            </span>
          </div>
        </div>

        {/* Two-Column Split: Left Visual Tree (7 cols) + Right Sticky Node Inspector (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Visual Connected Tree */}
          <div className="lg:col-span-7 roadmap-tree-container">
            {groupedPhases.map(([phaseIdx, phaseGroup]) => (
              <div key={phaseIdx} className="roadmap-phase-block">
                <div className="roadmap-phase-pill">{phaseGroup.title}</div>
                <div className="roadmap-nodes-row">
                  {phaseGroup.items.map((node) => {
                    const completed = isNodeComplete(node);
                    const isSelected = selectedNode?.id === node.id;
                    const cardClass = completed
                      ? 'node-mastered'
                      : node.status === 'mandatory_gap'
                      ? 'node-gap-mandatory'
                      : 'node-gap-preferred';

                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`roadmap-node-card ${cardClass} ${
                          isSelected ? 'node-selected' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                          <span
                            className={
                              completed
                                ? 'text-emerald-400 font-semibold'
                                : node.status === 'mandatory_gap'
                                ? 'text-violet-300 font-semibold'
                                : 'text-sky-300 font-semibold'
                            }
                          >
                            {completed && node.status !== 'mastered'
                              ? '✓ Done'
                              : node.statusLabel}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            {node.estimatedTime}
                          </span>
                        </div>
                        <div className="text-base font-bold text-white">
                          {node.skillName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Sticky Node Inspector */}
          {selectedNode && (
            <div className="lg:col-span-5 lg:sticky lg:top-24 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-white/15 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                <div>
                  <span className="tiny-label">{selectedNode.phaseTitle}</span>
                  <h4 className="text-xl font-bold text-white mt-0.5">
                    {selectedNode.skillName}
                  </h4>
                </div>

                {selectedNode.status !== 'mastered' ? (
                  <button
                    type="button"
                    onClick={() =>
                      setUserCompletedNodeIds((prev) => ({
                        ...prev,
                        [selectedNode.id]: !prev[selectedNode.id],
                      }))
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 transition-all ${
                      userCompletedNodeIds[selectedNode.id]
                        ? 'bg-emerald-600 text-white'
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    {userCompletedNodeIds[selectedNode.id] ? '✓ Done' : 'Mark Done'}
                  </button>
                ) : (
                  <span className="course-badge-free">In Resume</span>
                )}
              </div>

              {/* Concise Subtopics */}
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-200">Key Topics</div>
                <ul className="space-y-1 text-slate-300">
                  {selectedNode.subtopics.map((sub, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-sky-400">▹</span>
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expandable Explanation & Practice Task */}
              <div
                className={`expandable-card ${
                  showInspectorDetails ? 'is-expanded' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowInspectorDetails((v) => !v)}
                  className="expandable-trigger"
                >
                  <div>
                    <div className="text-xs font-bold text-sky-300">
                      Why it matters &amp; practice task
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {showInspectorDetails ? 'Hide details' : 'Click to expand'}
                    </div>
                  </div>
                  <span className="expandable-chevron">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {showInspectorDetails && (
                  <div className="expandable-content space-y-2.5 text-xs">
                    <p className="text-slate-300 leading-relaxed">
                      {selectedNode.whyItMatters}
                    </p>
                    <div className="p-2.5 rounded-lg bg-white/5 text-slate-200">
                      <strong className="text-emerald-300">Practice:</strong>{' '}
                      {selectedNode.practicalTask}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Free & Paid Verified Courses for this Skill */}
              <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
                <div className="font-bold text-slate-200">
                  Recommended Courses ({selectedNode.skillName})
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="course-badge-free">Free</span>
                      <span className="text-slate-400">{selectedNode.freeCourse.platform}</span>
                    </div>
                    <div className="font-semibold text-white">
                      {selectedNode.freeCourse.title}
                    </div>
                  </div>
                  {sanitizeExternalUrl(selectedNode.freeCourse.url, true) && (
                    <a
                      href={sanitizeExternalUrl(selectedNode.freeCourse.url, true)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center gap-1 font-semibold shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-violet-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="course-badge-paid">Paid</span>
                      <span className="text-slate-400">{selectedNode.paidCourse.platform}</span>
                    </div>
                    <div className="font-semibold text-white">
                      {selectedNode.paidCourse.title}
                    </div>
                  </div>
                  {sanitizeExternalUrl(selectedNode.paidCourse.url, true) && (
                    <a
                      href={sanitizeExternalUrl(selectedNode.paidCourse.url, true)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 inline-flex items-center gap-1 font-semibold shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* SECTION 2: ONLINE COURSES DIRECTORY (FREE & PAID) WITH DYNAMIC EXPANDABLE CARDS */}
      <article className="result-card space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <span className="tiny-label">VERIFIED LEARNING PATHS</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              Online Courses (Free &amp; Paid)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'Free', 'Paid'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setCourseFilter(tier)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 transition-all ${
                  courseFilter === tier
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {tier === 'ALL'
                  ? `All (${advisor?.viableCourses.length || 0})`
                  : tier === 'Free'
                  ? 'Free Only'
                  : 'Paid & Certified'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom AI Topic Filter */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAskGeminiAdvisor(sanitizeShortField(customCourseQuery, 200));
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            placeholder="Search courses for a specific topic (e.g. System Design, AWS, PyTorch)..."
            value={customCourseQuery}
            onChange={(e) => setCustomCourseQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white"
          />
          <button
            type="submit"
            disabled={loadingAi}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white whitespace-nowrap cursor-pointer border-0"
          >
            {loadingAi ? 'Updating...' : 'Find Courses ↗'}
          </button>
        </form>

        {/* Dynamic Expandable Course Cards Grid (align-items: start so expanding one never stretches neighbors) */}
        <div className="dynamic-cards-grid">
          {filteredCourses.map((course, idx) => {
            const safeUrl = sanitizeExternalUrl(course.url, true);
            const isFree = course.pricingType === 'Free';
            const expanded = Boolean(expandedCourses[idx]);

            return (
              <div
                key={idx}
                className={`expandable-card ${expanded ? 'is-expanded' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className={isFree ? 'course-badge-free' : 'course-badge-paid'}>
                    {isFree ? 'Free' : 'Paid'}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {course.provider}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white leading-snug">
                  {course.title}
                </h4>

                <div className="text-xs text-slate-400 mt-1">
                  {course.duration} · <span className="text-sky-300">{course.skillFocus}</span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCourses((prev) => ({
                        ...prev,
                        [idx]: !prev[idx],
                      }))
                    }
                    className="text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-medium"
                  >
                    <span>{expanded ? 'Hide details' : 'Why this course'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        expanded ? 'rotate-180 text-sky-400' : ''
                      }`}
                    />
                  </button>

                  {safeUrl && (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Open Course</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {expanded && (
                  <div className="expandable-content space-y-2 text-xs">
                    <p className="text-slate-300 leading-relaxed">
                      {course.whyViable}
                    </p>
                    {course.instructorOrOrg && (
                      <div className="text-slate-400">
                        Instructor / Org: <strong className="text-white">{course.instructorOrOrg}</strong>
                      </div>
                    )}
                    <div className="text-slate-400">
                      Access: <strong className="text-white">{course.priceDetail || course.pricingType}</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Verified Practice Websites, Sandboxes & Study Materials */}
        {advisor && advisor.websitesAndMaterials.length > 0 && (
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Verified Practice Websites, Sandboxes &amp; Study Materials</span>
            </div>

            <div className="dynamic-cards-grid">
              {advisor.websitesAndMaterials.map((site, i) => {
                const safeSiteUrl = sanitizeExternalUrl(site.url, true);
                const siteExpanded = Boolean(expandedSites[i]);

                return (
                  <div
                    key={i}
                    className={`expandable-card ${siteExpanded ? 'is-expanded' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          {site.category}
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {site.name}
                        </div>
                      </div>
                      {safeSiteUrl && (
                        <a
                          href={safeSiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold shrink-0"
                        >
                          <span>Visit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSites((prev) => ({
                            ...prev,
                            [i]: !prev[i],
                          }))
                        }
                        className="text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                      >
                        <span>{siteExpanded ? 'Hide overview' : 'What to practice'}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            siteExpanded ? 'rotate-180 text-sky-400' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {siteExpanded && (
                      <div className="expandable-content text-xs text-slate-300 leading-relaxed">
                        {site.summary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};
