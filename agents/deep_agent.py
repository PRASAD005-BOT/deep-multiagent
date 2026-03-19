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

PYTHON_EXE    = sys.executable.replace("\\", "/")
# WORKSPACE_ABS = str(BASE_WORKSPACE.resolve()).replace("\\", "/") # Will update this later if needed
_CURRENT_MODEL_ICON = {"value": "AI"}

# ── Cross-Platform Config ─────────────────────────────────
IS_WINDOWS = platform.system() == "Windows"
# HIDE CONSOLE ON WINDOWS
POPEN_FLAGS = subprocess.CREATE_NO_WINDOW if IS_WINDOWS else 0
SHELL_EXECUTABLE = "powershell" if IS_WINDOWS else "/bin/bash"


# ════════════════════════════════════════════════════════════
# CUSTOM TOOLS
# ════════════════════════════════════════════════════════════

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
    
    return f"✅ Created: {str(folder.resolve()).replace(chr(92), '/')}"


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
    return f"✅ Written: {filename}  ({size:,} bytes)"


@tool
def read_project_file(project_name: str, filename: str) -> str:
    """Read a file from a project folder."""
    filepath = WORKSPACE / project_name / filename
    if not filepath.exists():
        return f"❌ File not found: {filepath}"
    return filepath.read_text(encoding="utf-8")


@tool
def list_project_files(project_name: str) -> str:
    """List all files inside a specific project with sizes."""
    folder = get_workspace() / project_name
    if not folder.exists():
        return f"❌ Project not found: {project_name}"
    files = sorted([f for f in folder.rglob("*") if f.is_file()])
    if not files:
        return "📭 No files yet."
    lines = []
    for f in files:
        lines.append(f"  └─ {f.relative_to(folder)}  ({f.stat().st_size:,} bytes)")
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
            lines.append(f"📂 {d.name}  ({count} files)")
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
        return (out or "✅ Command completed")[:3000]
    except subprocess.TimeoutExpired:
        return "⚠️ Command timed out after 120s"
    except Exception as e:
        return f"❌ Error: {e}"


@tool
def run_project(project_name: str) -> str:
    """
    Auto-detect tech stack and run project in a new PowerShell window.
    Supports: React/Next.js/Vue/Angular, HTML, FastAPI, Flask,
              Python scripts, Node.js, Fullstack (client+server).
    Uses dynamic port allocation to avoid conflicts.
    """
    def _run_in_shell(cmd_str: str, cwd_dir: str, background: bool = True, wait_for_ui: int = 0):
        if IS_WINDOWS:
            # Windows: Run in background without a visible window
            full_cmd = ["powershell", "-Command", cmd_str]
            # Use CREATE_NO_WINDOW to hide the terminal
            # We don't use -NoExit if we want it to just run in background
            subprocess.Popen(
                full_cmd,
                cwd=cwd_dir,
                creationflags=POPEN_FLAGS
            )
            # Removed the Start-Process logic that opens a separate browser tab
        else:
            # Linux/Docker: Run in background and log to stout
            subprocess.Popen(
                [SHELL_EXECUTABLE, "-c", cmd_str],
                cwd=cwd_dir,
                start_new_session=True
            )

    folder = get_workspace() / project_name

    def find_free_port(start_port: int) -> int:
        import socket
        port = start_port
        while port < start_port + 100:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex(('localhost', port)) != 0:
                    return port
            port += 1
        return start_port

    # Auto-match partial name
    if not folder.exists():
        matches = [d for d in WORKSPACE.iterdir()
                   if d.is_dir() and d.name.startswith(project_name[:6])]
        if matches:
            folder = matches[0]

    if not folder.exists():
        return f"❌ Project not found: {project_name}"

    folder_str = str(folder.resolve())

    # Helper — all file names flat
    def get_files(path):
        return [f.name for f in path.rglob("*")
                if f.is_file()
                and "node_modules" not in str(f)]

    files = get_files(folder)

    # ── FULLSTACK: client/ + server/ subfolders ───────────
    client_dir = folder / "client"
    server_dir = folder / "server"

    if client_dir.exists() and server_dir.exists():
        client_str = str(client_dir.resolve())
        server_str = str(server_dir.resolve())

        # Detect client port
        client_pkg  = (client_dir / "package.json").read_text(encoding="utf-8").lower() \
                      if (client_dir / "package.json").exists() else ""
        base_port   = 5173 if "vite" in client_pkg else 3000
        port        = find_free_port(base_port)
        server_port = find_free_port(5000)
        
        client_cmd  = f"npm run dev -- --port {port}" if "vite" in client_pkg else f"PORT={port} npm start"
        url         = f"http://localhost:{port}"

        print(f"\n  🎯 Fullstack project detected (client + server)")
        print(f"  🔧 Starting server on :{server_port} and client on :{port}")

        print(f"\n  🎯 Fullstack project detected (client + server)")
        print(f"  🔧 Starting server on :{server_port} and client on :{port}")

        # Start backend
        _run_in_shell(f"export PORT={server_port}; npm install; node server.js" if not IS_WINDOWS else f"$env:PORT={server_port}; npm install; node server.js", server_str)
        # Start frontend
        _run_in_shell(client_cmd, client_str, wait_for_ui=12)

        return f"🚀 Fullstack → client:{url}  server:http://localhost:{server_port}"

    # ── React / Next.js / Vue / Angular / Node ───────────
    if "package.json" in files:
        pkg_path = folder / "package.json"
        if not pkg_path.exists():
            pkgs = [f for f in folder.rglob("package.json")
                    if "node_modules" not in str(f)]
            if pkgs:
                pkg_path   = pkgs[0]
                folder_str = str(pkg_path.parent.resolve())

        pkg_text = pkg_path.read_text(encoding="utf-8").lower()

        if "next" in pkg_text:
            base_port = 3000
            port  = find_free_port(base_port)
            cmd   = f"npx next dev -p {port}"
            label = "Next.js"
        elif "react" in pkg_text:
            base_port = 5173 if "vite" in pkg_text else 3000
            port  = find_free_port(base_port)
            cmd   = f"npm run dev -- --port {port}" if "vite" in pkg_text else f"$env:PORT={port}; npm start"
            label = "React (Vite)" if "vite" in pkg_text else "React"
        elif "vue" in pkg_text:
            base_port = 5173
            port  = find_free_port(base_port)
            cmd   = f"npm run dev -- --port {port}"
            label = "Vue"
        elif "angular" in pkg_text or "@angular" in pkg_text:
            base_port = 4200
            port  = find_free_port(base_port)
            cmd   = f"npx ng serve --port {port}"
            label = "Angular"
        elif "svelte" in pkg_text:
            base_port = 5173
            port  = find_free_port(base_port)
            cmd   = f"npm run dev -- --port {port}"
            label = "Svelte"
        else:
            base_port = 3000
            port  = find_free_port(base_port)
            cmd   = f"$env:PORT={port}; npm start" if '"start"' in pkg_text else f"$env:PORT={port}; node index.js"
            label = "Node.js"

        url = f"http://localhost:{port}"
        print(f"\n  📦 {label} project detected")
        print(f"  🔧 Running on port {port}")

        _run_in_shell(cmd, folder_str, wait_for_ui=10)
        return f"🚀 {label} → {url}"

    # ── FastAPI / Flask / app.py ──────────────────────────
    elif "app.py" in files:
        content = (folder / "app.py").read_text(encoding="utf-8").lower()
        if "requirements.txt" in files:
            subprocess.run(
                f'"{PYTHON_EXE}" -m pip install -r requirements.txt --break-system-packages',
                shell=True, cwd=folder_str, capture_output=True, creationflags=POPEN_FLAGS
            )
        if "fastapi" in content:
            port = find_free_port(8000)
            _run_in_shell(f"{PYTHON_EXE} -m uvicorn app:app --host 0.0.0.0 --port {port}", folder_str, wait_for_ui=3)
            return f"🚀 FastAPI → http://localhost:{port}/docs"
        elif "flask" in content:
            port = find_free_port(5000)
            cmd = f"export FLASK_RUN_PORT={port}; {PYTHON_EXE} app.py" if not IS_WINDOWS else f"$env:FLASK_RUN_PORT={port}; {PYTHON_EXE} app.py"
            _run_in_shell(cmd, folder_str, wait_for_ui=2)
            return f"🚀 Flask → http://localhost:{port}"
        else:
            _run_in_shell(f"{PYTHON_EXE} app.py", folder_str)
            return "🚀 app.py running"
    # ── Django manage.py ──────────────────────────────────
    elif "manage.py" in files:
        if "requirements.txt" in files:
            subprocess.run(
                f'"{PYTHON_EXE}" -m pip install -r requirements.txt --break-system-packages',
                shell=True, cwd=folder_str, capture_output=True, creationflags=POPEN_FLAGS
            )
        port = find_free_port(8000)
        # Use 0.0.0.0 for Django to ensure it's accessible
        _run_in_shell(f"{PYTHON_EXE} manage.py runserver 0.0.0.0:{port}", folder_str, wait_for_ui=3)
        return f"🚀 Django → http://localhost:{port}"

    # ── Python main.py ────────────────────────────────────
    elif "main.py" in files:
        if "requirements.txt" in files:
            subprocess.run(
                f'"{PYTHON_EXE}" -m pip install -r requirements.txt --break-system-packages',
                shell=True, cwd=folder_str, capture_output=True, creationflags=POPEN_FLAGS
            )
        _run_in_shell(f"{PYTHON_EXE} main.py", folder_str)
        return "🚀 main.py running"

    # ── Static HTML ───────────────────────────────────────
    else:
        # Fallback to any HTML file if index.html is not found
        html_files = list(folder.rglob("index.html"))
        if not html_files:
            html_files = list(folder.rglob("*.html"))
            
        if html_files:
            # Use the directory containing the HTML file as the web root
            html_dir = str(html_files[0].parent.resolve())
            port = find_free_port(8080)
            _run_in_shell(f"{PYTHON_EXE} -m http.server {port}", html_dir, wait_for_ui=1)
            
            entry_file = html_files[0].name
            if entry_file == "index.html":
                return f"🚀 HTML → http://localhost:{port}"
            else:
                return f"🚀 HTML → http://localhost:{port}/{entry_file}"

    return f"⚠️ Unknown project type. Files: {files[:10]}"


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
        print(f"\n  📦 Running npm install in {folder_str}...")
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
        print(f"\n  🐍 Running pip install...")
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

    return "\n".join(results) if results else "⚠️ No package files found"


@tool
def fix_error_in_project(project_name: str, error_message: str) -> str:
    """
    Analyze an error and prepare context for fixing.
    Reads all project files and returns them with the error for analysis.
    """
    folder = get_workspace() / project_name
    if not folder.exists():
        return f"❌ Project not found: {project_name}"

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
        return f"🗑️ Deleted: {project_name}"
    return f"❌ Not found: {project_name}"


@tool
def generate_image_with_fal(prompt) -> str:
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
    if isinstance(prompt, dict):
        if "prompt" in prompt and isinstance(prompt["prompt"], dict):
            prompt = prompt["prompt"]

        prompt_text = prompt.get("prompt", "")
        negative_prompt = prompt.get("negative_prompt", "")
        model_key = prompt.get("model", "flux-schnell")
        image_size = prompt.get("image_size", "landscape_4_3")
        steps = prompt.get("num_inference_steps", 28)
    else:
        prompt_text = prompt
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
        return "❌ Fal AI API Key not found. Please add it in Settings."

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

            # ⚠️ Only send steps if model supports it
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

            print(f"🔍 Tried {current_model} → {response.status_code}")

            if response.status_code != 200:
                print(f"⚠️ Failed: {response.text[:150]}")
                continue

            data = response.json()
            image_url = data.get("images", [{}])[0].get("url")

            if image_url:
                print(f"✅ Success with {current_model}")
                return image_url

        except Exception as e:
            print(f"❌ Error with {current_model}: {str(e)}")
            continue

    return "❌ All Fal AI models failed. Try again later."


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
            
        return "\n".join(response) if response else "✅ Code executed successfully (no output)."
        
    except subprocess.TimeoutExpired:
        return "❌ Sandbox Error: Execution timed out (30s limit)."
    except Exception as e:
        return f"❌ Sandbox Error: {str(e)}"
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


# ── SYSTEM PROMPT ──────────────────────────────────────────
OS_PATH_HELP = "Windows — use \\ for paths" if IS_WINDOWS else "Linux — use / for paths"
SYSTEM_PROMPT = f"""You are DevAgent, an autonomous expert AI senior software engineer on {"Windows" if IS_WINDOWS else "Linux (Docker)"}.

## Environment
- Workspace : {get_workspace().resolve()}
- Python    : {PYTHON_EXE}
- OS        : {OS_PATH_HELP}

## ⚡ MOST IMPORTANT RULES
- NEVER stop after planning — execute everything immediately
- NEVER shorten project names — use EXACT name given by user
- NEVER wait for user confirmation between steps
- Keep calling tools one after another until ALL files are written
- DO NOT stop after write_todos — immediately start executing

## Supported Tech Stacks
- React (Vite)    → src/main.jsx + src/App.jsx + index.html + package.json + vite.config.js + tailwind.config.js + postcss.config.js
- React (CRA)     → src/index.js + src/App.js + public/index.html + package.json
- Next.js         → pages/index.js + package.json + styles/globals.css
- Vue 3           → src/main.js + src/App.vue + index.html + package.json + vite.config.js
- Angular         → src/app/ + angular.json + package.json
- Svelte          → src/App.svelte + package.json + vite.config.js
- Node/Express    → index.js + package.json + routes/ + middleware/
- FastAPI         → app.py + requirements.txt + routers/
- Flask           → app.py + requirements.txt + templates/ + static/
- HTML/CSS/JS     → index.html + styles/style.css + js/app.js

## React Icons — ONLY use these verified names
- react-icons/fa  → FaGithub, FaLinkedin, FaTwitter, FaExternalLinkAlt, FaShoppingCart, FaStar
- react-icons/hi  → HiMail, HiPhone, HiMenuAlt3, HiX, HiArrowDown, HiSearch
- react-icons/ai  → AiOutlineSend, AiOutlineGithub, AiOutlineMail
- react-icons/bi  → BiCart, BiUser, BiSearch, BiHeart
- NEVER use: HiGithub, HiSend — these DO NOT EXIST

## Build Steps — Execute ALL without stopping
1. create_project(exact_name)
2. write_project_file → package.json FIRST
3. write_project_file → all config files
4. write_project_file → index.html
5. write_project_file → all src files one by one
6. install_dependencies
7. list_project_files → verify
8. run_project → if requested

## STRICT RULES
- 100% complete code — ZERO placeholders or TODOs
- Use write_project_file for EVERY single file
- NEVER use cd command — use project_name parameter in tools
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
                lines.append(f"- {name} ({stack}): {desc} — {len(files)} files")
            return prompt + "\n".join(lines)
    except Exception:
        pass
    return prompt


# ════════════════════════════════════════════════════════════
# LIVE PROGRESS CALLBACK
# ════════════════════════════════════════════════════════════
class LiveProgressCallback(BaseCallbackHandler):

    TOOL_ICONS = {
        "create_project":       "📁 Creating folder",
        "write_project_file":   "✍️  Writing file",
        "read_project_file":    "📖 Reading file",
        "list_project_files":   "📋 Listing files",
        "list_all_projects":    "📂 All projects",
        "run_shell_command":    "⚙️  Running command",
        "run_project":          "🚀 Launching project",
        "install_dependencies": "📦 Installing packages",
        "fix_error_in_project": "🔧 Fixing error",
        "delete_project":       "🗑️  Deleting project",
        "write_file":           "✍️  Writing file",
        "read_file":            "📖 Reading file",
        "edit_file":            "✏️  Editing file",
        "ls":                   "📋 Listing dir",
        "glob":                 "🔍 Searching",
        "grep":                 "🔎 Grep",
        "execute":              "⚙️  Execute",
        "task":                 "📝 Planning",
        "write_todos":          "📝 Todo list",
        "compact_conversation": "🗜️  Compacting",
    }

    def on_tool_start(self, serialized, input_str, **kwargs):
        if not serialized:
            return
        tool_name = serialized.get("name", "tool")
        icon      = self.TOOL_ICONS.get(tool_name, f"🔧 {tool_name}")
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

        print(f"\n  ├─ {icon}")
        print(f"  │   └─ {preview}")

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
                print(f"  │   ✅ {line[:80]}")
                shown += 1

    def on_tool_error(self, error, **kwargs):
        print(f"  │   ❌ {str(error)[:100]}")

    def on_llm_start(self, serialized, prompts, **kwargs):
        model = None
        if serialized:
            kw    = serialized.get("kwargs", {})
            model = kw.get("model_name") or kw.get("model") or serialized.get("name")
        if not model:
            inv   = kwargs.get("invocation_params", {})
            model = inv.get("model") or inv.get("model_name")
        display = MODEL_DISPLAY.get(model) or _CURRENT_MODEL_ICON["value"]
        print(f"\n  🤔 Thinking... ({display})")

    def on_llm_end(self, response, **kwargs):
        try:
            text = response.generations[0][0].text
            if text and len(text) > 10:
                preview = text.strip()[:120].replace("\n", " ")
                print(f"  💭 {preview}...")
        except Exception:
            pass

    def on_agent_action(self, action, **kwargs):
        print(f"\n  🎯 → {action.tool}")

    def on_chain_start(self, serialized, inputs, **kwargs):
        if not serialized:
            return
        name = serialized.get("name", "")
        skip = {"RunnableSequence", "RunnableMap",
                "RunnableLambda", "RunnableParallel", ""}
        if name and name not in skip:
            print(f"\n  🔗 {name}")


# ════════════════════════════════════════════════════════════
# BUILD AGENT
# ════════════════════════════════════════════════════════════
def build_agent(model_key: str = "kimi", task: str = "", project_name: str = ""):
    if model_key == "auto":
        model_key = smart_route(task)

    llm   = MODELS[model_key]
    icon  = ICONS.get(model_key, model_key)
    skill = MODEL_SKILLS.get(model_key, "")
    _CURRENT_MODEL_ICON["value"] = icon

    print(f"\n  🧠 DeepAgent → {icon}")
    print(f"  💡 Best at  → {skill}")

    backend = LocalShellBackend(root_dir=str(Path(".").resolve()))
    agent   = create_deep_agent(
        model=llm,
        tools=CUSTOM_TOOLS,
        system_prompt=build_system_prompt(project_name),  # ✅ project-aware
        backend=backend,
    )
    return agent, model_key


# ════════════════════════════════════════════════════════════
# RUN AGENT — with memory + auto error fixing
# ════════════════════════════════════════════════════════════
def run_agent(task: str, model_key: str = "auto",
              project_name: str = "", max_retries: int = 3) -> str:

    agent, used_key = build_agent(model_key=model_key, task=task)
    callback        = LiveProgressCallback()

    print(f"\n{'='*60}")
    print(f"  🚀 DeepAgent starting...")
    print(f"  📋 Task: {task[:75]}{'...' if len(task)>75 else ''}")
    print(f"{'='*60}\n  🔄 Live Progress:\n  {'─'*50}")

    # ✅ MEMORY: Save user message
    try:
        db.save_message(current_user_id.get(), "user", task)
    except Exception:
        pass

    # ✅ MEMORY: Show similar past errors if fix task
    try:
        if "fix" in task.lower() or "error" in task.lower():
            similar = db.get_similar_errors(current_user_id.get(), task)
            if similar:
                print(f"\n  💡 Similar past errors found:")
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
            print(f"  ✅ Task complete!\n")

            # Extract final message
            messages = result.get("messages", [])
            final    = ""
            for msg in reversed(messages):
                content = getattr(msg, "content", "")
                if content and isinstance(content, str) and len(content) > 10:
                    final = content
                    break

            # ✅ MEMORY: Save assistant response
            try:
                db.save_message(current_user_id.get(), "assistant", final or "Task completed")
            except Exception:
                pass

            # ✅ MEMORY: Save project details
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
                print(f"  ⚠️ Memory save failed: {mem_err}")

            _verify_files()
            return final or "✅ Done."

        except Exception as e:
            error_msg = str(e)
            print(f"\n  {'─'*50}")
            print(f"  ❌ Error on attempt {attempt}/{max_retries}:")
            print(f"  {error_msg[:200]}")

            if attempt < max_retries:
                print(f"\n  🔧 Auto-fixing error... (attempt {attempt+1}/{max_retries})")
                time.sleep(2)

                # ✅ MEMORY: Save error
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
                print(f"\n  ❌ Could not auto-fix after {max_retries} attempts")
                print(f"  💡 Try describing the error using option [5] Fix Bug")
                return f"Error: {error_msg}"

    return "✅ Done."


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
            print(f"  📁 Workspace — project files:")
            any_found = True

        print(f"\n     📂 {d.name}/")
        for f in files:
            print(f"        └─ {f.relative_to(d)}  ({f.stat().st_size:,} bytes)")

    if not any_found:
        print("  📭 No files written yet.")


