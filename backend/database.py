"""
SQLite Database Layer for CareerMatch AI.
Uses parameterized SQL statements to prevent SQL injection and persists:
- Uploaded/parsed candidate resumes
- Job compatibility analyses & scores
- Skill assessments (matched vs. missing skills)
- Interactive Student Dashboard metrics & history
"""

import json
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "careermatch.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """Create SQLite tables if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS resumes (
            id TEXT PRIMARY KEY,
            candidate_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            location TEXT,
            filename TEXT NOT NULL,
            raw_text TEXT NOT NULL,
            summary TEXT,
            education_json TEXT NOT NULL,
            skills_json TEXT NOT NULL,
            projects_json TEXT NOT NULL,
            experience_json TEXT NOT NULL,
            certifications_json TEXT NOT NULL,
            soft_skills_json TEXT NOT NULL,
            skill_evidence_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resume_id TEXT NOT NULL,
            candidate_name TEXT NOT NULL,
            target_role TEXT NOT NULL,
            goal_company TEXT NOT NULL,
            overall_score REAL NOT NULL,
            technical_score REAL NOT NULL,
            projects_score REAL NOT NULL,
            education_score REAL NOT NULL,
            certifications_score REAL NOT NULL,
            soft_skills_score REAL NOT NULL,
            mandatory_met_pct REAL NOT NULL,
            preferred_met_pct REAL NOT NULL,
            matched_skills_json TEXT NOT NULL,
            partial_skills_json TEXT NOT NULL,
            missing_skills_json TEXT NOT NULL,
            skill_gaps_json TEXT NOT NULL,
            roadmap_json TEXT NOT NULL,
            courses_json TEXT NOT NULL,
            projects_rec_json TEXT NOT NULL,
            resume_improvements_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS roadmap_progress (
            resume_id TEXT NOT NULL,
            target_role TEXT NOT NULL,
            completed_nodes_json TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (resume_id, target_role)
        );
        """
    )
    conn.commit()
    conn.close()


def save_resume(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or replace a parsed candidate resume into SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    cursor.execute(
        """
        INSERT OR REPLACE INTO resumes (
            id, candidate_name, email, phone, location, filename, raw_text, summary,
            education_json, skills_json, projects_json, experience_json,
            certifications_json, soft_skills_json, skill_evidence_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            profile["id"],
            profile["contact"]["name"],
            profile["contact"].get("email", ""),
            profile["contact"].get("phone", ""),
            profile["contact"].get("location", ""),
            profile["filename"],
            profile["rawText"],
            profile.get("summary", ""),
            json.dumps(profile.get("education", [])),
            json.dumps(profile.get("technicalSkills", [])),
            json.dumps(profile.get("projects", [])),
            json.dumps(profile.get("workExperience", [])),
            json.dumps(profile.get("certifications", [])),
            json.dumps(profile.get("softSkills", [])),
            json.dumps(profile.get("skillEvidence", {})),
            profile.get("uploadedAt", now_iso),
        ),
    )
    conn.commit()
    conn.close()
    return profile


def get_resume_by_id(resume_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a stored resume profile from SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return _row_to_resume(row)


def update_resume_skills(resume_id: str, updated_skills: List[str]) -> Optional[Dict[str, Any]]:
    """Update a candidate's verified technical skills list in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE resumes SET skills_json = ? WHERE id = ?",
        (json.dumps(updated_skills), resume_id),
    )
    conn.commit()
    conn.close()
    return get_resume_by_id(resume_id)


def save_analysis_record(
    resume_id: str,
    candidate_name: str,
    target_role: str,
    goal_company: str,
    match_result: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
    roadmap: List[Dict[str, Any]],
    advisor: Dict[str, Any],
    projects: List[Dict[str, Any]],
    improvements: Dict[str, Any],
) -> int:
    """Save a complete job match analysis and AI recommendations to SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    cursor.execute(
        """
        INSERT INTO analyses (
            resume_id, candidate_name, target_role, goal_company,
            overall_score, technical_score, projects_score, education_score,
            certifications_score, soft_skills_score,
            mandatory_met_pct, preferred_met_pct,
            matched_skills_json, partial_skills_json, missing_skills_json,
            skill_gaps_json, roadmap_json, courses_json,
            projects_rec_json, resume_improvements_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            resume_id,
            candidate_name,
            target_role,
            goal_company,
            match_result["overallScore"],
            match_result["technicalScore"],
            match_result["projectsExperienceScore"],
            match_result["educationScore"],
            match_result["certificationsScore"],
            match_result["softSkillsScore"],
            match_result["mandatorySatisfiedPct"],
            match_result["preferredSatisfiedPct"],
            json.dumps(match_result["matchedSkills"]),
            json.dumps(match_result["partialSkills"]),
            json.dumps(match_result["missingSkills"]),
            json.dumps(skill_gaps),
            json.dumps(roadmap),
            json.dumps(advisor),
            json.dumps(projects),
            json.dumps(improvements),
            now_iso,
        ),
    )
    analysis_id = cursor.lastrowid or 0
    conn.commit()
    conn.close()
    return analysis_id


def delete_analysis_record(analysis_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_analysis_by_id(analysis_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve a saved analysis record by ID from SQLite so users can reload past reports."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "resumeId": row["resume_id"],
        "candidateName": row["candidate_name"],
        "targetRole": row["target_role"],
        "goalCompany": row["goal_company"],
        "overallScore": row["overall_score"],
        "mandatoryMetPct": row["mandatory_met_pct"],
        "preferredMetPct": row["preferred_met_pct"],
        "matchedSkills": json.loads(row["matched_skills_json"]),
        "partialSkills": json.loads(row["partial_skills_json"]),
        "missingSkills": json.loads(row["missing_skills_json"]),
        "skillGaps": json.loads(row["skill_gaps_json"]),
        "stages": json.loads(row["roadmap_json"]),
        "advisor": json.loads(row["courses_json"]),
        "projects": json.loads(row["projects_rec_json"]),
        "improvements": json.loads(row["resume_improvements_json"]),
        "createdAt": row["created_at"],
    }


def get_roadmap_progress(resume_id: str, target_role: str) -> Dict[str, bool]:
    """Load saved roadmap node completion checkboxes from SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT completed_nodes_json FROM roadmap_progress WHERE resume_id = ? AND target_role = ?",
        (resume_id, target_role),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {}
    try:
        data = json.loads(row["completed_nodes_json"])
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_roadmap_progress(resume_id: str, target_role: str, completed_nodes: Dict[str, bool]) -> Dict[str, bool]:
    """Persist roadmap node completion checkboxes to SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    cursor.execute(
        """
        INSERT OR REPLACE INTO roadmap_progress (resume_id, target_role, completed_nodes_json, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (resume_id, target_role, json.dumps(completed_nodes), now_iso),
    )
    conn.commit()
    conn.close()
    return completed_nodes


def get_dashboard_metrics(resume_id: Optional[str] = None) -> Dict[str, Any]:
    """Compute student dashboard statistics for the current resume ('my score over time')."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS cnt FROM resumes")
    total_resumes = cursor.fetchone()["cnt"]

    if resume_id:
        cursor.execute(
            "SELECT * FROM analyses WHERE resume_id = ? ORDER BY id DESC LIMIT 20",
            (resume_id,),
        )
        rows = cursor.fetchall()
    else:
        rows = []
    conn.close()

    total_analyses = len(rows)
    if total_analyses == 0:
        return {
            "totalResumes": total_resumes,
            "totalJobsCompared": 0,
            "averageCompatibilityScore": 0.0,
            "readinessStatus": "Upload a Resume to Begin",
            "topMatchedSkills": [],
            "topMissingSkills": [],
            "recentHistory": [],
        }

    scores = [float(r["overall_score"]) for r in rows]
    avg_score = round(sum(scores) / len(scores), 1)

    if avg_score >= 80:
        readiness = "Industry Ready"
    elif avg_score >= 65:
        readiness = "Strong Foundation"
    else:
        readiness = "Building Core Skills"

    matched_freq: Dict[str, int] = {}
    missing_freq: Dict[str, int] = {}
    history: List[Dict[str, Any]] = []

    for r in rows:
        matched_list = json.loads(r["matched_skills_json"])
        partial_list = json.loads(r["partial_skills_json"])
        missing_list = json.loads(r["missing_skills_json"])
        for m in matched_list:
            skill = m.get("jobSkill", "")
            if skill:
                matched_freq[skill] = matched_freq.get(skill, 0) + 1
        for g in list(partial_list) + list(missing_list):
            skill = g.get("jobSkill", "")
            if skill:
                missing_freq[skill] = missing_freq.get(skill, 0) + 1

        history.append(
            {
                "id": r["id"],
                "resumeId": r["resume_id"],
                "candidateName": r["candidate_name"],
                "targetRole": r["target_role"],
                "goalCompany": r["goal_company"],
                "overallScore": r["overall_score"],
                "mandatoryMetPct": r["mandatory_met_pct"],
                "matchedCount": len(matched_list),
                "missingCount": len(partial_list) + len(missing_list),
                "createdAt": r["created_at"],
            }
        )

    top_matched = [
        {"skill": k, "count": v}
        for k, v in sorted(matched_freq.items(), key=lambda item: item[1], reverse=True)[:6]
    ]
    top_missing = [
        {"skill": k, "count": v}
        for k, v in sorted(missing_freq.items(), key=lambda item: item[1], reverse=True)[:6]
    ]

    return {
        "totalResumes": total_resumes,
        "totalJobsCompared": total_analyses,
        "averageCompatibilityScore": avg_score,
        "readinessStatus": readiness,
        "topMatchedSkills": top_matched,
        "topMissingSkills": top_missing,
        "recentHistory": history[:8],
    }


def _row_to_resume(row: sqlite3.Row) -> Dict[str, Any]:
    skills = json.loads(row["skills_json"])
    return {
        "id": row["id"],
        "filename": row["filename"],
        "uploadedAt": row["created_at"],
        "rawText": row["raw_text"],
        "contact": {
            "name": row["candidate_name"],
            "email": row["email"] or "",
            "phone": row["phone"] or "",
            "location": row["location"] or "",
        },
        "summary": row["summary"] or "",
        "education": json.loads(row["education_json"]),
        "technicalSkills": skills,
        "projects": json.loads(row["projects_json"]),
        "workExperience": json.loads(row["experience_json"]),
        "certifications": json.loads(row["certifications_json"]),
        "softSkills": json.loads(row["soft_skills_json"]),
        "skillEvidence": json.loads(row["skill_evidence_json"]),
    }
