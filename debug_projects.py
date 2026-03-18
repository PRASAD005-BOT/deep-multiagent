import os
import json
from pathlib import Path

WORKSPACE = Path("workspace")

def count_project_files(path: Path) -> int:
    count = 0
    try:
        for root, dirs, files in os.walk(path):
            if "node_modules" in dirs:
                dirs.remove("node_modules")
            if ".git" in dirs:
                dirs.remove(".git")
            count += len(files)
    except Exception:
        pass
    return count

def debug_projects():
    print(f"CWD: {os.getcwd()}")
    print(f"WORKSPACE: {WORKSPACE.absolute()}")
    if not WORKSPACE.exists():
        print("WORKSPACE DOES NOT EXIST")
        return

    print(f"Contents of {WORKSPACE}:")
    for d in sorted(WORKSPACE.iterdir()):
        print(f" - {d.name} (is_dir: {d.is_dir()}, files: {count_project_files(d)})")

if __name__ == "__main__":
    debug_projects()
