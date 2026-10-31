"""
Root entry point for CareerMatch AI (FastAPI + SQLite + Google Gemini).
Delegates to backend.main so both `python3 app.py` and `python3 -m backend.main` work seamlessly.
"""

from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request


def _ensure_dependencies() -> None:
    """Ensure pip3 and requirements.txt packages are available in fresh container environments."""
    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
        return
    except ImportError:
        pass

    if not shutil.which("pip3"):
        try:
            get_pip_path = Path("/tmp/get-pip.py")
            urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", get_pip_path)
            subprocess.run([sys.executable, str(get_pip_path)], check=True)
        except Exception as exc:
            print(f"Warning: could not bootstrap pip3: {exc}", file=sys.stderr)

    req_file = Path(__file__).resolve().parent / "requirements.txt"
    if req_file.exists():
        pip_cmd = shutil.which("pip3") or shutil.which("pip")
        if pip_cmd:
            subprocess.run([pip_cmd, "install", "-r", str(req_file)], check=True)
        else:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_file)], check=True)


_ensure_dependencies()

from backend.main import app, run_server  # noqa: E402

__all__ = ["app", "run_server"]

if __name__ == "__main__":
    run_server()

