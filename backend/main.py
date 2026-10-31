"""
FastAPI Backend Server for CareerMatch AI.
Provides REST APIs for:
1. AI-powered resume parsing (PDF via PyPDF2, DOCX via python-docx, TXT)
2. Student skill assessment & semantic skill-gap analysis
3. Personalized Google Gemini AI career recommendations & courses (Free & Paid)
4. Interactive roadmap node graph generation
5. Resume improvement suggestions
6. SQLite-backed Interactive Student Dashboard & analysis history
"""

import base64
import json
import mimetypes
import os
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

from backend.ai_service import enrich_resume_profile_with_gemini, generate_career_intelligence
from backend.database import (
    delete_analysis_record,
    get_analysis_by_id,
    get_dashboard_metrics,
    get_resume_by_id,
    get_roadmap_progress,
    init_db,
    save_analysis_record,
    save_resume,
    save_roadmap_progress,
    update_resume_skills,
)
from backend.matching_engine import (
    DEFAULT_WEIGHTS,
    ROLE_TEMPLATES,
    SAMPLE_RESUMES,
    build_roadmap_tree_nodes,
    build_skill_gaps,
    match_resume_to_job,
    resolve_job_profile,
)
from backend.resume_parser import (
    extract_text_from_file_bytes,
    parse_resume_text_to_profile,
    sanitize_plain_text,
    sanitize_short_field,
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")


def seed_initial_sqlite_data() -> None:
    """Initialize SQLite tables and seed demo resumes without calling Gemini on startup."""
    init_db()
    metrics = get_dashboard_metrics()
    if metrics["totalResumes"] == 0:
        for demo in SAMPLE_RESUMES:
            save_resume(demo)


# Initialize SQLite on module load
seed_initial_sqlite_data()


# ============================================================================
# CORE CONTROLLER LOGIC (Shared by FastAPI routes & Fallback Runner)
# ============================================================================

def handle_bootstrap() -> Dict[str, Any]:
    sample_jd_path = os.path.join(ROOT_DIR, "samples", "sample_jd_data_engineer.txt")
    sample_jd = ""
    if os.path.isfile(sample_jd_path):
        try:
            with open(sample_jd_path, "r", encoding="utf-8") as f:
                sample_jd = f.read()
        except Exception:
            sample_jd = ""

    return {
        "dashboard": get_dashboard_metrics(None),
        "roles": ROLE_TEMPLATES,
        "demos": SAMPLE_RESUMES,
        "defaultWeights": DEFAULT_WEIGHTS,
        "sampleJdText": sample_jd,
    }


def handle_parse_resume_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    filename = sanitize_short_field(body.get("filename", "Uploaded_Resume.txt"), 120)
    base64_data = body.get("base64Data", "")
    pasted_text = body.get("pastedText", "")
    dont_save = bool(body.get("dontSave", False))

    if base64_data:
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]
        raw_bytes = base64.b64decode(base64_data)
        extracted_text = extract_text_from_file_bytes(filename, raw_bytes)
    elif pasted_text and len(str(pasted_text).strip()) >= 20:
        extracted_text = sanitize_plain_text(str(pasted_text), 50000)
        filename = "Pasted_Resume.txt"
    else:
        raise ValueError("Please provide a valid PDF, DOCX, or TXT resume file or paste at least 20 characters of resume text.")

    profile = parse_resume_text_to_profile(extracted_text, filename)
    profile = enrich_resume_profile_with_gemini(extracted_text, profile)
    if not dont_save:
        save_resume(profile)
    return {
        "resume": profile,
        "source": profile.get("extractionSource", "template"),
        "saved": not dont_save,
        "dashboard": get_dashboard_metrics(profile["id"] if not dont_save else None),
    }


def handle_analyze_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    resume = body.get("resume")
    resume_id = body.get("resumeId")
    dont_save = bool(body.get("dontSave", False))

    if not resume and resume_id:
        resume = get_resume_by_id(str(resume_id))

    if not resume or not isinstance(resume, dict):
        raise ValueError("Candidate resume profile is required for analysis.")

    # Save resume in SQLite unless the user checked "Don't save my resume"
    if not dont_save:
        save_resume(resume)

    role_title = sanitize_short_field(body.get("roleTitle", "Full Stack Developer"), 100)
    goal_company = sanitize_short_field(body.get("goalCompany", ""), 100)
    custom_jd = sanitize_plain_text(body.get("customJdText", ""), 20000)
    job_url = sanitize_short_field(body.get("jobUrl", ""), 300)
    weights = body.get("weights") or DEFAULT_WEIGHTS
    custom_focus = sanitize_short_field(body.get("customFocus", ""), 200)
    persist_record = bool(body.get("persistRecord", True)) and not dont_save

    active_job = resolve_job_profile(role_title, goal_company, custom_jd, job_url)
    match_result = match_resume_to_job(resume, active_job, weights)
    skill_gaps = build_skill_gaps(match_result, active_job["title"])
    roadmap_nodes = build_roadmap_tree_nodes(match_result, skill_gaps)

    # Compare across all 8 roles for the Multi-Role Comparison tab (real scores only)
    role_comparisons: List[Dict[str, Any]] = []
    for tpl in ROLE_TEMPLATES:
        r_match = match_resume_to_job(resume, tpl, weights)
        role_comparisons.append(
            {
                "id": tpl["id"],
                "title": tpl["title"],
                "overallScore": r_match["overallScore"],
                "mandatorySatisfiedPct": r_match["mandatorySatisfiedPct"],
                "missingCount": len(r_match["missingSkills"]) + len(r_match["partialSkills"]),
            }
        )

    intelligence = generate_career_intelligence(
        resume=resume,
        target_role=active_job["title"],
        goal_company=active_job["companyName"],
        missing_skills=[g["skillName"] for g in skill_gaps],
        custom_focus=custom_focus,
    )

    analysis_id = None
    if persist_record:
        analysis_id = save_analysis_record(
            resume_id=resume["id"],
            candidate_name=resume["contact"]["name"],
            target_role=active_job["title"],
            goal_company=active_job["companyName"],
            match_result=match_result,
            skill_gaps=skill_gaps,
            roadmap=intelligence["stages"],
            advisor=intelligence["advisor"],
            projects=intelligence["projects"],
            improvements=intelligence["improvements"],
        )

    completed_nodes = get_roadmap_progress(resume["id"], active_job["title"]) if not dont_save else {}

    return {
        "analysisId": analysis_id,
        "saved": not dont_save,
        "source": intelligence.get("source", "template"),
        "aiError": intelligence.get("aiError"),
        "resume": resume,
        "activeJob": active_job,
        "matchResult": match_result,
        "skillGaps": skill_gaps,
        "roadmapNodes": roadmap_nodes,
        "completedNodes": completed_nodes,
        "stages": intelligence["stages"],
        "advisor": intelligence["advisor"],
        "projects": intelligence["projects"],
        "improvements": intelligence["improvements"],
        "roleComparisons": role_comparisons,
        "dashboard": get_dashboard_metrics(resume["id"] if not dont_save else None),
    }


def handle_load_history_record(analysis_id: int) -> Dict[str, Any]:
    """Reload a saved analysis record from SQLite by its ID."""
    record = get_analysis_by_id(analysis_id)
    if not record:
        raise ValueError("Saved analysis record not found in SQLite.")

    resume = get_resume_by_id(record["resumeId"]) or SAMPLE_RESUMES[0]
    active_job = resolve_job_profile(record["targetRole"], record["goalCompany"])
    match_result = match_resume_to_job(resume, active_job, DEFAULT_WEIGHTS)
    skill_gaps = record["skillGaps"] or build_skill_gaps(match_result, active_job["title"])
    roadmap_nodes = build_roadmap_tree_nodes(match_result, skill_gaps)
    completed_nodes = get_roadmap_progress(resume["id"], active_job["title"])

    role_comparisons: List[Dict[str, Any]] = []
    for tpl in ROLE_TEMPLATES:
        r_match = match_resume_to_job(resume, tpl, DEFAULT_WEIGHTS)
        role_comparisons.append(
            {
                "id": tpl["id"],
                "title": tpl["title"],
                "overallScore": r_match["overallScore"],
                "mandatorySatisfiedPct": r_match["mandatorySatisfiedPct"],
                "missingCount": len(r_match["missingSkills"]) + len(r_match["partialSkills"]),
            }
        )

    return {
        "analysisId": record["id"],
        "source": "sqlite_history",
        "aiError": None,
        "resume": resume,
        "activeJob": active_job,
        "matchResult": match_result,
        "skillGaps": skill_gaps,
        "roadmapNodes": roadmap_nodes,
        "completedNodes": completed_nodes,
        "stages": record["stages"],
        "advisor": record["advisor"],
        "projects": record["projects"],
        "improvements": record["improvements"],
        "roleComparisons": role_comparisons,
        "dashboard": get_dashboard_metrics(resume["id"]),
    }


def handle_update_roadmap_progress_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    """Save roadmap node completion checkboxes to SQLite."""
    resume_id = sanitize_short_field(body.get("resumeId", ""), 80)
    target_role = sanitize_short_field(body.get("targetRole", ""), 100)
    completed = body.get("completedNodes", {})
    if not resume_id or not target_role or not isinstance(completed, dict):
        raise ValueError("resumeId, targetRole, and completedNodes dict are required.")
    clean_map = {sanitize_short_field(k, 80): bool(v) for k, v in list(completed.items())[:100]}
    saved = save_roadmap_progress(resume_id, target_role, clean_map)
    return {"completedNodes": saved}


def handle_update_skills_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    resume_id = sanitize_short_field(body.get("resumeId", ""), 80)
    raw_skills = body.get("skills", [])
    if not isinstance(raw_skills, list):
        raise ValueError("skills must be a list of strings.")

    clean_skills: List[str] = []
    for s in raw_skills[:50]:
        cs = sanitize_short_field(s, 60)
        if cs and cs not in clean_skills:
            clean_skills.append(cs)

    updated = update_resume_skills(resume_id, clean_skills)
    if not updated:
        raise ValueError("Resume profile not found in SQLite database.")
    return {"resume": updated}


# ============================================================================
# FASTAPI APPLICATION DEFINITION (Used when running with Uvicorn / FastAPI)
# ============================================================================
try:
    from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile  # type: ignore
    from fastapi.middleware.cors import CORSMiddleware  # type: ignore
    from fastapi.responses import FileResponse, JSONResponse  # type: ignore
    from fastapi.staticfiles import StaticFiles  # type: ignore

    app = FastAPI(
        title="CareerMatch AI API",
        description="Python + FastAPI + SQLite + Google Gemini Career Readiness Platform",
        version="2.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next: Any) -> Any:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        return response

    @app.get("/api/health")
    async def api_health() -> Dict[str, str]:
        return {"status": "ok", "stack": "Python + FastAPI + SQLite + Google Gemini"}

    @app.get("/api/bootstrap")
    async def api_bootstrap() -> Dict[str, Any]:
        return handle_bootstrap()

    @app.get("/api/dashboard")
    async def api_dashboard(resumeId: Optional[str] = None) -> Dict[str, Any]:
        return get_dashboard_metrics(resumeId)

    @app.post("/api/resume/parse")
    async def api_parse_resume(request: Request) -> Dict[str, Any]:
        try:
            body = await request.json()
            return handle_parse_resume_payload(body)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to parse resume: {exc}")

    @app.post("/api/resume/upload")
    async def api_upload_multipart(file: UploadFile = File(...)) -> Dict[str, Any]:
        try:
            file_bytes = await file.read()
            text = extract_text_from_file_bytes(file.filename or "resume.pdf", file_bytes)
            profile = parse_resume_text_to_profile(text, file.filename or "resume.pdf")
            save_resume(profile)
            return {"resume": profile, "dashboard": get_dashboard_metrics(profile["id"])}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.post("/api/analyze")
    async def api_analyze(request: Request) -> Dict[str, Any]:
        try:
            body = await request.json()
            return handle_analyze_payload(body)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    @app.put("/api/resume/skills")
    async def api_update_skills(request: Request) -> Dict[str, Any]:
        try:
            body = await request.json()
            return handle_update_skills_payload(body)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.put("/api/roadmap/progress")
    async def api_update_roadmap_progress(request: Request) -> Dict[str, Any]:
        try:
            body = await request.json()
            return handle_update_roadmap_progress_payload(body)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.get("/api/history/{analysis_id}")
    async def api_get_history(analysis_id: int) -> Dict[str, Any]:
        try:
            return handle_load_history_record(analysis_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))

    @app.delete("/api/history/{analysis_id}")
    async def api_delete_history(analysis_id: int) -> Dict[str, Any]:
        existing = get_analysis_by_id(analysis_id)
        res_id = existing["resumeId"] if existing else None
        delete_analysis_record(analysis_id)
        return {"dashboard": get_dashboard_metrics(res_id)}

    # Mount static frontend assets
    if os.path.isdir(FRONTEND_DIR):
        app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

    @app.get("/")
    async def serve_index() -> Any:
        frontend_html = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(frontend_html):
            return FileResponse(frontend_html)
        return FileResponse(os.path.join(ROOT_DIR, "index.html"))

except ImportError:
    app = None


# ============================================================================
# BUILT-IN PYTHON SERVER RUNNER (Runs FastAPI via Uvicorn if installed, or
# Python's native ThreadingHTTPServer so `python -m backend.main` always works)
# ============================================================================

class CareerMatchHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return  # Keep console clean

    def _send_json(self, payload: Any, status: int = 200) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, private")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8", errors="ignore")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self) -> None:
        self._send_json({"ok": True}, 200)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self._send_json({"status": "ok", "stack": "Python + FastAPI + SQLite + Google Gemini"})
            return
        if path == "/api/bootstrap":
            self._send_json(handle_bootstrap())
            return
        if path == "/api/dashboard":
            qs = parse_qs(parsed.query)
            res_id = (qs.get("resumeId") or [None])[0]
            self._send_json(get_dashboard_metrics(res_id))
            return
        if path.startswith("/api/history/"):
            try:
                part = path.split("/api/history/", 1)[1]
                analysis_id = int(part)
                self._send_json(handle_load_history_record(analysis_id))
            except Exception as exc:
                self._send_json({"detail": str(exc)}, 404)
            return

        # Serve static files from /frontend or root
        if path in ("/", "/index.html"):
            target = os.path.join(FRONTEND_DIR, "index.html")
            if not os.path.isfile(target):
                target = os.path.join(ROOT_DIR, "index.html")
            self._serve_file(target)
            return

        rel_path = path.lstrip("/")
        candidate_paths = [
            os.path.join(ROOT_DIR, rel_path),
            os.path.join(FRONTEND_DIR, rel_path),
        ]
        for cpath in candidate_paths:
            real_c = os.path.realpath(cpath)
            if real_c.startswith(ROOT_DIR) and os.path.isfile(real_c):
                self._serve_file(real_c)
                return

        self._send_json({"detail": "Not found"}, 404)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            body = self._read_json_body()
            if path == "/api/resume/parse":
                self._send_json(handle_parse_resume_payload(body))
                return
            if path == "/api/analyze":
                self._send_json(handle_analyze_payload(body))
                return
            self._send_json({"detail": "Endpoint not found"}, 404)
        except ValueError as exc:
            self._send_json({"detail": str(exc)}, 400)
        except Exception as exc:
            traceback.print_exc()
            self._send_json({"detail": f"Server error: {exc}"}, 500)

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/resume/skills":
            try:
                body = self._read_json_body()
                self._send_json(handle_update_skills_payload(body))
            except ValueError as exc:
                self._send_json({"detail": str(exc)}, 400)
            return
        if parsed.path == "/api/roadmap/progress":
            try:
                body = self._read_json_body()
                self._send_json(handle_update_roadmap_progress_payload(body))
            except ValueError as exc:
                self._send_json({"detail": str(exc)}, 400)
            return
        self._send_json({"detail": "Not found"}, 404)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/history/"):
            try:
                part = parsed.path.split("/api/history/", 1)[1]
                analysis_id = int(part)
                existing = get_analysis_by_id(analysis_id)
                res_id = existing["resumeId"] if existing else None
                delete_analysis_record(analysis_id)
                self._send_json({"dashboard": get_dashboard_metrics(res_id)})
            except Exception as exc:
                self._send_json({"detail": str(exc)}, 400)
            return
        self._send_json({"detail": "Not found"}, 404)

    def _serve_file(self, filepath: str) -> None:
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            ctype, _ = mimetypes.guess_type(filepath)
            self.send_response(200)
            self.send_header("Content-Type", ctype or "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            self._send_json({"detail": "File not found"}, 404)


def run_server() -> None:
    port = int(os.environ.get("PORT", "3000"))
    try:
        import uvicorn  # type: ignore
        if app is not None:
            print(f"Starting FastAPI with Uvicorn on http://0.0.0.0:{port}")
            uvicorn.run(app, host="0.0.0.0", port=port)
            return
    except ImportError:
        pass

    print(f"Starting CareerMatch AI Python + SQLite Server on http://0.0.0.0:{port}")
    server = ThreadingHTTPServer(("0.0.0.0", port), CareerMatchHTTPHandler)
    server.serve_forever()


if __name__ == "__main__":
    run_server()
