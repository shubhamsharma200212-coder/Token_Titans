# CareerMatch AI — AI-Powered Career Readiness & Skill Gap Intelligence Platform

CareerMatch AI helps students and job seekers understand how closely their existing skills, qualifications, education, and projects align with real industry job requirements. Rather than relying on surface keyword counts, CareerMatch AI combines **deterministic NLP & semantic similarity (`all-MiniLM-L6-v2`)**, **non-interchangeable technology rules**, an **explainable weighted scoring model**, and **Google Gemini (`google-genai`)** for contextual structuring, personalized learning pathways, and portfolio project recommendations.

---

## 1. Architecture Overview

```text
├── app.py                          # Main Streamlit SaaS application (11 modules/pages)
├── requirements.txt                # Python 3.11+ dependencies
├── .env.example                    # Environment configuration template
├── careermatch/                    # Modular Python backend package
│   ├── __init__.py
│   ├── config.py                   # Environment, weights, and security limits
│   ├── database.py                 # SQLAlchemy ORM (SQLite default + optional MySQL)
│   ├── resume_parser.py            # PyMuPDF, python-docx, spaCy NLP + Gemini structuring
│   ├── job_analyzer.py             # Role templates, JD extraction, Mandatory/Preferred/Optional
│   ├── semantic_matcher.py         # SentenceTransformers (all-MiniLM-L6-v2) + cosine similarity
│   ├── skill_gap_engine.py         # Critical/High/Medium/Optional gap prioritization & simulator
│   ├── gemini_service.py           # Official google-genai SDK with structured JSON & fallbacks
│   └── market_data.py              # Verified October 2026 India Tech Hiring Benchmarks
├── samples/                        # Sample resumes and job descriptions for testing
│   ├── sample_resume_aarav_sharma.txt
│   ├── sample_resume_priya_nair.txt
│   └── sample_jd_data_engineer.txt
└── server.ts / src/                # Interactive Web Runtime for Cloud / Browser Preview
```

### Key Architectural Principles
1. **Explainable Hybrid Scoring Engine**: Numerical compatibility scores are computed deterministically in Python (never delegated as a black-box guess to an LLM):
   - **Technical Skills**: 50% (Mandatory requirements weighted 70%, Preferred 30%)
   - **Projects & Experience**: 20%
   - **Education & Qualifications**: 15%
   - **Certifications**: 10%
   - **Soft Skills**: 5%
   *(Weights are dynamically adjustable per role.)*
2. **Non-Interchangeable Technology Guardrails**: Frameworks within the same ecosystem (e.g., `Flask` vs `Django`, `React` vs `Angular`, `PyTorch` vs `TensorFlow`, `AWS` vs `Azure`) are never treated as automatic 100% equivalents. When a candidate has a sibling technology, it is classified as a **Partial Ecosystem Match** with explicit bridge explanations.
3. **Traceable Evidence**: Every matched or partially matched skill links directly to the supporting resume excerpt, the job requirement clause, the match method (`Exact`, `Semantic Embedding`, or `Ecosystem Partial`), and the cosine similarity score.
4. **Strict Separation of Truth Sources**:
   - Verified Company Job Requirements (from user-supplied job postings and source URLs)
   - Aggregated Industry Benchmarks (October 2026 Indian tech hiring dataset, $n = 18,752$ postings and $n = 289$ fresher postings)
   - AI-Generated Learning & Project Recommendations

---

## 2. Local Installation & Startup Instructions (Python 3.11+ & Streamlit)

### Prerequisites
- Python 3.11 or newer
- A Google Gemini API key (configured via `.env`)

### Step-by-Step Setup

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Download the spaCy English pipeline
python -m spacy download en_core_web_sm

# 4. Configure environment variables
cp .env.example .env
# Edit .env and set GEMINI_API_KEY="your_api_key_here"
# Optional: Set DATABASE_URL="mysql+pymysql://user:pass@localhost:3306/careermatch" for MySQL

# 5. Launch the Streamlit application
streamlit run app.py
```

---

## 3. Core Application Modules (11 Views)

1. **Dashboard**: Student profile, upload status, total resumes/jobs analysed, average compatibility, top matched/missing skills, readiness index, and analysis history.
2. **Resume Analyzer**: Upload PDF/DOCX/TXT resumes, extract contact, education, categorized skills, internships, projects, certifications, and achievements, and edit/verify extracted fields before analysis.
3. **Job Description Analyzer**: Paste a JD, upload a JD document, select from 8 preloaded industry templates, or attach a company name and posting URL with Mandatory / Preferred / Optional classification.
4. **Job Matching Results**: Hybrid exact + `all-MiniLM-L6-v2` semantic matching, role-customizable scoring weights, and full evidence traceability table.
5. **Skill Gap Analysis**: Categorizes missing competencies into Critical, High-Priority, Medium-Priority, and Optional Improvements with learning durations and practical exercises.
6. **Learning Roadmap**: Personalized Beginner → Intermediate → Advanced learning stages generated with `google-genai` (with deterministic fallback), skipping already-mastered skills.
7. **Project Recommendations**: Tailored portfolio project blueprints with problem statement, tech stack, implementation steps, expected output, and portfolio value.
8. **Multi-Job Comparison**: Compare a single resume against multiple target job descriptions simultaneously to identify the highest-compatibility role and cross-role leverage skills.
9. **Career Simulator**: Interactive What-If Simulator projecting compatibility gains as missing skills and portfolio projects are completed, plus the Resume Improvement Assistant.
10. **Industry Insights**: Sourced October 2026 India Tech Hiring Benchmark ($n = 18,752$ job postings + $n = 289$ fresher openings) with role breakdowns and custom benchmark dataset updates.
11. **Profile & Settings**: Manage student profile, database status (SQLite / MySQL), and inspect/download the modular Python source files.
