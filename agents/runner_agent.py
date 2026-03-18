import os
import subprocess
import sys
from pathlib import Path

WORKSPACE = Path("workspace")


class RunnerAgent:
    """Automatically detects project type and runs it in PowerShell."""

    def run(self, project_name: str):
        folder = WORKSPACE / project_name
        if not folder.exists():
            print(f"  ❌ Project not found: {project_name}")
            return

        files = [f.name for f in folder.rglob("*") if f.is_file()]
        all_files_flat = [
            str(f.relative_to(folder)).replace("\\", "/")
            for f in folder.rglob("*") if f.is_file()
        ]

        print(f"\n{'='*60}")
        print(f"  ▶️  Running: {project_name}")
        print(f"{'='*60}")

        # ── Priority detection ─────────────────────────────
        if "app.py" in files:
            self._run_app_py(folder)

        elif "main.py" in files:
            self._run_main_py(folder)

        elif "index.html" in all_files_flat or "index.html" in files:
            self._run_html(folder)

        elif "index.js" in files or "package.json" in files:
            self._run_node(folder)

        else:
            print("  ⚠️ Cannot detect project type")
            print(f"  📁 Files found: {files}")

    # ── HTML → Python http.server ──────────────────────────
    def _run_html(self, folder: Path):
        port = 8080
        url  = f"http://localhost:{port}"
        print(f"  🌐 HTML project → {url}")
        print(f"  ⏹️  Press Ctrl+C to stop\n")

        # Auto open browser
        subprocess.Popen(
            ["powershell", "-Command",
             f"Start-Sleep -Seconds 1; Start-Process '{url}'"],
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )

        subprocess.run(
            ["python", "-m", "http.server", str(port)],
            cwd=str(folder)
        )

    # ── app.py → FastAPI or Flask ──────────────────────────
    def _run_app_py(self, folder: Path):
        content = (folder / "app.py").read_text(encoding="utf-8").lower()
        req     = folder / "requirements.txt"

        if req.exists():
            print("  📦 Installing requirements...")
            subprocess.run(
                ["pip", "install", "-r", "requirements.txt", "--break-system-packages"],
                cwd=str(folder), capture_output=True
            )

        if "fastapi" in content:
            port = 8000
            url  = f"http://localhost:{port}"
            print(f"  ⚡ FastAPI → {url}")
            print(f"  📖 Docs   → {url}/docs")
            print(f"  ⏹️  Press Ctrl+C to stop\n")

            subprocess.Popen(
                ["powershell", "-Command",
                 f"Start-Sleep -Seconds 2; Start-Process '{url}/docs'"],
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
            subprocess.run(
                ["python", "-m", "uvicorn", "app:app", "--reload", "--port", str(port)],
                cwd=str(folder)
            )

        elif "flask" in content:
            port = 5000
            url  = f"http://localhost:{port}"
            print(f"  🌶️  Flask → {url}")
            print(f"  ⏹️  Press Ctrl+C to stop\n")

            subprocess.Popen(
                ["powershell", "-Command",
                 f"Start-Sleep -Seconds 2; Start-Process '{url}'"],
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
            subprocess.run(["python", "app.py"], cwd=str(folder))

        else:
            print("  🐍 Running app.py...")
            subprocess.run(["python", "app.py"], cwd=str(folder))

    # ── main.py → Python script ────────────────────────────
    def _run_main_py(self, folder: Path):
        req = folder / "requirements.txt"
        if req.exists():
            print("  📦 Installing requirements...")
            subprocess.run(
                ["pip", "install", "-r", "requirements.txt", "--break-system-packages"],
                cwd=str(folder), capture_output=True
            )

        print(f"  🐍 Running main.py...")
        print(f"  ⏹️  Press Ctrl+C to stop\n")
        subprocess.run(["python", "main.py"], cwd=str(folder))

    # ── Node.js ────────────────────────────────────────────
    def _run_node(self, folder: Path):
        print("  📦 npm install...")
        subprocess.run(["npm", "install"], cwd=str(folder), capture_output=True)

        pkg = (folder / "package.json").read_text(encoding="utf-8") if (folder / "package.json").exists() else ""

        if '"start"' in pkg:
            print(f"  🟩 npm start...")
            print(f"  ⏹️  Press Ctrl+C to stop\n")
            subprocess.run(["npm", "start"], cwd=str(folder))
        else:
            print(f"  🟩 node index.js...")
            print(f"  ⏹️  Press Ctrl+C to stop\n")
            subprocess.run(["node", "index.js"], cwd=str(folder))