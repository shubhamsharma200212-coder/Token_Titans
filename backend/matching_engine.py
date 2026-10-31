"""
Job Description Parsing, Honest Skill-Match Scoring, Skill Gap Ranking,
and Interactive Roadmap Builder for CareerMatch AI.
Phase 1 improvements:
- Whole-word regex matching + heading-aware JD parsing (Mandatory / Preferred / Optional)
  with Gemini response_schema extraction and deterministic fallback (no 65/35 split)
- Zero padded baselines and no fake 0.96 similarity in match_resume_to_job
- Weights: Mandatory 60%, Preferred 15%, Projects/Experience 15%, Education 5%, Certifications 5%
- Adjacent skills give 0 points and are labeled "Adjacent skill" ("You know X, which helps with Y")
- Returns explainable scoreBreakdown
"""

import json
import os
import re
from typing import Any, Dict, List, Optional

from backend.ai_service import extract_jd_requirements_with_gemini
from backend.resume_parser import (
    KNOWN_SKILLS_CATALOG,
    has_whole_word,
    sanitize_plain_text,
    sanitize_short_field,
)

DEFAULT_WEIGHTS: Dict[str, float] = {
    "mandatorySkills": 0.60,
    "preferredSkills": 0.15,
    "projectsExperience": 0.15,
    "education": 0.05,
    "certifications": 0.05,
}

# Adjacent technologies: give 0 points toward the score, but inform the user "You know X, which helps with Y"
ADJACENT_SKILLS: Dict[str, List[str]] = {
    "Django": ["Flask", "FastAPI"],
    "Flask": ["Django", "FastAPI"],
    "FastAPI": ["Flask", "Django"],
    "React": ["HTML/CSS", "JavaScript", "TypeScript"],
    "TypeScript": ["JavaScript"],
    "Kubernetes": ["Docker"],
    "Apache Spark": ["Python", "SQL", "Pandas & NumPy"],
    "Airflow": ["Python", "SQL"],
    "Spring Boot": ["Java", "REST APIs"],
    "Deep Learning": ["Machine Learning", "Python"],
    "AWS": ["Docker", "Linux", "CI/CD"],
}

ROLE_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "role-fullstack",
        "title": "Full Stack Developer",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "REST APIs", "Git"],
        "preferredSkills": ["Docker", "AWS", "Redis", "Automated Testing", "CI/CD"],
        "optionalSkills": [],
        "softSkills": ["Problem Solving", "Communication", "Agile & Scrum"],
        "educationRequired": "B.Tech / B.E. in CS/IT or equivalent practical portfolio",
    },
    {
        "id": "role-data-eng",
        "title": "Data Engineer",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["Python", "SQL", "Apache Spark", "Airflow", "Data Warehousing", "Git"],
        "preferredSkills": ["AWS", "Kafka", "Linux", "CI/CD"],
        "optionalSkills": ["Docker"],
        "softSkills": ["Analytical Thinking", "Problem Solving", "Communication"],
        "educationRequired": "B.Tech / B.E. in Computer Science, Data Engineering, or related field",
    },
    {
        "id": "role-ml-eng",
        "title": "Machine Learning Engineer",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["Python", "Machine Learning", "Deep Learning", "Pandas & NumPy", "SQL", "Git"],
        "preferredSkills": ["NLP", "FastAPI", "AWS", "Apache Spark"],
        "optionalSkills": ["Docker"],
        "softSkills": ["Analytical Thinking", "Problem Solving", "Communication"],
        "educationRequired": "B.Tech / M.Tech in CS, AI/ML, Data Science, or Mathematics",
    },
    {
        "id": "role-data-analyst",
        "title": "Data Analyst",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["SQL", "Python", "Pandas & NumPy", "Data Visualization", "Statistics"],
        "preferredSkills": ["Data Warehousing", "Git"],
        "optionalSkills": ["Machine Learning"],
        "softSkills": ["Communication", "Analytical Thinking", "Problem Solving"],
        "educationRequired": "Bachelor's degree in STEM, Economics, Statistics, or Business Analytics",
    },
    {
        "id": "role-python-backend",
        "title": "Python Backend Developer",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["Python", "FastAPI", "Django", "SQL", "REST APIs", "Git", "Docker"],
        "preferredSkills": ["Redis", "AWS", "CI/CD", "Automated Testing"],
        "optionalSkills": ["Linux"],
        "softSkills": ["Problem Solving", "Communication", "Agile & Scrum"],
        "educationRequired": "B.Tech / B.E. / MCA in Computer Science or Software Engineering",
    },
    {
        "id": "role-java-dev",
        "title": "Java Developer",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["Java", "Spring Boot", "SQL", "REST APIs", "Git", "Automated Testing"],
        "preferredSkills": ["Docker", "Kubernetes", "AWS", "Kafka"],
        "optionalSkills": ["CI/CD"],
        "softSkills": ["Problem Solving", "Team Collaboration", "Agile & Scrum"],
        "educationRequired": "B.Tech / B.E. in Computer Science or Information Technology",
    },
    {
        "id": "role-cloud-devops",
        "title": "Cloud / DevOps Engineer",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD", "Git", "Python"],
        "preferredSkills": ["System Design", "Network Security", "SQL"],
        "optionalSkills": ["Redis"],
        "softSkills": ["Problem Solving", "Cross-Functional Collaboration", "Communication"],
        "educationRequired": "B.Tech / B.E. in CS/IT or Cloud Certifications",
    },
    {
        "id": "role-cybersecurity",
        "title": "Cybersecurity Analyst",
        "companyName": "Industry Role Benchmark",
        "mandatorySkills": ["Network Security", "SIEM & SOC", "OWASP & AppSec", "Linux", "Python", "IAM & Cryptography"],
        "preferredSkills": ["AWS", "Docker", "SQL"],
        "optionalSkills": ["Git"],
        "softSkills": ["Analytical Thinking", "Communication", "Problem Solving"],
        "educationRequired": "B.Tech in CS / Cybersecurity or CEH / Security+ Certification",
    },
]

SAMPLE_RESUMES: List[Dict[str, Any]] = [
    {
        "id": "demo-aarav-sharma",
        "filename": "Aarav_Sharma_Resume.pdf",
        "uploadedAt": "2026-10-31 09:00 UTC",
        "rawText": (
            "Aarav Sharma | aarav.sharma@iitd.ac.in | +91 98765 43210 | Location: New Delhi, India\n"
            "B.Tech in Computer Science & Engineering — Indian Institute of Technology (2022–2026)\n"
            "CGPA: 8.7/10\n"
            "Technical Skills: Python, SQL, JavaScript, React, FastAPI, REST APIs, Git, Pandas & NumPy, Docker, Machine Learning.\n"
            "Projects:\n"
            "1. FinTrack Realtime Analytics: Built a full-stack financial dashboard using React, FastAPI, PostgreSQL (SQL), and Docker with JWT auth.\n"
            "2. SmartInventory Forecasting: Developed demand prediction pipelines in Python using Pandas & NumPy and Scikit-Learn (Machine Learning).\n"
            "Certifications:\n"
            "- AWS Cloud Practitioner Essentials\n"
            "- Coursera SQL for Data Science"
        ),
        "contact": {
            "name": "Aarav Sharma",
            "email": "aarav.sharma@iitd.ac.in",
            "phone": "+91 98765 43210",
            "location": "New Delhi, India",
        },
        "summary": "Final-year B.Tech Computer Science student experienced in Python, React, FastAPI, SQL, and Docker.",
        "education": [
            {
                "degree": "B.Tech in Computer Science & Engineering",
                "institution": "Indian Institute of Technology",
                "year": "2022–2026",
                "score": "8.7/10",
            }
        ],
        "technicalSkills": [
            "Python",
            "SQL",
            "JavaScript",
            "React",
            "FastAPI",
            "REST APIs",
            "Git",
            "Pandas & NumPy",
            "Docker",
            "Machine Learning",
        ],
        "softSkills": ["Problem Solving", "Communication", "Agile & Scrum"],
        "workExperience": [
            {
                "role": "Software Engineering Intern",
                "company": "NexaCloud Systems",
                "duration": "May 2025 – Jul 2025",
                "highlights": ["Built REST APIs in FastAPI and optimized PostgreSQL queries by 38%."],
            }
        ],
        "projects": [
            {
                "title": "FinTrack Realtime Analytics",
                "techStack": ["React", "FastAPI", "SQL", "Docker"],
                "description": "Built a full-stack financial analytics app with React, FastAPI, PostgreSQL, and Docker.",
            },
            {
                "title": "SmartInventory Forecasting",
                "techStack": ["Python", "Pandas & NumPy", "Machine Learning"],
                "description": "Developed time-series demand forecasting pipelines using Python, Pandas, and Scikit-Learn.",
            },
        ],
        "certifications": ["AWS Cloud Practitioner Essentials", "Coursera SQL for Data Science"],
        "skillEvidence": {
            "Python": "Developed demand prediction pipelines in Python using Pandas & NumPy and Scikit-Learn (Machine Learning).",
            "SQL": "Built a full-stack financial dashboard using React, FastAPI, PostgreSQL (SQL), and Docker with JWT auth.",
            "JavaScript": "Technical Skills: Python, SQL, JavaScript, React, FastAPI, REST APIs, Git, Pandas & NumPy, Docker, Machine Learning.",
            "React": "Built a full-stack financial dashboard using React, FastAPI, PostgreSQL (SQL), and Docker with JWT auth.",
            "FastAPI": "Built a full-stack financial dashboard using React, FastAPI, PostgreSQL (SQL), and Docker with JWT auth.",
            "REST APIs": "Technical Skills: Python, SQL, JavaScript, React, FastAPI, REST APIs, Git, Pandas & NumPy, Docker, Machine Learning.",
            "Git": "Technical Skills: Python, SQL, JavaScript, React, FastAPI, REST APIs, Git, Pandas & NumPy, Docker, Machine Learning.",
            "Pandas & NumPy": "Developed demand prediction pipelines in Python using Pandas & NumPy and Scikit-Learn (Machine Learning).",
            "Docker": "Built a full-stack financial dashboard using React, FastAPI, PostgreSQL (SQL), and Docker with JWT auth.",
            "Machine Learning": "Developed demand prediction pipelines in Python using Pandas & NumPy and Scikit-Learn (Machine Learning).",
        },
    },
    {
        "id": "demo-priya-nair",
        "filename": "Priya_Nair_DataScience.pdf",
        "uploadedAt": "2026-10-31 09:15 UTC",
        "rawText": (
            "Priya Nair | priya.nair@nitk.edu.in | +91 98111 22334 | Location: Bengaluru, India\n"
            "B.Tech in Artificial Intelligence & Data Science — National Institute of Technology (2022–2026)\n"
            "CGPA: 9.1/10\n"
            "Skills: Python, SQL, Machine Learning, Deep Learning, NLP, Pandas & NumPy, Statistics, Data Visualization, Git.\n"
            "Projects:\n"
            "1. MedScan NLP Triage: Fine-tuned clinical transformer models (NLP, Deep Learning) in PyTorch with 91% F1-score.\n"
            "2. RetailPulse BI Suite: Created executive cohort retention dashboards using SQL, Python, and Tableau (Data Visualization).\n"
            "Certifications:\n"
            "- DeepLearning.AI Machine Learning Specialization"
        ),
        "contact": {
            "name": "Priya Nair",
            "email": "priya.nair@nitk.edu.in",
            "phone": "+91 98111 22334",
            "location": "Bengaluru, India",
        },
        "summary": "AI & Data Science undergraduate specializing in Machine Learning, NLP, Python, and SQL analytics.",
        "education": [
            {
                "degree": "B.Tech in Artificial Intelligence & Data Science",
                "institution": "National Institute of Technology",
                "year": "2022–2026",
                "score": "9.1/10",
            }
        ],
        "technicalSkills": [
            "Python",
            "SQL",
            "Machine Learning",
            "Deep Learning",
            "NLP",
            "Pandas & NumPy",
            "Statistics",
            "Data Visualization",
            "Git",
        ],
        "softSkills": ["Analytical Thinking", "Communication", "Problem Solving"],
        "workExperience": [],
        "projects": [
            {
                "title": "MedScan NLP Triage",
                "techStack": ["Python", "Deep Learning", "NLP"],
                "description": "Fine-tuned transformer models in PyTorch for clinical text classification with 91% F1.",
            },
            {
                "title": "RetailPulse BI Suite",
                "techStack": ["SQL", "Python", "Data Visualization"],
                "description": "Built cohort retention and revenue analytics pipelines using SQL and Tableau.",
            },
        ],
        "certifications": ["DeepLearning.AI Machine Learning Specialization"],
        "skillEvidence": {
            "Python": "Created executive cohort retention dashboards using SQL, Python, and Tableau (Data Visualization).",
            "SQL": "Created executive cohort retention dashboards using SQL, Python, and Tableau (Data Visualization).",
            "Machine Learning": "Skills: Python, SQL, Machine Learning, Deep Learning, NLP, Pandas & NumPy, Statistics, Data Visualization, Git.",
            "Deep Learning": "Fine-tuned clinical transformer models (NLP, Deep Learning) in PyTorch with 91% F1-score.",
            "NLP": "Fine-tuned clinical transformer models (NLP, Deep Learning) in PyTorch with 91% F1-score.",
            "Pandas & NumPy": "Skills: Python, SQL, Machine Learning, Deep Learning, NLP, Pandas & NumPy, Statistics, Data Visualization, Git.",
            "Statistics": "Skills: Python, SQL, Machine Learning, Deep Learning, NLP, Pandas & NumPy, Statistics, Data Visualization, Git.",
            "Data Visualization": "Created executive cohort retention dashboards using SQL, Python, and Tableau (Data Visualization).",
            "Git": "Skills: Python, SQL, Machine Learning, Deep Learning, NLP, Pandas & NumPy, Statistics, Data Visualization, Git.",
        },
    },
    {
        "id": "demo-rohan-kulkarni",
        "filename": "Rohan_Kulkarni_Backend.docx",
        "uploadedAt": "2026-10-31 09:30 UTC",
        "rawText": (
            "Rohan Kulkarni | rohan.k@vit.ac.in | +91 97654 32109 | Location: Pune, India\n"
            "B.E. in Information Technology — Vellore Institute of Technology (2022–2026)\n"
            "CGPA: 8.4/10\n"
            "Skills: Java, Spring Boot, SQL, REST APIs, Git, Linux, Docker, HTML/CSS, JavaScript.\n"
            "Projects:\n"
            "1. PayFlow Microservice: Engineered an order & payment microservice using Java 17, Spring Boot, MySQL (SQL), and Docker.\n"
            "2. CampusConnect Portal: Built an event portal with JavaScript, HTML/CSS, and REST APIs.\n"
            "Certifications:\n"
            "- Oracle Certified Foundations Associate (Java)"
        ),
        "contact": {
            "name": "Rohan Kulkarni",
            "email": "rohan.k@vit.ac.in",
            "phone": "+91 97654 32109",
            "location": "Pune, India",
        },
        "summary": "Backend-focused IT student skilled in Java, Spring Boot, SQL, REST APIs, and Docker.",
        "education": [
            {
                "degree": "B.E. in Information Technology",
                "institution": "Vellore Institute of Technology",
                "year": "2022–2026",
                "score": "8.4/10",
            }
        ],
        "technicalSkills": [
            "Java",
            "Spring Boot",
            "SQL",
            "REST APIs",
            "Git",
            "Linux",
            "Docker",
            "HTML/CSS",
            "JavaScript",
        ],
        "softSkills": ["Problem Solving", "Team Leadership", "Agile & Scrum"],
        "workExperience": [],
        "projects": [
            {
                "title": "PayFlow Microservice",
                "techStack": ["Java", "Spring Boot", "SQL", "Docker"],
                "description": "Engineered a transactional payment service using Java, Spring Boot, MySQL, and Docker.",
            },
        ],
        "certifications": ["Oracle Certified Foundations Associate (Java)"],
        "skillEvidence": {
            "Java": "Engineered an order & payment microservice using Java 17, Spring Boot, MySQL (SQL), and Docker.",
            "Spring Boot": "Engineered an order & payment microservice using Java 17, Spring Boot, MySQL (SQL), and Docker.",
            "SQL": "Engineered an order & payment microservice using Java 17, Spring Boot, MySQL (SQL), and Docker.",
            "REST APIs": "Built an event portal with JavaScript, HTML/CSS, and REST APIs.",
            "Git": "Skills: Java, Spring Boot, SQL, REST APIs, Git, Linux, Docker, HTML/CSS, JavaScript.",
            "Linux": "Skills: Java, Spring Boot, SQL, REST APIs, Git, Linux, Docker, HTML/CSS, JavaScript.",
            "Docker": "Engineered an order & payment microservice using Java 17, Spring Boot, MySQL (SQL), and Docker.",
            "HTML/CSS": "Built an event portal with JavaScript, HTML/CSS, and REST APIs.",
            "JavaScript": "Built an event portal with JavaScript, HTML/CSS, and REST APIs.",
        },
    },
]

_RESOURCES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resources.json")
try:
    with open(_RESOURCES_PATH, "r", encoding="utf-8") as _rf:
        SKILL_NODE_CURATED: Dict[str, Dict[str, Any]] = json.load(_rf)
except Exception:
    SKILL_NODE_CURATED = {}


def _detect_jd_section_tier(line: str, current_tier: str) -> Optional[str]:
    """
    Check if a line in a Job Description is a section heading that sets the requirement tier.
    Returns 'Mandatory', 'Preferred', 'Optional', 'Ignore', or None if not a heading.
    """
    stripped = line.strip()
    # Headings are typically short lines ending with ':' or standalone title lines
    if len(stripped) > 65 or stripped.startswith("-") or stripped.startswith("•"):
        return None

    low = stripped.lower()
    if any(k in low for k in ["mandatory", "required", "must have", "essential", "minimum qualification"]):
        return "Mandatory"
    if any(k in low for k in ["preferred", "nice to have", "desired", "good to have"]):
        return "Preferred"
    if any(k in low for k in ["optional", "bonus", "plus"]):
        return "Optional"
    if any(k in low for k in ["responsibilities", "key responsibilities", "about the role", "what you will do"]):
        return "Ignore"
    return None


def parse_jd_requirements_by_headings(clean_jd: str) -> Dict[str, Any]:
    """
    Parse a Job Description using whole-word regex matching and section headings
    ('Mandatory / Required', 'Preferred', 'Optional / Bonus'). Never splits 65/35.
    """
    lines = [ln.strip() for ln in clean_jd.splitlines() if ln.strip()]

    # Check if the JD contains explicit requirement headings
    has_explicit_headings = any(
        _detect_jd_section_tier(ln, "") in ("Mandatory", "Preferred", "Optional")
        for ln in lines
    )

    current_tier = "Ignore" if has_explicit_headings else "Mandatory"
    mandatory_skills: List[str] = []
    preferred_skills: List[str] = []
    optional_skills: List[str] = []
    quotes: Dict[str, str] = {}
    assigned_skills = set()

    for ln in lines:
        new_tier = _detect_jd_section_tier(ln, current_tier)
        if new_tier is not None:
            current_tier = new_tier
            continue

        if current_tier == "Ignore":
            continue

        low_ln = ln.lower()
        clean_quote = re.sub(r"^[\s•·\-*]+", "", ln).strip()

        for canonical_skill, aliases in KNOWN_SKILLS_CATALOG.items():
            if canonical_skill in assigned_skills:
                continue
            if any(has_whole_word(low_ln, alias) for alias in aliases):
                assigned_skills.add(canonical_skill)
                quotes[canonical_skill] = clean_quote[:220]
                if current_tier == "Preferred":
                    preferred_skills.append(canonical_skill)
                elif current_tier == "Optional":
                    optional_skills.append(canonical_skill)
                else:
                    mandatory_skills.append(canonical_skill)

    # If explicit headings were used, also scan remaining lines for any skill not yet assigned
    if not mandatory_skills and not preferred_skills and not optional_skills:
        low_all = clean_jd.lower()
        for canonical_skill, aliases in KNOWN_SKILLS_CATALOG.items():
            if any(has_whole_word(low_all, alias) for alias in aliases):
                mandatory_skills.append(canonical_skill)

    return {
        "mandatorySkills": mandatory_skills,
        "preferredSkills": preferred_skills,
        "optionalSkills": optional_skills,
        "requirementQuotes": quotes,
    }


def resolve_job_profile(
    role_title: str,
    goal_company: str = "",
    custom_jd_text: str = "",
    job_url: str = "",
) -> Dict[str, Any]:
    """
    Return a JobRoleProfile from either a custom JD (using Gemini response_schema
    with fallback to whole-word + heading parsing) or one of the 8 role templates.
    """
    base = next(
        (r for r in ROLE_TEMPLATES if r["title"].lower() == role_title.lower()),
        ROLE_TEMPLATES[0],
    ).copy()
    base.setdefault("optionalSkills", [])
    base["requirementQuotes"] = {}
    base["extractionSource"] = "template"

    safe_company = sanitize_short_field(goal_company, 100)
    if safe_company:
        base["companyName"] = safe_company
    if job_url:
        base["sourceUrl"] = sanitize_short_field(job_url, 300)

    clean_jd = sanitize_plain_text(custom_jd_text, 20000)
    if len(clean_jd) > 25:
        # Extract Job Title or Company from JD header lines if present
        title_m = re.search(r"Job Title:\s*([^\n]+)", clean_jd, flags=re.I)
        comp_m = re.search(r"Company:\s*([^\n]+)", clean_jd, flags=re.I)
        if title_m and not role_title:
            base["title"] = sanitize_short_field(title_m.group(1), 100)
        if comp_m and not safe_company:
            base["companyName"] = sanitize_short_field(comp_m.group(1), 100)

        # 1. Try Gemini structured extraction (with strict catalog + whole-word verification)
        gemini_reqs = extract_jd_requirements_with_gemini(clean_jd)
        if gemini_reqs:
            mand = [r["skill"] for r in gemini_reqs if r["tier"] == "Mandatory"]
            pref = [r["skill"] for r in gemini_reqs if r["tier"] == "Preferred" and r["skill"] not in mand]
            opt = [
                r["skill"]
                for r in gemini_reqs
                if r["tier"] == "Optional" and r["skill"] not in mand and r["skill"] not in pref
            ]
            if mand or pref or opt:
                base["mandatorySkills"] = mand
                base["preferredSkills"] = pref
                base["optionalSkills"] = opt
                base["requirementQuotes"] = {r["skill"]: r["quote_from_jd"] for r in gemini_reqs}
                base["extractionSource"] = "ai"
                return base

        # 2. Deterministic fallback: whole-word regex + JD section headings (no 65/35 split)
        parsed_jd = parse_jd_requirements_by_headings(clean_jd)
        base["mandatorySkills"] = parsed_jd["mandatorySkills"]
        base["preferredSkills"] = parsed_jd["preferredSkills"]
        base["optionalSkills"] = parsed_jd["optionalSkills"]
        base["requirementQuotes"] = parsed_jd["requirementQuotes"]
        base["extractionSource"] = "template"

    return base


def match_resume_to_job(
    resume: Dict[str, Any],
    job: Dict[str, Any],
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Score only what is actually found (no padded baselines, no fake 0.96 similarity):
    - Mandatory skills: 60%
    - Preferred skills: 15%
    - Projects & experience: 15%
    - Education: 5%
    - Certifications: 5%
    Adjacent skills give 0 points and are labeled "Adjacent skill" ("You know X, which helps with Y").
    A resume with no detected skills always scores under 10.
    """
    w = weights or DEFAULT_WEIGHTS
    # Support legacy weight keys if passed from older clients
    w_mand = float(w.get("mandatorySkills", 0.60))
    w_pref = float(w.get("preferredSkills", 0.15))
    w_proj = float(w.get("projectsExperience", 0.15))
    w_edu = float(w.get("education", 0.05))
    w_cert = float(w.get("certifications", 0.05))

    candidate_skills = set(resume.get("technicalSkills", []))
    evidence_map = resume.get("skillEvidence", {})
    req_quotes = job.get("requirementQuotes", {})

    matched_skills: List[Dict[str, Any]] = []
    partial_skills: List[Dict[str, Any]] = []
    missing_skills: List[Dict[str, Any]] = []

    mandatory_list: List[str] = job.get("mandatorySkills", [])
    preferred_list: List[str] = job.get("preferredSkills", [])
    optional_list: List[str] = job.get("optionalSkills", [])

    mandatory_matched = 0
    preferred_matched = 0
    optional_matched = 0

    def evaluate_req(req_skill: str, tier: str) -> bool:
        # 1. Status: matched
        if req_skill in candidate_skills:
            matched_skills.append(
                {
                    "jobSkill": req_skill,
                    "resumeSkill": req_skill,
                    "tier": tier,
                    "status": "matched",
                    "matchType": "Detected",
                    "similarity": 1.0,
                    "resumeEvidence": evidence_map.get(
                        req_skill, f"Detected {req_skill} in resume."
                    ),
                    "jobQuote": req_quotes.get(req_skill, f"{tier} requirement: {req_skill}"),
                    "explanation": f"Detected {req_skill} in resume.",
                }
            )
            return True

        # 2. Status: adjacent (knows a related skill, 0 points — NEVER added to missing_skills)
        adjacent_candidates = ADJACENT_SKILLS.get(req_skill, [])
        found_adj = next((s for s in adjacent_candidates if s in candidate_skills), None)
        if found_adj:
            partial_skills.append(
                {
                    "jobSkill": req_skill,
                    "resumeSkill": found_adj,
                    "tier": tier,
                    "status": "adjacent",
                    "matchType": "Adjacent skill",
                    "similarity": 0.0,
                    "adjacentSkill": found_adj,
                    "relatedExistingSkills": [s for s in adjacent_candidates if s in candidate_skills],
                    "resumeEvidence": evidence_map.get(
                        found_adj, f"Detected {found_adj} in resume."
                    ),
                    "jobQuote": req_quotes.get(req_skill, f"{tier} requirement: {req_skill}"),
                    "explanation": f"You know {found_adj}, which helps with {req_skill} (0 points credited).",
                }
            )
            return False

        # 3. Status: missing (ONLY when neither matched nor adjacent)
        missing_skills.append(
            {
                "jobSkill": req_skill,
                "tier": tier,
                "status": "missing",
                "adjacentSkill": None,
                "relatedExistingSkills": [],
                "jobQuote": req_quotes.get(req_skill, f"{tier} requirement: {req_skill}"),
                "resumeEvidence": "Not found in resume.",
            }
        )
        return False

    for sk in mandatory_list:
        if evaluate_req(sk, "Mandatory"):
            mandatory_matched += 1
    for sk in preferred_list:
        if evaluate_req(sk, "Preferred"):
            preferred_matched += 1
    for sk in optional_list:
        if evaluate_req(sk, "Optional"):
            optional_matched += 1

    mand_total = len(mandatory_list)
    pref_total = len(preferred_list)
    opt_total = len(optional_list)

    mandatory_pct = round((mandatory_matched / mand_total) * 100, 1) if mand_total > 0 else 0.0
    preferred_pct = round((preferred_matched / pref_total) * 100, 1) if pref_total > 0 else 0.0
    optional_pct = round((optional_matched / opt_total) * 100, 1) if opt_total > 0 else 0.0

    # Projects & Experience Score (0–100, no padded baseline; requires detected skills)
    projects = resume.get("projects", [])
    work_exp = resume.get("workExperience", [])
    if not candidate_skills:
        proj_score = 0.0
    else:
        # Each project gives 30 pts (up to 60), each experience entry gives 40 pts (up to 40)
        proj_pts = min(60.0, len(projects) * 30.0)
        exp_pts = min(40.0, len(work_exp) * 40.0)
        proj_score = min(100.0, proj_pts + exp_pts)

    # Education Score (100 if a degree was detected, 0 otherwise)
    edu_list = resume.get("education", [])
    has_real_degree = any(bool(e.get("degree", "").strip()) for e in edu_list)
    edu_score = 100.0 if has_real_degree else 0.0

    # Certifications Score (0 if none, 50 for 1, 100 for 2+)
    certs = [c for c in resume.get("certifications", []) if str(c).strip()]
    cert_score = min(100.0, len(certs) * 50.0)

    total_w = (w_mand + w_pref + w_proj + w_edu + w_cert) or 1.0
    mand_contrib = round((mandatory_pct * w_mand) / total_w, 1)
    pref_contrib = round((preferred_pct * w_pref) / total_w, 1)
    proj_contrib = round((proj_score * w_proj) / total_w, 1)
    edu_contrib = round((edu_score * w_edu) / total_w, 1)
    cert_contrib = round((cert_score * w_cert) / total_w, 1)

    overall = round(mand_contrib + pref_contrib + proj_contrib + edu_contrib + cert_contrib, 1)

    # Guarantee that a resume with 0 detected skills always scores under 10
    if len(candidate_skills) == 0:
        overall = min(overall, 5.0)

    # Combined technical score for summary compatibility
    tech_score = round(mandatory_pct * 0.8 + preferred_pct * 0.2, 1)

    score_breakdown = [
        {
            "category": "Mandatory Skills",
            "weightPct": round((w_mand / total_w) * 100),
            "rawScore": mandatory_pct,
            "pointsContributed": mand_contrib,
            "reason": f"{mandatory_matched} of {mand_total} mandatory skills detected",
        },
        {
            "category": "Preferred Skills",
            "weightPct": round((w_pref / total_w) * 100),
            "rawScore": preferred_pct,
            "pointsContributed": pref_contrib,
            "reason": f"{preferred_matched} of {pref_total} preferred skills detected",
        },
        {
            "category": "Projects & Experience",
            "weightPct": round((w_proj / total_w) * 100),
            "rawScore": proj_score,
            "pointsContributed": proj_contrib,
            "reason": f"{len(projects)} project(s) and {len(work_exp)} experience entry(s) found",
        },
        {
            "category": "Education",
            "weightPct": round((w_edu / total_w) * 100),
            "rawScore": edu_score,
            "pointsContributed": edu_contrib,
            "reason": edu_list[0]["degree"] if has_real_degree else "No degree detected",
        },
        {
            "category": "Certifications",
            "weightPct": round((w_cert / total_w) * 100),
            "rawScore": cert_score,
            "pointsContributed": cert_contrib,
            "reason": f"{len(certs)} certification(s) detected",
        },
    ]

    return {
        "overallScore": overall,
        "technicalScore": tech_score,
        "projectsExperienceScore": round(proj_score, 1),
        "educationScore": round(edu_score, 1),
        "certificationsScore": round(cert_score, 1),
        "softSkillsScore": 0.0,
        "mandatorySatisfiedPct": round(mandatory_pct),
        "preferredSatisfiedPct": round(preferred_pct),
        "optionalSatisfiedPct": round(optional_pct),
        "scoreBreakdown": score_breakdown,
        "matchedSkills": matched_skills,
        "partialSkills": partial_skills,
        "missingSkills": missing_skills,
    }


def build_skill_gaps(match_result: Dict[str, Any], role_title: str) -> List[Dict[str, Any]]:
    """
    Build ranked, actionable skill gaps from the disjoint partialSkills (adjacent)
    and missingSkills lists, ordered Mandatory first, then Preferred, then Optional.
    """
    gaps: List[Dict[str, Any]] = []
    tier_order = {"Mandatory": 0, "Preferred": 1, "Optional": 2}
    unmastered = list(match_result.get("partialSkills", [])) + list(match_result.get("missingSkills", []))
    unmastered.sort(key=lambda item: tier_order.get(item.get("tier", "Mandatory"), 3))

    rank = 1
    for m in unmastered:
        sk = m["jobSkill"]
        tier = m["tier"]
        adj = m.get("adjacentSkill") or m.get("resumeSkill")
        if adj:
            why_text = f"You know {adj}, which helps with {sk}, a {tier.lower()} requirement for {role_title}."
            task_text = f"Adapt one workflow from your {adj} project into {sk} and document the differences."
        else:
            why_text = f"{sk} is a {tier.lower()} requirement for {role_title} roles."
            task_text = f"Build a small, working {sk} module with tests in your GitHub repository."

        gaps.append(
            {
                "skillName": sk,
                "tier": tier,
                "adjacentSkill": adj,
                "priorityRank": rank,
                "estimatedDuration": "2–3 Weeks" if tier == "Mandatory" else "1–2 Weeks",
                "whyItMatters": why_text,
                "practicalExercise": task_text,
            }
        )
        rank += 1

    return gaps


def build_roadmap_tree_nodes(
    match_result: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Create the 4-phase interactive career roadmap node graph tailored to the candidate."""
    nodes: List[Dict[str, Any]] = []

    def make_node(
        skill_name: str,
        phase_index: int,
        phase_title: str,
        status: str,
        status_label: str,
        estimated_time: str,
        why_it_matters: str,
        practical_task: str,
    ) -> Dict[str, Any]:
        curated = SKILL_NODE_CURATED.get(skill_name)
        fallback_resource = {
            "title": f"Search {skill_name} on roadmap.sh",
            "platform": "roadmap.sh",
            "priceNote": "Free Guide",
            "url": "https://roadmap.sh/",
        }
        return {
            "id": f"node-{phase_index}-{skill_name.lower().replace(' ', '-')}",
            "skillName": skill_name,
            "phaseIndex": phase_index,
            "phaseTitle": phase_title,
            "status": status,
            "statusLabel": status_label,
            "estimatedTime": estimated_time,
            "whyItMatters": why_it_matters,
            "subtopics": curated["subtopics"]
            if curated and "subtopics" in curated
            else [
                f"Core syntax & architecture of {skill_name}",
                f"Production security & error handling in {skill_name}",
                f"Testing & performance optimization with {skill_name}",
            ],
            "practicalTask": practical_task,
            "freeCourse": curated["freeCourse"] if curated and "freeCourse" in curated else fallback_resource,
            "paidCourse": curated["paidCourse"] if curated and "paidCourse" in curated else fallback_resource,
        }

    for m in match_result.get("matchedSkills", [])[:4]:
        nodes.append(
            make_node(
                m["jobSkill"],
                1,
                "Phase 01 · Detected Foundations",
                "mastered",
                "✓ Detected in Resume",
                "Ready",
                m["explanation"],
                f"Detected in resume: \"{m['resumeEvidence']}\"",
            )
        )

    for p in match_result.get("partialSkills", []):
        nodes.append(
            make_node(
                p["jobSkill"],
                2,
                "Phase 02 · Adjacent Skill Bridges",
                "partial_bridge",
                f"Adjacent: you know {p['resumeSkill']}",
                "1–2 Weeks",
                p["explanation"],
                f"Port a module from {p['resumeSkill']} into {p['jobSkill']}.",
            )
        )

    for m in match_result.get("matchedSkills", [])[4:]:
        nodes.append(
            make_node(
                m["jobSkill"],
                2,
                "Phase 02 · Detected Stack",
                "mastered",
                "✓ Detected in Resume",
                "Ready",
                m["explanation"],
                f"Detected in resume: \"{m['resumeEvidence']}\"",
            )
        )

    for g in [x for x in skill_gaps if x["tier"] == "Mandatory" and not x.get("adjacentSkill")]:
        nodes.append(
            make_node(
                g["skillName"],
                3,
                "Phase 03 · Mandatory Skill Gaps",
                "mandatory_gap",
                "⚡ Mandatory Gap",
                g["estimatedDuration"],
                g["whyItMatters"],
                g["practicalExercise"],
            )
        )

    for g in [x for x in skill_gaps if x["tier"] != "Mandatory" and not x.get("adjacentSkill")]:
        nodes.append(
            make_node(
                g["skillName"],
                4,
                "Phase 04 · Preferred & Optional Skills",
                "preferred_gap",
                f"★ {g['tier']}",
                g["estimatedDuration"],
                g["whyItMatters"],
                g["practicalExercise"],
            )
        )

    return nodes
