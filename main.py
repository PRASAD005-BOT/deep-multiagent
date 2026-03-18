import sys
from pathlib import Path
import db
from db import current_user_id
from agents.deep_agent import run_agent, get_workspace
from models import ICONS, MODEL_SKILLS, smart_route

# Set local user context for CLI
current_user_id.set("local-cli-user")

MODEL_OPTIONS = {
    "A": ("auto",    "🧭 AUTO         — Smart route (recommended)"),
    "1": ("gpt5",    "🔵 GPT-5.2      — Planning & Architecture"),
    "2": ("kimi",    "🟠 Kimi K2.5    — All Tech Stacks ✅"),
    "3": ("minimax", "🟣 MiniMax M2.5 — Workflows & Docs"),
    "4": ("gemini3", "🟢 Gemini 3     — Fast & Lightweight"),
    "5": ("claude",  "🤖 Claude Sonnet— Reasoning & Chat"),
}

TECH_STACKS = """
  ┌─────────────────────────────────────────────────────┐
  │  Supported Tech Stacks                              │
  ├─────────────────────────────────────────────────────┤
  │  Frontend  : React, Next.js, Vue, Angular, Svelte  │
  │  Backend   : FastAPI, Flask, Django, Express        │
  │  Fullstack : React+FastAPI, Next.js+Express         │
  │  Static    : HTML + CSS + JavaScript                │
  │  Scripts   : Python, Node.js                        │
  └─────────────────────────────────────────────────────┘"""


def header():
    try:
        count = len(db.get_user_projects(current_user_id.get()))
    except Exception:
        count = 0
    print("\n" + "=" * 60)
    print("  🤖  DevAgent — Agentic AI Project Builder")
    print(f"  🧠  Memory: {count} projects remembered")
    print("  Powered by DeepAgents + LangChain + OpenRouter")
    print("=" * 60)


def pick_model(description: str = "") -> str:
    print("\n  🤖 Select Model:")
    print("  " + "─" * 44)
    for k, (key, label) in MODEL_OPTIONS.items():
        print(f"  [{k}] {label}")
    print("  " + "─" * 44)
    choice    = input("  Pick (A/1-5) [default=A]: ").strip().upper() or "A"
    model_key = MODEL_OPTIONS.get(choice, MODEL_OPTIONS["A"])[0]
    label     = MODEL_OPTIONS.get(choice, MODEL_OPTIONS["A"])[1]
    print(f"\n  ✅ {label}")
    return model_key


def get_description(prompt: str = "📝 Describe your project") -> str:
    """
    ✅ FIXED paste input — collects ALL lines.
    Type OR paste your description.
    Type 'DONE' on a new line to finish.
    OR press Enter twice on an empty line to finish.
    """
    print(f"\n  {prompt}")
    print("  " + "─" * 50)
    print("  💡 Tip: Type OR paste your full description.")
    print("  💡 When done: type DONE and press Enter")
    print("               OR press Enter twice on empty line")
    print("  " + "─" * 50)

    lines       = []
    empty_count = 0

    while True:
        try:
            line = input("  > ")
        except EOFError:
            break

        # "DONE" keyword = finish
        if line.strip().upper() == "DONE":
            break

        # Two consecutive empty lines = finish
        if line.strip() == "":
            empty_count += 1
            if empty_count >= 2 and lines:
                break
            elif lines:
                # First empty line — add it but keep waiting
                lines.append(line)
            continue
        else:
            empty_count = 0  # reset on non-empty line
            lines.append(line)

    # Remove trailing empty lines
    while lines and lines[-1].strip() == "":
        lines.pop()

    result = "\n".join(lines).strip()
    if result:
        print(f"\n  ✅ Description received ({len(result)} chars)")
    return result


def list_projects():
    workspace = Path("workspace")
    if not workspace.exists() or not any(workspace.iterdir()):
        print("\n  📭 No projects yet.")
        return
    print("\n  📁 Your Projects:")
    print("  " + "─" * 44)
    for d in workspace.iterdir():
        if d.is_dir():
            count = len([f for f in d.rglob("*") if f.is_file()])
            print(f"     📂 {d.name}  ({count} files)")
    print("  " + "─" * 44)


def menu():
    print(f"""
  ┌──────────────────────────────────────────────┐
  │         🛠️  DEVAGENT MENU                     │
  ├──────────────────────────────────────────────┤
  │  [C]  💬  Chat with DevAgent  ← MAIN MODE    │
  │  [1]  🏗️  Build new project                  │
  │  [2]  ▶️  Run existing project                │
  │  [3]  🏗️▶️  Build + Run immediately           │
  │  [4]  ✨  Add feature to project             │
  │  [5]  🔧  Fix a bug / error                  │
  │  [6]  📂  List all projects                  │
  │  [7]  📋  List files in a project            │
  │  [8]  📖  Read a specific file               │
  │  [9]  🗑️  Delete a project                   │
  │  [M]  🧠  Memory summary                     │
  │  [T]  📦  Tech stack info                    │
  │  [0]  ❌  Exit                                │
  └──────────────────────────────────────────────┘""")


# ── CHAT MODE ─────────────────────────────────────────────
def run_chat():
    print("\n" + "=" * 60)
    print("  💬 CHAT MODE — Agentic DevAgent")
    print("  Type or PASTE your message.")
    print("  Type DONE or press Enter twice to send.")
    print("  Type 'exit' to go back to menu.")
    print("=" * 60)
    print("""
  💡 Examples:
     "Build a React todo app with Tailwind CSS"
     "Create a Next.js blog with dark mode"
     "Build FastAPI + React fullstack app"
     "Add user authentication to my flask-app"
     "Fix the module not found error in my react-app"
     "What projects do I have?"
""")
    model_key = pick_model("chat")

    while True:
        print("\n  You (type DONE or Enter twice to send):")
        print("  " + "─" * 40)
        lines       = []
        empty_count = 0

        try:
            while True:
                line = input("  > ")

                if line.strip().upper() == "DONE":
                    break
                if line.strip() == "":
                    empty_count += 1
                    if empty_count >= 2 and lines:
                        break
                    elif lines:
                        lines.append(line)
                    continue
                else:
                    empty_count = 0
                    lines.append(line)

        except KeyboardInterrupt:
            print("\n  👋 Back to menu...")
            break

        # Remove trailing empty lines
        while lines and lines[-1].strip() == "":
            lines.pop()

        user_input = "\n".join(lines).strip()

        if not user_input:
            continue
        if user_input.lower() in ["exit", "quit", "back", "menu"]:
            print("\n  👋 Back to menu...")
            break

        result = run_agent(user_input, model_key=model_key)
        print(f"\n  🤖 DevAgent:\n{'─'*55}")
        print(result)
        print("─" * 55)


# ── MAIN LOOP ──────────────────────────────────────────────
while True:
    header()
    menu()
    action = input("\n  Enter action (C/M/T or 0-9): ").strip().upper()

    # ── CHAT ──────────────────────────────────────────────
    if action == "C":
        run_chat()

    # ── DATABASE SUMMARY ──────────────────────────────────
    elif action == "M":
        db.show_db_summary(current_user_id.get())

    # ── TECH STACK INFO ───────────────────────────────────
    elif action == "T":
        print(TECH_STACKS)

    # ── EXIT ──────────────────────────────────────────────
    elif action == "0":
        print("\n👋 Goodbye!\n")
        break

    # ── BUILD ─────────────────────────────────────────────
    elif action == "1":
        name  = input("\n  📁 Project name (e.g. my-react-app): ").strip()
        desc  = get_description("📝 Describe your project")
        model = pick_model(desc)          # ✅ model picked AFTER description
        task  = f"""Build a complete working project called '{name}'.

Tech stack and requirements:
{desc}

Steps:
1. create_project("{name}")
2. Write ALL files completely using write_project_file
3. install_dependencies("{name}")
4. list_project_files("{name}") to confirm
5. Report every file created with its purpose"""

        result = run_agent(task, model_key=model, project_name=name)
        print(f"\n  🤖 Result:\n{'─'*55}\n{result}\n{'─'*55}")

    # ── RUN ───────────────────────────────────────────────
    elif action == "2":
        list_projects()
        name = input("\n  📁 Project to run: ").strip()
        run_agent(
            f"Run the project '{name}' using run_project tool.",
            model_key="gemini3",
            project_name=name
        )

    # ── BUILD + RUN ───────────────────────────────────────
    elif action == "3":
        name  = input("\n  📁 Project name: ").strip()
        desc  = get_description("📝 Describe your project")
        model = pick_model(desc)          # ✅ model picked AFTER description
        task  = f"""Build AND immediately run this project called '{name}'.

Tech stack and requirements:
{desc}

Steps:
1. create_project("{name}")
2. Write ALL files completely using write_project_file
3. install_dependencies("{name}")
4. list_project_files("{name}") to verify
5. run_project("{name}") to launch it
6. Report the URL to open"""

        result = run_agent(task, model_key=model, project_name=name)
        print(f"\n  🤖 Result:\n{'─'*55}\n{result}\n{'─'*55}")

    # ── ADD FEATURE ───────────────────────────────────────
    elif action == "4":
        list_projects()
        name    = input("\n  📁 Project name: ").strip()
        feature = get_description("✨ Describe the feature to add")
        model   = pick_model(feature)
        task    = f"""Add a new feature to existing project '{name}'.

Feature to add:
{feature}

Steps:
1. list_project_files("{name}") to understand structure
2. read_project_file the relevant files
3. Make changes using write_project_file
4. Confirm with list_project_files
5. Report what changed"""

        result = run_agent(task, model_key=model, project_name=name)
        print(f"\n  🤖 Result:\n{'─'*55}\n{result}\n{'─'*55}")
        if input("\n  ▶️  Run now? (Y/N): ").strip().upper() == "Y":
            run_agent(f"Run '{name}' using run_project", "gemini3", name)

    # ── FIX BUG ───────────────────────────────────────────
    elif action == "5":
        list_projects()
        name = input("\n  📁 Project name: ").strip()
        print("\n  🐛 Paste the full error (type DONE or Enter twice when done):")
        print("  " + "─" * 44)
        error_lines = []
        empty_count = 0
        while True:
            line = input("  > ")
            if line.strip().upper() == "DONE":
                break
            if line.strip() == "":
                empty_count += 1
                if empty_count >= 2 and error_lines:
                    break
                elif error_lines:
                    error_lines.append(line)
                continue
            else:
                empty_count = 0
                error_lines.append(line)
        error = "\n".join(error_lines).strip()

        model = pick_model(error)
        task  = f"""Fix this error in project '{name}'.

ERROR:
{error}

Steps:
1. Use fix_error_in_project("{name}", error) to analyze
2. Read the broken files with read_project_file
3. Fix the root cause
4. Write corrected files with write_project_file
5. Verify fix with list_project_files
6. Explain what was wrong and what you fixed"""

        result = run_agent(task, model_key=model, project_name=name, max_retries=3)
        print(f"\n  🤖 Fix Result:\n{'─'*55}\n{result}\n{'─'*55}")
        if input("\n  ▶️  Run now? (Y/N): ").strip().upper() == "Y":
            run_agent(f"Run '{name}' using run_project", "gemini3", name)

    # ── LIST PROJECTS ─────────────────────────────────────
    elif action == "6":
        list_projects()

    # ── LIST FILES ────────────────────────────────────────
    elif action == "7":
        list_projects()
        name   = input("\n  📁 Project name: ").strip()
        result = run_agent(
            f"List all files in project '{name}' using list_project_files tool.",
            model_key="gemini3", project_name=name
        )
        print(f"\n{result}")

    # ── READ FILE ─────────────────────────────────────────
    elif action == "8":
        list_projects()
        name     = input("\n  📁 Project name: ").strip()
        filename = input("  📄 Filename (e.g. src/App.jsx): ").strip()
        result   = run_agent(
            f"Read and show full content of '{filename}' in project '{name}'.",
            model_key="gemini3", project_name=name
        )
        print(f"\n{'─'*55}\n{result}\n{'─'*55}")

    # ── DELETE ────────────────────────────────────────────
    elif action == "9":
        list_projects()
        name    = input("\n  📁 Project to delete: ").strip()
        confirm = input(f"  ⚠️  Delete '{name}'? (yes/no): ").strip().lower()
        if confirm == "yes":
            result = run_agent(
                f"Delete project '{name}' using delete_project tool.",
                model_key="gemini3", project_name=name
            )
            print(f"\n  {result}")

    else:
        print("\n  ❌ Invalid option — use C, M, T or 0-9")

    input("\n  ⏎  Press Enter to continue...")