import os
import sys
import subprocess
import re
import time
from datetime import datetime
from pathlib import Path
import db
from db import current_user_id
from langchain_core.tools import tool
from langchain_core.callbacks import BaseCallbackHandler
from deepagents import create_deep_agent
from deepagents.backends import LocalShellBackend
from models import MODELS, ICONS, MODEL_SKILLS, MODEL_DISPLAY, smart_route
import requests

import platform

# ── Paths ─────────────────────────────────────────────────
BASE_WORKSPACE = Path("workspace")
BASE_WORKSPACE.mkdir(exist_ok=True)

def get_workspace() -> Path:
    uid = current_user_id.get()
    print(f"DEBUG WORKSPACE: current_user_id is {uid}")
    if uid:
        path = BASE_WORKSPACE / uid
        if not path.exists():
            print(f"DEBUG WORKSPACE: Creating uid folder {path}")
            path.mkdir(parents=True, exist_ok=True)
        return path
    print(f"DEBUG WORKSPACE: UID is None, returning base workspace {BASE_WORKSPACE.resolve()}")
    return BASE_WORKSPACE

WORKSPACE = BASE_WORKSPACE # Default to base, routes should use get_workspace() or WORKSPACE / user_id



# ── Structured Build Error Analyzer ───────────────────────
def analyze_build_error(raw_logs: str, project_type: str = "unknown") -> dict:
    """
    Parse raw build logs and return a structured, user-friendly error report.
    Returns: {"reason": str, "location": str, "fix": str, "error_type": str, "formatted": str}
    """
    import re
    lines = raw_logs.strip().split("\n")
    reason = "Unknown build error"
    location = "Unknown"
    fix = "Check the build logs for details"
    error_type = "Build Error"

    # ── Pattern matching for common errors ─────────────
    for line in lines:
        line_stripped = line.strip()

        # 1. Module not found / import errors
        m = re.search(r"Could not resolve ['\"]([^'\"]+)['\"]", line_stripped)
        if not m:
            m = re.search(r"Module not found.*['\"]([^'\"]+)['\"]", line_stripped)
        if m:
            missing = m.group(1)
            reason = f"Missing module or file: {missing}"
            error_type = "Import Error"
            if missing.startswith("."):
                fix = f"Create the missing file '{missing}' or fix the import path"
            else:
                fix = f"Run 'npm install {missing}' to install the missing package"
            break

        # 2. File location (src/App.jsx:10:5)
        loc_m = re.search(r"(src/[^\s:]+(?::\d+(?::\d+)?))", line_stripped)
        if loc_m:
            location = loc_m.group(1)

        # 3. Syntax errors
        if "SyntaxError" in line_stripped or "Unexpected token" in line_stripped:
            reason = f"Syntax error in code"
            error_type = "Syntax Error"
            fix = f"Fix the syntax at {location}"
            break

        # 4. Dependency errors
        if "ERESOLVE" in line_stripped or "peer dep" in line_stripped.lower():
            reason = "Dependency conflict between packages"
            error_type = "Dependency Error"
            fix = "Run 'npm install --legacy-peer-deps' or update conflicting packages"
            break

        if "npm ERR! missing script" in line_stripped.lower():
            m2 = re.search(r'missing script:\s*(\S+)', line_stripped, re.IGNORECASE)
            script = m2.group(1) if m2 else "build"
            reason = f"Missing npm script: '{script}'"
            error_type = "Build Config Error"
            fix = f"Add a '{script}' script to package.json"
            break

        # 5. TypeScript errors
        if "TS" in line_stripped and re.search(r"TS\d{4}:", line_stripped):
            reason = f"TypeScript error: {line_stripped[:150]}"
            error_type = "Type Error"
            fix = f"Fix the TypeScript error at {location}"
            break

        # 6. Vite-specific errors
        if "[vite]" in line_stripped.lower():
            reason = f"Vite build error: {line_stripped[line_stripped.lower().find('[vite]'):150]}"
            error_type = "Build Config Error"
            fix = "Check vite.config.js and ensure all entry points exist"
            break

        # 7. Permission / file system
        if "EACCES" in line_stripped or "EPERM" in line_stripped:
            reason = "File permission denied"
            error_type = "Runtime Error"
            fix = "Check file permissions or run with elevated privileges"
            break


    # Build formatted output
    formatted = (
        f"[ERR] Build Failed\n\n"
        f"🔍 Reason: {reason}\n\n"
        f"📍 Location: {location}\n\n"
        f"🛠 Fix: {fix}\n\n"
        f"[AI] Error Type: {error_type}"
    )

    return {
        "reason": reason,
        "location": location,
        "fix": fix,
        "error_type": error_type,
        "formatted": formatted
    }


def build_and_get_entry(project_name: str, user_id: str) -> dict:
    """
    Detect project type, build if needed, and return entry info.
    Returns: {"entry_path": "dist/index.html", "type": "react-vite", "status": "ok"|"error", "message": "..."}
    All frontend projects are built to static output so they can be served via /api/workspace/.
    """
    from db import current_user_id as _cuid
    _cuid.set(user_id)
    folder = get_workspace() / project_name

    # Auto-match partial name
    if not folder.exists():
        ws = get_workspace()
        matches = [d for d in ws.iterdir() if d.is_dir() and d.name.startswith(project_name[:6])]
        if matches:
            folder = matches[0]
            project_name = folder.name

    if not folder.exists():
        return {"entry_path": None, "type": "unknown", "status": "error", "message": f"Project '{project_name}' not found"}

    folder_str = str(folder.resolve())

    def _file_names(path):
        return [f.name for f in path.rglob("*") if f.is_file() and "node_modules" not in str(f)]

    files = _file_names(folder)

    # -- Detect stack --
    has_pkg = (folder / "package.json").exists()
    has_vite_config = (folder / "vite.config.js").exists() or (folder / "vite.config.ts").exists()
    has_next_config = (folder / "next.config.js").exists() or (folder / "next.config.mjs").exists() or (folder / "next.config.ts").exists()
    has_app_py = (folder / "app.py").exists()
    has_manage_py = (folder / "manage.py").exists()
    has_requirements = (folder / "requirements.txt").exists()

    pkg_text = ""
    if has_pkg:
        try:
            pkg_text = (folder / "package.json").read_text(encoding="utf-8").lower()
        except Exception:
            pass

    is_vite = has_vite_config or ("vite" in pkg_text and "react" in pkg_text)
    is_next = has_next_config or "next" in pkg_text
    is_node_backend = has_pkg and not is_vite and not is_next and ("express" in pkg_text or "fastify" in pkg_text or '"start"' in pkg_text)
    is_flask = has_app_py and "flask" in (folder / "app.py").read_text(encoding="utf-8").lower() if has_app_py else False
    is_django = has_manage_py

    print(f"BUILD: Detected stack for '{project_name}': vite={is_vite} next={is_next} node_backend={is_node_backend} flask={is_flask} django={is_django}")

    # -- 1. VITE / REACT --
    if is_vite:
        try:
            # Inject base: './' into vite.config so assets use relative paths
            vite_cfg = folder / "vite.config.js"
            if not vite_cfg.exists():
                vite_cfg = folder / "vite.config.ts"
            if vite_cfg.exists():
                cfg_text = vite_cfg.read_text(encoding="utf-8")
                if "base:" not in cfg_text and "base :" not in cfg_text:
                    # Insert base: './' into the defineConfig call
                    cfg_text = cfg_text.replace("defineConfig({", "defineConfig({\n  base: './',", 1)
                    vite_cfg.write_text(cfg_text, encoding="utf-8")
            else:
                # If missing completely, generate a basic config with relative paths
                vite_cfg.write_text(
                    "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  base: './',\n  plugins: [react()]\n});",
                    encoding="utf-8"
                )
                print(f"BUILD: Injected base: './' into {vite_cfg.name}")

            # npm install
            print(f"BUILD: Running npm install in {folder_str}...")
            r = subprocess.run("npm install", shell=True, cwd=folder_str,
                               capture_output=True, text=True, timeout=180, creationflags=POPEN_FLAGS)
            if r.returncode != 0:
                err_report = analyze_build_error(r.stderr or r.stdout, "react-vite")
                return {"entry_path": None, "type": "react-vite", "status": "error", "message": err_report["formatted"]}

            # npm run build
            print(f"BUILD: Running npm run build...")
            r = subprocess.run("npm run build", shell=True, cwd=folder_str,
                               capture_output=True, text=True, timeout=120, creationflags=POPEN_FLAGS)
            if r.returncode != 0:
                err_report = analyze_build_error(r.stderr or r.stdout, "react-vite")
                return {"entry_path": None, "type": "react-vite", "status": "error", "message": err_report["formatted"]}

            print(f"BUILD: Build succeeded!")

            # Find entry
            dist_index = folder / "dist" / "index.html"
            if dist_index.exists():
                return {"entry_path": "dist/index.html", "type": "react-vite", "status": "ok", "message": "Built successfully"}
            else:
                return {"entry_path": None, "type": "react-vite", "status": "error", "message": "dist/index.html not found after build"}

        except subprocess.TimeoutExpired:
            return {"entry_path": None, "type": "react-vite", "status": "error", "message": "Build timed out"}
        except Exception as e:
            return {"entry_path": None, "type": "react-vite", "status": "error", "message": str(e)}

    # -- 2. NEXT.JS --
    elif is_next:
        try:
            # Configure for static export
            next_cfg = folder / "next.config.js"
            if not next_cfg.exists():
                next_cfg = folder / "next.config.mjs"
            if next_cfg.exists():
                cfg_text = next_cfg.read_text(encoding="utf-8")
                if "output" not in cfg_text:
                    cfg_text = cfg_text.replace("module.exports = {", "module.exports = {\n  output: 'export',", 1)
                    cfg_text = cfg_text.replace("export default {", "export default {\n  output: 'export',", 1)
                    next_cfg.write_text(cfg_text, encoding="utf-8")
                    print(f"BUILD: Injected output: 'export' into {next_cfg.name}")

            r = subprocess.run("npm install", shell=True, cwd=folder_str,
                               capture_output=True, text=True, timeout=180, creationflags=POPEN_FLAGS)
            if r.returncode != 0:
                err_report = analyze_build_error(r.stderr or r.stdout, "nextjs")
                return {"entry_path": None, "type": "nextjs", "status": "error", "message": err_report["formatted"]}

            r = subprocess.run("npm run build", shell=True, cwd=folder_str,
                               capture_output=True, text=True, timeout=180, creationflags=POPEN_FLAGS)
            if r.returncode != 0:
                err_report = analyze_build_error(r.stderr or r.stdout, "nextjs")
                return {"entry_path": None, "type": "nextjs", "status": "error", "message": err_report["formatted"]}


            out_index = folder / "out" / "index.html"
            if out_index.exists():
                return {"entry_path": "out/index.html", "type": "nextjs", "status": "ok", "message": "Built successfully"}
            # Fallback to .next/static
            return {"entry_path": None, "type": "nextjs", "status": "error", "message": "out/index.html not found after build"}

        except Exception as e:
            return {"entry_path": None, "type": "nextjs", "status": "error", "message": str(e)}

    # -- 3. NODE BACKEND --
    elif is_node_backend:
        try:
            r = subprocess.run("npm install", shell=True, cwd=folder_str,
                               capture_output=True, text=True, timeout=180, creationflags=POPEN_FLAGS)
            if r.returncode != 0:
                err_report = analyze_build_error(r.stderr or r.stdout, "node-backend")
                return {"entry_path": None, "type": "node-backend", "status": "error", "message": err_report["formatted"]}


            import socket
            port = 3000
            while port < 3100:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    if s.connect_ex(('localhost', port)) != 0:
                        break
                port += 1

            start_cmd = f"$env:PORT={port}; npm start" if IS_WINDOWS else f"PORT={port} npm start"
            subprocess.Popen(
                ["powershell", "-Command", start_cmd] if IS_WINDOWS else ["/bin/bash", "-c", start_cmd],
                cwd=folder_str, creationflags=POPEN_FLAGS if IS_WINDOWS else 0
            )
            time.sleep(2)
            return {"entry_path": None, "type": "node-backend", "status": "ok",
                    "message": f"Server running on port {port}", "port": port}

        except Exception as e:
            return {"entry_path": None, "type": "node-backend", "status": "error", "message": str(e)}

    # ── 4. FLASK ──────────────────────────────────────────
    elif is_flask:
        try:
            if has_requirements:
                r = subprocess.run(f'"{PYTHON_EXE}" -m pip install -r requirements.txt --break-system-packages',
                               shell=True, cwd=folder_str, capture_output=True, text=True, creationflags=POPEN_FLAGS)
                if r.returncode != 0:
                    err_report = analyze_build_error(r.stderr or r.stdout, "flask")
                    return {"entry_path": None, "type": "flask", "status": "error", "message": err_report["formatted"]}


            import socket
            port = 5000
            while port < 5100:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    if s.connect_ex(('localhost', port)) != 0:
                        break
                port += 1

            start_cmd = f'$env:FLASK_RUN_PORT={port}; "{PYTHON_EXE}" app.py' if IS_WINDOWS else f'FLASK_RUN_PORT={port} "{PYTHON_EXE}" app.py'
            subprocess.Popen(
                ["powershell", "-Command", start_cmd] if IS_WINDOWS else ["/bin/bash", "-c", start_cmd],
                cwd=folder_str, creationflags=POPEN_FLAGS if IS_WINDOWS else 0
            )
            time.sleep(2)
            return {"entry_path": None, "type": "flask", "status": "ok",
                    "message": f"Flask running on port {port}", "port": port}

        except Exception as e:
            return {"entry_path": None, "type": "flask", "status": "error", "message": str(e)}

    # ── 5. DJANGO ─────────────────────────────────────────
    elif is_django:
        try:
            if has_requirements:
                r = subprocess.run(f'"{PYTHON_EXE}" -m pip install -r requirements.txt --break-system-packages',
                               shell=True, cwd=folder_str, capture_output=True, text=True, creationflags=POPEN_FLAGS)
                if r.returncode != 0:
                    err_report = analyze_build_error(r.stderr or r.stdout, "django")
                    return {"entry_path": None, "type": "django", "status": "error", "message": err_report["formatted"]}

            import socket
            port = 8000
            while port < 8100:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    if s.connect_ex(('localhost', port)) != 0:
                        break
                port += 1

            start_cmd = f'"{PYTHON_EXE}" manage.py runserver 0.0.0.0:{port}'
            subprocess.Popen(
                ["powershell", "-Command", start_cmd] if IS_WINDOWS else ["/bin/bash", "-c", start_cmd],
                cwd=folder_str, creationflags=POPEN_FLAGS if IS_WINDOWS else 0
            )
            time.sleep(2)
            return {"entry_path": None, "type": "django", "status": "ok",
                    "message": f"Django running on port {port}", "port": port}

        except Exception as e:
            return {"entry_path": None, "type": "django", "status": "error", "message": str(e)}

    # ── 6. STATIC HTML ────────────────────────────────────
    else:
        # Find entry HTML
        html_files = list(folder.rglob("index.html"))
        if not html_files:
            html_files = list(folder.rglob("*.html"))

        if html_files:
            # Prefer index.html closest to root
            html_files.sort(key=lambda f: len(str(f.relative_to(folder))))
            best = html_files[0]
            entry = str(best.relative_to(folder)).replace("\\", "/")
            return {"entry_path": entry, "type": "static-html", "status": "ok", "message": "Static HTML project"}

        return {"entry_path": None, "type": "unknown", "status": "error",
                "message": f"No recognizable entry point. Files found: {files[:15]}"}

PYTHON_EXE    = sys.executable.replace("\\", "/")
# WORKSPACE_ABS = str(BASE_WORKSPACE.resolve()).replace("\\", "/") # Will update this later if needed
_CURRENT_MODEL_ICON = {"value": "AI"}

# ── Cross-Platform Config ─────────────────────────────────
IS_WINDOWS = platform.system() == "Windows"
# HIDE CONSOLE ON WINDOWS
POPEN_FLAGS = subprocess.CREATE_NO_WINDOW if IS_WINDOWS else 0
SHELL_EXECUTABLE = "powershell" if IS_WINDOWS else "/bin/bash"


# ============================================================
# CUSTOM TOOLS
# ============================================================

@tool
def create_project(project_name: str, stack: str = "nodejs", desc: str = "A new project.") -> str:
    """
    Create a new project folder inside workspace/.
    stack: e.g. nodejs, flask/fastapi, react-vite, html
    desc:  Short description of the project
    """
    folder = get_workspace() / project_name
    folder.mkdir(parents=True, exist_ok=True)
    
    # Save to persistent memory for UI
    db.upsert_project(current_user_id.get(), project_name, {
        "name": project_name,
        "stack": stack,
        "desc": desc,
        "status": "initializing",
        "built_at": str(datetime.now().strftime("%Y-%m-%d %H:%M"))
    })
    
    return f"[OK] Created: {str(folder.resolve()).replace(chr(92), '/')}"


@tool
def write_project_file(project_name: str, filename: str, content: str) -> str:
    """
    Write a file inside a project folder.
    project_name : project name  (e.g. my-app)
    filename     : relative path (e.g. src/App.jsx or index.html)
    content      : FULL file content — never truncated
    """
    # Auto-match partial project name
    folder = get_workspace() / project_name
    if not folder.exists():
        matches = [d for d in get_workspace().iterdir()
                   if d.is_dir() and d.name.startswith(project_name[:6])]
        if matches:
            folder = matches[0]
            project_name = folder.name

    filepath = folder / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding="utf-8")
    size = filepath.stat().st_size
    return f"[OK] Written: {filename}  ({size:,} bytes)"


@tool
def read_project_file(project_name: str, filename: str) -> str:
    """Read a file from a project folder."""
    filepath = WORKSPACE / project_name / filename
    if not filepath.exists():
        return f"[ERR] File not found: {filepath}"
    return filepath.read_text(encoding="utf-8")


@tool
def list_project_files(project_name: str) -> str:
    """List all files inside a specific project with sizes."""
    folder = get_workspace() / project_name
    if not folder.exists():
        return f"[ERR] Project not found: {project_name}"
    files = sorted([f for f in folder.rglob("*") if f.is_file()])
    if not files:
        return "📭 No files yet."
    lines = []
    for f in files:
        lines.append(f"  +-- {f.relative_to(folder)}  ({f.stat().st_size:,} bytes)")
    return "\n".join(lines)


@tool
def list_all_projects() -> str:
    """List all projects currently in the workspace."""
    ws = get_workspace()
    if not ws.exists() or not any(ws.iterdir()):
        return "📭 No projects found."
    lines = []
    for d in ws.iterdir():
        if d.is_dir():
            count = len([f for f in d.rglob("*") if f.is_file()])
            lines.append(f"[DIR] {d.name}  ({count} files)")
    return "\n".join(lines)


@tool
def run_shell_command(command: str, project_name: str = "") -> str:
    """
    Run any shell command, optionally inside a project folder.
    Use this to: npm install, npm run build, pip install, etc.
    Returns stdout + stderr combined.
    """
    cwd = str((get_workspace() / project_name).resolve()) if project_name else str(Path(".").resolve())
    try:
        result = subprocess.run(
            command, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=120,
            creationflags=POPEN_FLAGS
        )
        out = (result.stdout or "") + (result.stderr or "")
        return (out or "[OK] Command completed")[:3000]
    except subprocess.TimeoutExpired:
        return "[WARN] Command timed out after 120s"
    except Exception as e:
        return f"[ERR] Error: {e}"


@tool
def run_project(project_name: str) -> str:
    """
    Build and run the project using the unified runner.
    Returns the preview URL or a detailed error report if the build fails.
    """
    uid = current_user_id.get()
    if not uid:
        return "Error: No active user session."

    print(f"TOOL: Running project '{project_name}' for user {uid}")
    res = build_and_get_entry(project_name, uid)

    if res["status"] == "error":
        return f"Build / Run Failed:\n\n{res['message']}"

    # Construct the final URL
    base_url = "http://localhost:10000"
    
    if res.get("entry_path"):
        url = f"{base_url}/api/workspace/{uid}/{project_name}/{res['entry_path']}"
        return f"Project is ready! \n\nPreview URL: {url}\n\nType: {res['type']}"
    elif res.get("port"):
        return f"Backend service started on port {res['port']}! \n\nStatus: {res['message']}"
    else:
        url = f"{base_url}/api/workspace/{uid}/{project_name}/index.html"
        return f"Project is ready! \n\nPreview URL: {url}\n\nType: {res['type']}"



@tool
def install_dependencies(project_name: str) -> str:
    """Install all dependencies. Auto-detects npm/pip."""
    folder = get_workspace() / project_name

    # Auto-match partial name
    if not folder.exists():
        matches = [d for d in WORKSPACE.iterdir()
                   if d.is_dir() and d.name.startswith(project_name[:6])]
        if matches:
            folder = matches[0]
            project_name = folder.name

    folder_str = str(folder.resolve())
    req        = folder / "requirements.txt"
    pkg        = folder / "package.json"
    results    = []

    if pkg.exists():
        print(f"\n  [PKG] Running npm install in {folder_str}...")
        r = subprocess.run(
            "npm install",
            shell=True,
            cwd=folder_str,
            capture_output=True,
            text=True,
            timeout=180,
            creationflags=POPEN_FLAGS
        )
        out = (r.stdout + r.stderr)[:600]
        results.append(f"npm: {out}")

    if req.exists():
        print(f"\n  [PY] Running pip install...")
        r = subprocess.run(
            f'"{PYTHON_EXE}" -m pip install -r requirements.txt --break-system-packages',
            shell=True,
            cwd=folder_str,
            capture_output=True,
            text=True,
            creationflags=POPEN_FLAGS
        )
        out = (r.stdout + r.stderr)[:600]
        results.append(f"pip: {out}")

    return "\n".join(results) if results else "[WARN] No package files found"


@tool
def fix_error_in_project(project_name: str, error_message: str) -> str:
    """
    Analyze an error and prepare context for fixing.
    Reads all project files and returns them with the error for analysis.
    """
    folder = get_workspace() / project_name
    if not folder.exists():
        return f"[ERR] Project not found: {project_name}"

    all_files = {}
    for f in folder.rglob("*"):
        if f.is_file() and f.suffix in [
            ".py", ".js", ".jsx", ".ts", ".tsx",
            ".html", ".css", ".json", ".vue", ".svelte"
        ]:
            try:
                all_files[str(f.relative_to(folder))] = f.read_text(encoding="utf-8")
            except Exception:
                pass

    return f"""
ERROR TO FIX: {error_message}

PROJECT FILES:
{chr(10).join([f"=== {k} ==={chr(10)}{v[:2000]}" for k, v in list(all_files.items())[:8]])}

Analyze the error, identify which file(s) need fixing,
and use write_project_file to write the corrected version(s).
"""


@tool
def delete_project(project_name: str) -> str:
    """Delete a project from workspace permanently."""
    import shutil
    folder = get_workspace() / project_name
    if folder.exists():
        shutil.rmtree(folder)
        try:
            db.delete_project_memory(current_user_id.get(), project_name)
        except Exception:
            pass
        return f"[DEL] Deleted: {project_name}"
    return f"[ERR] Not found: {project_name}"


@tool
def generate_image_with_fal(image_description: str) -> str:
    """
    Generate an image using Fal AI.
    - Fixes invalid steps issue
    - Supports your custom models
    - Adds fallback handling
    """

    # ── MODEL MAP (your config) ─────────────────────
    MODELS = {
        "flux-schnell": "fal-ai/flux/schnell",
        "flux-dev": "fal-ai/flux/dev",
        "flux-2-turbo": "fal-ai/flux-2-turbo",
        "flux-pro": "fal-ai/flux-pro",
        "flux-lora": "fal-ai/flux-lora",
    }

    # ── UNWRAP INPUT ───────────────────────────────
    if isinstance(image_description, dict):
        if "prompt" in image_description and isinstance(image_description["prompt"], dict):
            image_description = image_description["prompt"]

        prompt_text = image_description.get("prompt", "")
        negative_prompt = image_description.get("negative_prompt", "")
        model_key = image_description.get("model", "flux-schnell")
        image_size = image_description.get("image_size", "landscape_4_3")
        steps = image_description.get("num_inference_steps", 28)
    else:
        prompt_text = image_description
        negative_prompt = ""
        model_key = "flux-schnell"
        image_size = "landscape_4_3"
        steps = 28

    # Resolve model
    model = MODELS.get(model_key, MODELS["flux-schnell"])

    # ── API KEY ───────────────────────────────────
    integration = db.get_integration(current_user_id.get(), "fal-ai")
    api_key = integration.get("api_key")

    if not api_key:
        return "[ERR] Fal AI API Key not found. Please add it in Settings."

    print(f"🎨 Generating image: {prompt_text[:50]}...")
    print(f"🤖 Model: {model_key}")

    # ── FALLBACK MODELS ───────────────────────────
    fallback_models = [
        model,
        MODELS["flux-dev"],
        MODELS["flux-2-turbo"],
        MODELS["flux-pro"],
    ]

    # ── TRY EACH MODEL ────────────────────────────
    for current_model in fallback_models:
        try:
            payload = {
                "prompt": prompt_text,
                "negative_prompt": negative_prompt,
                "image_size": image_size
            }

            # [WARN] Only send steps if model supports it
            if not any(x in current_model for x in ["schnell", "turbo"]):
                payload["num_inference_steps"] = max(1, min(steps, 50))

            response = requests.post(
                f"https://fal.run/{current_model}",
                headers={
                    "Authorization": f"Key {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=60
            )

            print(f"🔍 Tried {current_model} -> {response.status_code}")

            if response.status_code != 200:
                print(f"[WARN] Failed: {response.text[:150]}")
                continue

            data = response.json()
            image_url = data.get("images", [{}])[0].get("url")

            if image_url:
                print(f"[OK] Success with {current_model}")
                return image_url

        except Exception as e:
            print(f"[ERR] Error with {current_model}: {str(e)}")
            continue

    return "[ERR] All Fal AI models failed. Try again later."


@tool
def python_sandbox(code: str) -> str:
    """
    Execute Python code in a sandbox environment and return the output.
    Use this to perform complex calculations, data processing, or test logic.
    Input 'code' should be a valid Python script.
    """
    import tempfile
    import subprocess
    import os
    import sys

    print(f"\n  🧪 Executing code in sandbox...")
    
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode='w', encoding='utf-8') as f:
        f.write(code)
        temp_path = f.name

    try:
        # Run in a separate process with a timeout
        result = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=30,
            creationflags=POPEN_FLAGS
        )
        
        output = result.stdout
        errors = result.stderr
        
        response = []
        if output:
            response.append(f"Output:\n{output}")
        if errors:
            response.append(f"Errors:\n{errors}")
            
        return "\n".join(response) if response else "[OK] Code executed successfully (no output)."
        
    except subprocess.TimeoutExpired:
        return "[ERR] Sandbox Error: Execution timed out (30s limit)."
    except Exception as e:
        return f"[ERR] Sandbox Error: {str(e)}"
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


# ── Tools list ────────────────────────────────────────────
CUSTOM_TOOLS = [
    create_project,
    write_project_file,
    read_project_file,
    list_project_files,
    list_all_projects,
    run_shell_command,
    run_project,
    install_dependencies,
    fix_error_in_project,
    delete_project,
    generate_image_with_fal,
    python_sandbox,
]


# -- SYSTEM PROMPT ------------------------------------------
OS_PATH_HELP = "Windows - use \\ for paths" if IS_WINDOWS else "Linux - use / for paths"
SYSTEM_PROMPT = f"""You are DevAgent, an autonomous expert AI senior software engineer on {"Windows" if IS_WINDOWS else "Linux (Docker)"}.

## Environment
- Workspace : {get_workspace().resolve()}
- Python    : {PYTHON_EXE}
- OS        : {OS_PATH_HELP}

## !! MOST IMPORTANT RULES
- NEVER stop after planning - execute everything immediately
- NEVER shorten project names - use EXACT name given by user
- NEVER wait for user confirmation between steps
- Keep calling tools one after another until ALL files are written
- DO NOT stop after write_todos - immediately start executing


## Supported Tech Stacks
- React (Vite)    -> src/main.jsx + src/App.jsx + index.html + package.json + vite.config.js + tailwind.config.js + postcss.config.js
- React (CRA)     -> src/index.js + src/App.js + public/index.html + package.json
- Next.js         -> pages/index.js + package.json + styles/globals.css
- Vue 3           -> src/main.js + src/App.vue + index.html + package.json + vite.config.js
- Angular         -> src/app/ + angular.json + package.json
- Svelte          -> src/App.svelte + package.json + vite.config.js
- Node/Express    -> index.js + package.json + routes/ + middleware/
- FastAPI         -> app.py + requirements.txt + routers/
- Flask           -> app.py + requirements.txt + templates/ + static/
- HTML/CSS/JS     -> index.html + styles/style.css + js/app.js

## React Icons - ONLY use these verified names
- react-icons/fa  - FaGithub, FaLinkedin, FaTwitter, FaExternalLinkAlt, FaShoppingCart, FaStar
- react-icons/hi  - HiMail, HiPhone, HiMenuAlt3, HiX, HiArrowDown, HiSearch
- react-icons/ai  - AiOutlineSend, AiOutlineGithub, AiOutlineMail
- react-icons/bi  - BiCart, BiUser, BiSearch, BiHeart
- NEVER use: HiGithub, HiSend - these DO NOT EXIST


## Build Steps - Execute ALL without stopping
1. create_project(exact_name)
2. write_project_file -> package.json FIRST
3. write_project_file -> all config files
4. write_project_file -> index.html
5. write_project_file -> all src files one by one
6. install_dependencies
7. list_project_files -> verify
8. run_project -> if requested

## STRICT RULES
- 100% complete code - ZERO placeholders or TODOs
- Use write_project_file for EVERY single file
- NEVER use cd command - use project_name parameter in tools
- Verify with list_project_files after all files written
- When running projects or providing previews, provide the FULL exact URL including the path (e.g. http://localhost:8080/s.html)

"""


def build_system_prompt(project_name: str = "") -> str:
    """Build system prompt with memory context injected."""
    prompt = SYSTEM_PROMPT
    if project_name:
        prompt += f"\n\n## CURRENT PROJECT CONTEXT\n- You are currently working on the project: **{project_name}**"
        prompt += f"\n- All your file operations (read/write/list) should default to this project unless stated otherwise."

    try:
        known = db.get_all_projects(current_user_id.get())
        if known:
            lines = ["\n## Projects You Already Know About"]
            for name, details in known.items():
                desc  = details.get("description", "")[:80]
                stack = details.get("stack",        "unknown")
                files = details.get("files",        [])
                lines.append(f"- {name} ({stack}): {desc} - {len(files)} files")
            return prompt + "\n".join(lines)
    except Exception:
        pass
    return prompt


# ============================================================
# LIVE PROGRESS CALLBACK
# ============================================================
class LiveProgressCallback(BaseCallbackHandler):

    TOOL_ICONS = {
        "create_project":       "folder: Creating folder",
        "write_project_file":   "write: Writing file",
        "read_project_file":    "read: Reading file",
        "list_project_files":   "list: Listing files",
        "list_all_projects":    "list: All projects",
        "run_shell_command":    "run: Running command",
        "run_project":          "run: Launching project",
        "install_dependencies": "pkg: Installing packages",
        "fix_error_in_project": "fix: Fixing error",
        "delete_project":       "delete: Deleting project",
        "write_file":           "write: Writing file",
        "read_file":            "read: Reading file",
        "edit_file":            "edit: Editing file",
        "ls":                   "list: Listing dir",
        "glob":                 "search: Searching",
        "grep":                 "grep: Grep",
        "execute":              "run: Execute",
        "task":                 "plan: Planning",
        "write_todos":          "plan: Todo list",
        "compact_conversation": "zip: Compacting",
    }


    def on_tool_start(self, serialized, input_str, **kwargs):
        if not serialized:
            return
        tool_name = serialized.get("name", "tool")
        icon      = self.TOOL_ICONS.get(tool_name, f"[FIX] {tool_name}")
        raw       = str(input_str)

        if tool_name == "write_project_file":
            match   = re.search(r"'filename'\s*:\s*'([^']+)'", raw)
            preview = match.group(1) if match else "unknown file"
        elif tool_name == "run_shell_command":
            match   = re.search(r"'command'\s*:\s*'([^']+)'", raw)
            preview = match.group(1)[:60] if match else raw[:60]
        else:
            match   = re.search(r"'(?:project_name|path)'\s*:\s*'([^']+)'", raw)
            preview = match.group(1) if match else (
                raw[:60] + "..." if len(raw) > 60 else raw
            )

        print(f"\n  +-- {icon}")
        print(f"  |   +-- {preview}")

    def on_tool_end(self, output, **kwargs):
        if not output:
            return
        raw   = str(output)
        match = re.search(r"content='([^']*)'", raw)
        if match:
            raw = match.group(1)
        lines = raw.strip().split("\n")
        shown = 0
        for line in lines:
            line = line.strip()
            if line and shown < 3:
                print(f"  |   [OK] {line[:80]}")
                shown += 1

    def on_tool_error(self, error, **kwargs):
        print(f"  |   [ERR] {str(error)[:100]}")

    def on_llm_start(self, serialized, prompts, **kwargs):
        model = None
        if serialized:
            kw    = serialized.get("kwargs", {})
            model = kw.get("model_name") or kw.get("model") or serialized.get("name")
        if not model:
            inv   = kwargs.get("invocation_params", {})
            model = inv.get("model") or inv.get("model_name")
        display = MODEL_DISPLAY.get(model) or _CURRENT_MODEL_ICON["value"]
        print(f"\n  thinking... Thinking... ({display})")

    def on_llm_end(self, response, **kwargs):
        try:
            text = response.generations[0][0].text
            if text and len(text) > 10:
                preview = text.strip()[:120].replace("\n", " ")
                print(f"  thought: {preview}...")
        except Exception:
            pass

    def on_agent_action(self, action, **kwargs):
        print(f"\n  [TARGET] -> {action.tool}")

    def on_chain_start(self, serialized, inputs, **kwargs):
        if not serialized:
            return
        name = serialized.get("name", "")
        skip = {"RunnableSequence", "RunnableMap",
                "RunnableLambda", "RunnableParallel", ""}
        if name and name not in skip:
            print(f"\n  [LINK] {name}")


# ============================================================
# BUILD AGENT
# ============================================================
def build_agent(model_key: str = "kimi", task: str = "", project_name: str = ""):
    if model_key == "auto":
        model_key = smart_route(task)

    llm   = MODELS[model_key]
    icon  = ICONS.get(model_key, model_key)
    skill = MODEL_SKILLS.get(model_key, "")
    _CURRENT_MODEL_ICON["value"] = icon

    print(f"\n  [AI] DeepAgent -> {icon}")
    print(f"  [TIP] Best at  -> {skill}")

    backend = LocalShellBackend(root_dir=str(Path(".").resolve()))
    agent   = create_deep_agent(
        model=llm,
        tools=CUSTOM_TOOLS,
        system_prompt=build_system_prompt(project_name),  # [OK] project-aware
        backend=backend,
    )
    return agent, model_key


# ============================================================
# RUN AGENT — with memory + auto error fixing
# ============================================================
def run_agent(task: str, model_key: str = "auto",
              project_name: str = "", max_retries: int = 3) -> str:

    agent, used_key = build_agent(model_key=model_key, task=task)
    callback        = LiveProgressCallback()

    print(f"\n{'='*60}")
    print(f"  [RUN] DeepAgent starting...")
    print(f"  📋 Task: {task[:75]}{'...' if len(task)>75 else ''}")
    print(f"{'='*60}\n  🔄 Live Progress:\n  {'─'*50}")

    # [OK] MEMORY: Save user message
    try:
        db.save_message(current_user_id.get(), "user", task)
    except Exception:
        pass

    # [OK] MEMORY: Show similar past errors if fix task
    try:
        if "fix" in task.lower() or "error" in task.lower():
            similar = db.get_similar_errors(current_user_id.get(), task)
            if similar:
                print(f"\n  [TIP] Similar past errors found:")
                for e in similar:
                    print(f"     • {e['project']}: {e['error'][:60]}...")
                    print(f"       Fixed by: {e['fix'][:60]}...")
    except Exception:
        pass

    for attempt in range(1, max_retries + 1):
        try:
            result = agent.invoke(
                {"messages": [{"role": "user", "content": task}]},
                config={"callbacks": [callback], "recursion_limit": 200},
            )

            print(f"\n  {'─'*50}")
            print(f"  [OK] Task complete!\n")

            # Extract final message
            messages = result.get("messages", [])
            final    = "Task completed successfully."
            if messages:
                last_msg = messages[-1]
                mtype = getattr(last_msg, "type", type(last_msg).__name__).lower()
                if mtype == "ai" or "ai" in mtype:
                    content = getattr(last_msg, "content", "")
                    if isinstance(content, list):
                        texts = [c.get("text", "") for c in content if isinstance(c, dict) and "text" in c]
                        content = " ".join(texts)
                    if content and isinstance(content, str) and len(content.strip()) > 0:
                        final = content

            # [OK] MEMORY: Save assistant response
            try:
                db.save_message(current_user_id.get(), "assistant", final or "Task completed")
            except Exception:
                pass

            # [OK] MEMORY: Save project details
            try:
                if project_name:
                    folder = Path("workspace") / project_name
                    files  = [
                        str(f.relative_to(folder)).replace("\\", "/")
                        for f in folder.rglob("*") if f.is_file()
                    ] if folder.exists() else []

                    stack = "unknown"
                    if any("jsx" in f or "tsx" in f for f in files): stack = "react-vite"
                    elif any("vue" in f for f in files):              stack = "vue"
                    elif "app.py" in files:                           stack = "flask/fastapi"
                    elif any("index.js" in f for f in files):         stack = "nodejs"
                    elif any("index.html" in f for f in files):       stack = "html"
                    elif any(f.endswith(".html") for f in files):     stack = "html"

                    db.upsert_project(current_user_id.get(), project_name, {
                        "description": task[:100],
                        "stack":       stack,
                        "files":       files,
                        "model_used":  used_key,
                        "built_at":    str(datetime.now().date()),
                        "status":      "built",
                    })
                    print(f"  💾 Saved to memory: {project_name}")
            except Exception as mem_err:
                print(f"  [WARN] Memory save failed: {mem_err}")

            _verify_files()
            return final or "[OK] Done."

        except Exception as e:
            error_msg = str(e)
            print(f"\n  {'─'*50}")
            print(f"  [ERR] Error on attempt {attempt}/{max_retries}:")
            print(f"  {error_msg[:200]}")

            if attempt < max_retries:
                print(f"\n  [FIX] Auto-fixing error... (attempt {attempt+1}/{max_retries})")
                time.sleep(2)

                # [OK] MEMORY: Save error
                try:
                    if project_name:
                        db.save_error(current_user_id.get(), project_name, str(e), "auto-retry")
                        db.update_project(current_user_id.get(), project_name, {"status": "error"})
                except Exception:
                    pass

                task = f"""
The previous attempt had this error:
{error_msg}

Project: {project_name or 'unknown'}

Please:
1. Analyze the error carefully
2. Read the relevant files using read_project_file
3. Fix the root cause
4. Rewrite the broken files using write_project_file
5. Verify with list_project_files
"""

                agent, _ = build_agent(model_key=used_key, task=task)

            else:
                print(f"\n  [ERR] Could not auto-fix after {max_retries} attempts")
                print(f"  [TIP] Try describing the error using option [5] Fix Bug")
                return f"Error: {error_msg}"

    return "[OK] Done."


def _verify_files():
    workspace = Path("workspace")
    if not workspace.exists():
        return

    # Folders to skip entirely
    SKIP = {"node_modules", ".git", "__pycache__", ".next",
            "dist", "build", ".vite", ".cache"}

    any_found = False
    for d in sorted(workspace.iterdir()):
        if not d.is_dir():
            continue

        # Only count real project files (skip node_modules etc)
        files = sorted([
            f for f in d.rglob("*")
            if f.is_file()
            and not any(part in SKIP for part in f.parts)
        ])

        if not files:
            continue

        if not any_found:
            print(f"  [DIR] Project files:")
            any_found = True

        print(f"\n     [DIR] {d.name}/")
        for f in files:
            print(f"        +-- {f.relative_to(d)}  ({f.stat().st_size:,} bytes)")

    if not any_found:
        print("  📭 No files written yet.")


