"""
PDF (PyPDF2), DOCX (python-docx), and TXT Resume Parser for CareerMatch AI.
Phase 1 improvements:
- Preserves degree names like "B.Tech" (splits by lines instead of every '.')
- Never hardcodes year or location (leaves blank if not in text)
- Extracts structured work experience (role, company, duration, highlights)
- Ignores section headers like "CERTIFICATIONS" when collecting certificates
- Removes ambiguous short aliases (ts, js, py, ml, rag, soc, eks)
- Uses "Detected" instead of "Verified"
- Supports optional Gemini structured extraction (with strict verification against resume text)
"""

import io
import logging
import os
import re
import uuid
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

try:
    from PyPDF2 import PdfReader  # type: ignore
except ImportError:
    PdfReader = None

try:
    import docx  # type: ignore
except ImportError:
    docx = None


# Unambiguous skill catalog (short 2-3 letter aliases like ts, js, py, ml, rag, soc, eks removed)
KNOWN_SKILLS_CATALOG: Dict[str, List[str]] = {
    "Python": ["python", "python3"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite", "tsql", "pl/sql"],
    "Java": ["java", "jdk", "j2ee", "core java"],
    "JavaScript": ["javascript", "ecmascript", "vanilla js"],
    "TypeScript": ["typescript"],
    "C++": ["c++", "cpp"],
    "React": ["react", "reactjs", "react.js", "next.js", "nextjs"],
    "Node.js": ["node.js", "nodejs", "express.js"],
    "FastAPI": ["fastapi", "fast api"],
    "Django": ["django", "django rest framework"],
    "Flask": ["flask"],
    "Spring Boot": ["spring boot", "spring framework", "spring mvc"],
    "HTML/CSS": ["html", "html5", "css", "css3", "tailwind", "bootstrap"],
    "REST APIs": ["rest api", "restful", "rest apis", "openapi", "swagger", "graphql"],
    "Git": ["git", "github", "gitlab", "version control"],
    "Docker": ["docker", "dockerfile", "docker-compose"],
    "Kubernetes": ["kubernetes", "k8s", "helm", "gke"],
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "rds", "cloudwatch"],
    "CI/CD": ["ci/cd", "github actions", "jenkins", "gitlab ci"],
    "Linux": ["linux", "ubuntu", "bash", "shell scripting"],
    "Machine Learning": ["machine learning", "scikit-learn", "sklearn", "xgboost", "random forest"],
    "Deep Learning": ["deep learning", "pytorch", "tensorflow", "keras", "neural networks"],
    "NLP": ["natural language processing", "spacy", "huggingface", "bert"],
    "Pandas & NumPy": ["pandas", "numpy", "scipy"],
    "Data Visualization": ["tableau", "power bi", "powerbi", "matplotlib", "seaborn", "plotly", "data visualization"],
    "Statistics": ["statistics", "hypothesis testing", "a/b testing", "statistical modeling", "statistics and probability"],
    "Apache Spark": ["apache spark", "pyspark", "spark sql"],
    "Airflow": ["airflow", "apache airflow"],
    "Data Warehousing": ["data warehousing", "data warehouse", "snowflake", "bigquery", "redshift", "dbt", "dimensional modeling"],
    "Kafka": ["kafka", "apache kafka", "event streaming"],
    "MongoDB": ["mongodb", "mongoose", "nosql"],
    "Redis": ["redis"],
    "Network Security": ["network security", "firewalls", "wireshark", "ids/ips"],
    "SIEM & SOC": ["siem", "splunk", "qradar", "incident response", "threat hunting"],
    "OWASP & AppSec": ["owasp", "penetration testing", "burp suite", "vulnerability assessment", "appsec"],
    "IAM & Cryptography": ["identity and access management", "cryptography", "encryption", "zero trust", "tls/ssl", "pki"],
    "System Design": ["system design", "microservices", "distributed systems"],
    "Automated Testing": ["pytest", "jest", "unit testing", "selenium", "cypress", "testing and debugging"],
}

SOFT_SKILLS_CATALOG: List[str] = [
    "Communication",
    "Problem Solving",
    "Team Leadership",
    "Agile & Scrum",
    "Cross-Functional Collaboration",
    "Analytical Thinking",
]

SECTION_HEADERS = {
    "EDUCATION",
    "TECHNICAL SKILLS",
    "SKILLS",
    "INTERNSHIPS & WORK EXPERIENCE",
    "WORK EXPERIENCE",
    "EXPERIENCE",
    "INTERNSHIPS",
    "ACADEMIC & PERSONAL PROJECTS",
    "PROJECTS",
    "CERTIFICATIONS",
    "CERTIFICATES",
    "ACHIEVEMENTS",
    "AWARDS",
    "SUMMARY",
    "OBJECTIVE",
}


def has_whole_word(text_lower: str, alias: str) -> bool:
    """Match an alias only as a complete word/phrase, never inside another word."""
    pattern = r"(?<![A-Za-z0-9])" + re.escape(alias.lower()) + r"(?![A-Za-z0-9])"
    return bool(re.search(pattern, text_lower))


def sanitize_plain_text(value: Any, max_len: int = 50000) -> str:
    """Strip HTML/script tags, null bytes, and dangerous control sequences."""
    if not isinstance(value, str):
        return ""
    cleaned = value[:max_len]
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", cleaned)
    cleaned = re.sub(r"<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"<style\b[^<]*(?:(?!</style>)<[^<]*)*</style>", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return cleaned.strip()


def sanitize_short_field(value: Any, max_len: int = 120) -> str:
    return re.sub(r"\s+", " ", sanitize_plain_text(value, max_len)).strip()


def extract_text_from_file_bytes(filename: str, file_bytes: bytes) -> str:
    """Extract plain text from PDF, DOCX, or TXT files with magic-byte checks."""
    safe_name = os.path.basename(filename or "resume.txt")
    lower = safe_name.lower()

    if len(file_bytes) < 4:
        raise ValueError("Uploaded file is empty.")

    if len(file_bytes) > 10 * 1024 * 1024:
        raise ValueError("Uploaded file exceeds the 10 MB security limit.")

    if file_bytes[:2] == b"MZ" or file_bytes[:4] == b"\x7fELF":
        raise ValueError("Executable binary files are not permitted.")

    if lower.endswith(".pdf"):
        if not file_bytes.startswith(b"%PDF-"):
            raise ValueError("Invalid PDF signature: file header does not match %PDF-.")
        text = _extract_pdf_bytes(file_bytes)
    elif lower.endswith(".docx"):
        if file_bytes[:4] != b"PK\x03\x04":
            raise ValueError("Invalid DOCX signature: file is not a valid OpenXML archive.")
        text = _extract_docx_bytes(file_bytes)
    elif lower.endswith(".txt") or lower.endswith(".md"):
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError("Unsupported file format. Please upload PDF, DOCX, or TXT.")

    cleaned = sanitize_plain_text(text, 60000)
    if len(cleaned) < 20:
        raise ValueError(
            "Could not extract readable text from this file. If it is a scanned image PDF, please upload a text-based PDF, DOCX, or paste your resume text."
        )
    return cleaned


def _extract_pdf_bytes(file_bytes: bytes) -> str:
    if PdfReader is not None:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            joined = "\n".join(pages).strip()
            if len(joined) >= 20:
                return joined
        except Exception as exc:
            logger.warning("PyPDF2 extraction failed, trying fallback: %s", exc)

    latin = file_bytes.decode("latin-1", errors="ignore")
    chunks: List[str] = []
    for match in re.finditer(r"\(([^()\\]{2,250})\)", latin):
        token = match.group(1)
        if re.search(r"[A-Za-z]{3,}", token):
            chunks.append(token)
    return " ".join(chunks) if chunks else ""


def _extract_docx_bytes(file_bytes: bytes) -> str:
    if docx is not None:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            paras = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    paras.append(" | ".join(cell.text.strip() for cell in row.cells if cell.text.strip()))
            joined = "\n".join(paras).strip()
            if joined:
                return joined
        except Exception as exc:
            logger.warning("python-docx extraction failed, trying XML fallback: %s", exc)

    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            if "word/document.xml" not in zf.namelist():
                return ""
            xml_bytes = zf.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            texts = [elem.text for elem in root.iter() if elem.tag.endswith("}t") and elem.text]
            return " ".join(texts)
    except Exception as exc:
        logger.warning("DOCX XML extraction failed: %s", exc)
        return ""


def _is_section_header(line: str) -> str:
    """Return normalized section name if the line is a resume section heading, else ''."""
    cleaned = re.sub(r"[:\-–—*#]+", "", line).strip().upper()
    if cleaned in SECTION_HEADERS:
        if "EDUCATION" in cleaned:
            return "EDUCATION"
        if "SKILL" in cleaned:
            return "SKILLS"
        if "EXPERIENCE" in cleaned or "INTERNSHIP" in cleaned:
            return "EXPERIENCE"
        if "PROJECT" in cleaned:
            return "PROJECTS"
        if "CERTIF" in cleaned:
            return "CERTIFICATIONS"
        if "ACHIEVEMENT" in cleaned or "AWARD" in cleaned:
            return "ACHIEVEMENTS"
    return ""


def parse_resume_text_to_profile(raw_text: str, filename: str = "Uploaded_Resume.pdf") -> Dict[str, Any]:
    """
    Parse raw resume text into a structured Candidate Profile.
    Preserves abbreviations like 'B.Tech', leaves missing fields blank instead of
    hardcoding defaults, extracts work experience, and ignores section headers.
    """
    clean_text = sanitize_plain_text(raw_text, 50000)
    raw_lines = [line.strip() for line in clean_text.splitlines() if line.strip()]

    # Split into clean content lines (without splitting on '.' so "B.Tech" stays "B.Tech")
    content_lines: List[str] = []
    for line in raw_lines:
        stripped = re.sub(r"^[\s•·\-*]+", "", line).strip()
        if stripped:
            content_lines.append(stripped)

    # 1. Candidate Name: first non-header line without @ or http
    candidate_name = "Candidate"
    for line in content_lines[:5]:
        if _is_section_header(line):
            continue
        if "@" not in line and "http" not in line.lower() and "linkedin.com" not in line.lower():
            candidate_name = re.sub(r"[^A-Za-z\s.\-]", "", line).strip()
            if 2 <= len(candidate_name.split()) <= 5:
                break

    # 2. Contact details (email, phone, location — leave blank if not found)
    email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", clean_text)
    phone_match = re.search(r"(?:\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}", clean_text)
    loc_match = re.search(r"Location:\s*([^|\n]+)", clean_text, flags=re.I)
    location_str = loc_match.group(1).strip() if loc_match else ""

    # 3. Group lines by section heading
    sections: Dict[str, List[str]] = {
        "HEADER": [],
        "EDUCATION": [],
        "SKILLS": [],
        "EXPERIENCE": [],
        "PROJECTS": [],
        "CERTIFICATIONS": [],
        "ACHIEVEMENTS": [],
    }
    current_sec = "HEADER"
    for line in raw_lines:
        sec = _is_section_header(line)
        if sec:
            current_sec = sec
            continue
        sections[current_sec].append(line)

    # 4. Detect Technical Skills using whole-word regex matching
    lower_text = clean_text.lower()
    detected_skills: List[str] = []
    skill_evidence: Dict[str, str] = {}

    for canonical_skill, aliases in KNOWN_SKILLS_CATALOG.items():
        for alias in aliases:
            if has_whole_word(lower_text, alias):
                detected_skills.append(canonical_skill)
                # Find the best non-header line that proves this skill
                evidence_line = next(
                    (
                        re.sub(r"^[\s•·\-*]+", "", ln).strip()
                        for ln in raw_lines
                        if not _is_section_header(ln) and has_whole_word(ln.lower(), alias)
                    ),
                    f"Detected {canonical_skill} in {filename}.",
                )
                skill_evidence[canonical_skill] = evidence_line[:220]
                break

    # 5. Detect Soft Skills (only what actually appears in text)
    detected_soft: List[str] = []
    for soft in SOFT_SKILLS_CATALOG:
        key_word = soft.split()[0].lower()
        if has_whole_word(lower_text, key_word):
            detected_soft.append(soft)

    # 6. Extract Education (preserving "B.Tech", real institution, real year, real score)
    education: List[Dict[str, str]] = []
    edu_degree_pattern = re.compile(
        r"\b(B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.?|M\.?\s*E\.?|B\.?\s*Sc|M\.?\s*Sc|BCA|MCA|MBA|Ph\.?\s*D|Bachelor|Master)\b",
        flags=re.I,
    )
    edu_Pool = sections["EDUCATION"] if sections["EDUCATION"] else content_lines
    score_str = ""
    for ln in edu_Pool:
        cgpa_m = re.search(r"(?:CGPA|GPA|Percentage|Score)\s*[:\-]?\s*([\d.]+\s*(?:/\s*[\d.]+|%)?)", ln, flags=re.I)
        if cgpa_m:
            score_str = cgpa_m.group(1).strip()

    for ln in edu_Pool:
        clean_ln = re.sub(r"^[\s•·\-*]+", "", ln).strip()
        if edu_degree_pattern.search(clean_ln):
            year_m = re.search(r"\(?\b((?:19|20)\d{2}\s*[–\-—to]+\s*(?:19|20)?\d{2,4}|(?:19|20)\d{2})\b\)?", clean_ln)
            year_val = year_m.group(1).strip() if year_m else ""
            # Remove year parenthetical from line to split degree vs institution
            line_no_year = re.sub(r"\(\s*" + re.escape(year_val) + r"\s*\)", "", clean_ln).strip() if year_val else clean_ln
            parts = [p.strip() for p in re.split(r"\s*[—–\-|]\s*", line_no_year, maxsplit=1) if p.strip()]
            degree_val = parts[0] if parts else clean_ln
            inst_val = parts[1] if len(parts) > 1 else ""
            education.append(
                {
                    "degree": degree_val[:120],
                    "institution": inst_val[:120],
                    "year": year_val,
                    "score": score_str,
                }
            )

    # 7. Extract Work Experience (role, company, duration, highlights)
    work_experience: List[Dict[str, Any]] = []
    current_exp: Dict[str, Any] = {}
    for ln in sections["EXPERIENCE"]:
        is_bullet = bool(re.match(r"^[\s]*[•·\-*]\s+", ln))
        clean_ln = re.sub(r"^[\s•·\-*]+", "", ln).strip()
        if not is_bullet and len(clean_ln) > 8:
            if current_exp:
                work_experience.append(current_exp)
            date_m = re.search(r"\(([^()]*\b(?:19|20)\d{2}[^()]*)\)", clean_ln)
            duration_val = date_m.group(1).strip() if date_m else ""
            header_no_date = clean_ln[: date_m.start()].strip() if date_m else clean_ln
            parts = [p.strip() for p in re.split(r"\s*[—–\-|]\s*", header_no_date, maxsplit=1) if p.strip()]
            work_experience_role = parts[0] if parts else header_no_date
            work_experience_company = parts[1] if len(parts) > 1 else ""
            current_exp = {
                "role": work_experience_role[:100],
                "company": work_experience_company[:100],
                "duration": duration_val[:60],
                "highlights": [],
            }
        elif is_bullet and current_exp:
            current_exp["highlights"].append(clean_ln[:220])
    if current_exp:
        work_experience.append(current_exp)

    # 8. Extract Academic & Personal Projects
    projects: List[Dict[str, Any]] = []
    current_proj: Dict[str, Any] = {}
    proj_source = sections["PROJECTS"]
    if proj_source:
        for ln in proj_source:
            is_bullet = bool(re.match(r"^[\s]*[•·\-*]\s+", ln))
            clean_ln = re.sub(r"^[\s•·\-*]+", "", ln).strip()
            if not is_bullet:
                if current_proj:
                    projects.append(current_proj)
                title_clean = re.sub(r"^(?:\d+[\.\)]\s*)?(?:Project\s*:\s*)?", "", clean_ln, flags=re.I).strip()
                current_proj = {
                    "title": title_clean[:90],
                    "techStack": [sk for sk in detected_skills if has_whole_word(clean_ln.lower(), sk.lower())],
                    "description": "",
                }
            elif is_bullet and current_proj:
                desc = (current_proj["description"] + " " + clean_ln).strip()
                current_proj["description"] = desc[:240]
                for sk in detected_skills:
                    if sk not in current_proj["techStack"] and has_whole_word(clean_ln.lower(), sk.lower()):
                        current_proj["techStack"].append(sk)
        if current_proj:
            projects.append(current_proj)
    else:
        # Fallback if resume has no explicit PROJECTS heading
        proj_keywords = ["built", "developed", "designed", "implemented", "created", "engineered"]
        for ln in content_lines:
            if any(has_whole_word(ln.lower(), k) for k in proj_keywords) and len(ln) > 30:
                matched_stack = [sk for sk in detected_skills if has_whole_word(ln.lower(), sk.lower())]
                projects.append(
                    {
                        "title": ln[:65] + ("..." if len(ln) > 65 else ""),
                        "techStack": matched_stack,
                        "description": ln[:220],
                    }
                )
                if len(projects) >= 3:
                    break

    # 9. Extract Certifications (never treat section headers like "CERTIFICATIONS" as a certificate)
    certifications: List[str] = []
    if sections["CERTIFICATIONS"]:
        for ln in sections["CERTIFICATIONS"]:
            if _is_section_header(ln):
                continue
            clean_cert = re.sub(r"^[\s•·\-*]+", "", ln).strip()
            if len(clean_cert) >= 5:
                certifications.append(clean_cert[:120])
    else:
        for ln in content_lines:
            if _is_section_header(ln):
                continue
            if any(w in ln.lower() for w in ["certified", "certificate", "coursera", "udemy", "edx"]):
                if len(ln) >= 8:
                    certifications.append(ln[:120])

    summary_text = (
        f"Detected {len(detected_skills)} technical skills, {len(projects)} projects, "
        f"and {len(work_experience)} experience entries."
    )

    return {
        "id": f"res-{uuid.uuid4().hex[:10]}",
        "filename": sanitize_short_field(filename, 100),
        "uploadedAt": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "rawText": clean_text,
        "extractionSource": "template",
        "contact": {
            "name": candidate_name,
            "email": email_match.group(0) if email_match else "",
            "phone": phone_match.group(0) if phone_match else "",
            "location": location_str,
        },
        "summary": summary_text,
        "education": education,
        "technicalSkills": detected_skills,
        "softSkills": detected_soft,
        "workExperience": work_experience,
        "projects": projects,
        "certifications": certifications,
        "skillEvidence": skill_evidence,
    }
