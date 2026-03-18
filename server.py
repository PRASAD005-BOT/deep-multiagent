import sys
import os
import json
import queue
import threading
import datetime
from pathlib import Path
from flask import Flask, Response, request, jsonify
from flask_cors import CORS

sys.path.insert(0, str(Path(__file__).parent))

from agents.deep_agent import build_agent, _verify_files, get_workspace
import db
from db import current_user_id
from models import MODELS, ICONS, MODEL_SKILLS, smart_route
from functools import wraps
# from agents.deep_agent import run_project as run_project_agent # This function doesn't exist
import io
import zipfile
from langchain_core.callbacks import BaseCallbackHandler

app = Flask(__name__)
CORS(app)

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        token = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.args.get("token")
        
        if not token:
            return jsonify({"error": "unauthorized"}), 401
        try:
            # We verify the token by fetching the user from Supabase
            user_res = db.supabase.auth.get_user(token)
            if not user_res.user:
                print(f"DEBUG AUTH: Invalid token for {token[:10]}...")
                return jsonify({"error": "invalid token"}), 401
            request.user = user_res.user
            db.current_user_id.set(request.user.id)
            print(f"DEBUG AUTH: User authorized: {request.user.id}")
            # Ensure profile exists so foreign keys don't break
            db.ensure_profile(request.user.id, email=request.user.email)
        except Exception as e:
            print(f"DEBUG AUTH: Exception during verification: {str(e)}")
            return jsonify({"error": str(e)}), 401
            
        return f(*args, **kwargs)
    return decorated

# ── SSE event queue per request ───────────────────────────
_queues: dict[str, queue.Queue] = {}

def count_project_files(path: Path) -> int:
    """Efficiently count files in a project skipping node_modules."""
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

def get_relative_files(path: Path) -> list:
    """Get list of relative file paths skipping node_modules."""
    file_list = []
    try:
        for root, dirs, files in os.walk(path):
            if "node_modules" in dirs:
                dirs.remove("node_modules")
            if ".git" in dirs:
                dirs.remove(".git")
            for f in files:
                rel = Path(root).relative_to(path) / f
                file_list.append(str(rel).replace("\\", "/"))
    except Exception:
        pass
    return file_list

class StreamingCallback(BaseCallbackHandler):
    def __init__(self, q: queue.Queue):
        self.q = q

    def _emit(self, event: str, data: dict):
        self.q.put({"event": event, "data": data})

    def on_llm_start(self, serialized, prompts, **kwargs):
        from models import MODEL_DISPLAY
        model = None
        if serialized:
            kw    = serialized.get("kwargs", {})
            model = kw.get("model_name") or kw.get("model")
        inv   = kwargs.get("invocation_params", {})
        model = model or inv.get("model") or "AI"
        self._emit("thinking", {"model": MODEL_DISPLAY.get(model, model)})

    def on_llm_end(self, response, **kwargs):
        try:
            text = response.generations[0][0].text
            if text and len(text) > 10:
                self._emit("thought", {"text": text.strip()[:200]})
        except Exception:
            pass

    def on_tool_start(self, serialized, input_str, **kwargs):
        import re
        if not serialized:
            return
        tool_name = serialized.get("name", "tool")
        raw       = str(input_str)

        ICONS_MAP = {
            "create_project":       ("folder",  "Creating folder"),
            "write_project_file":   ("file",    "Writing file"),
            "read_project_file":    ("eye",     "Reading file"),
            "list_project_files":   ("list",    "Listing files"),
            "list_all_projects":    ("grid",    "All projects"),
            "run_shell_command":    ("terminal","Running command"),
            "run_project":          ("play",    "Launching"),
            "install_dependencies": ("package", "Installing packages"),
            "fix_error_in_project": ("wrench",  "Fixing error"),
            "delete_project":       ("trash",   "Deleting project"),
            "write_file":           ("file",    "Writing file"),
            "read_file":            ("eye",     "Reading file"),
            "execute":              ("terminal","Running command"),
            "write_todos":          ("check",   "Planning"),
            "task":                 ("check",   "Planning"),
            "python_sandbox":       ("lab",     "Sandbox Exec"),
        }

        icon, label = ICONS_MAP.get(tool_name, ("tool", tool_name))

        if tool_name == "write_project_file":
            m       = re.search(r"'filename'\s*:\s*'([^']+)'", raw)
            preview = m.group(1) if m else "file"
        else:
            m       = re.search(r"'(?:project_name|path|command)'\s*:\s*'([^']+)'", raw)
            preview = m.group(1) if m else raw[:50]

        self._emit("tool_start", {
            "tool": tool_name, "icon": icon,
            "label": label, "preview": preview
        })

    def on_tool_end(self, output, **kwargs):
        import re
        if not output:
            return
        raw   = str(output)
        match = re.search(r"content='([^']*)'", raw)
        raw   = match.group(1) if match else raw
        lines = [l.strip() for l in raw.strip().split("\n") if l.strip()]
        self._emit("tool_end", {"output": lines[:2]})

    def on_tool_error(self, error, **kwargs):
        self._emit("tool_error", {"error": str(error)[:150]})

    def on_chain_start(self, serialized, inputs, **kwargs):
        pass


def run_agent_streaming(task: str, model_key: str,
                        project_name: str, q: queue.Queue, user_id: str, image_data: str = None, chat_id: str = None):
    current_user_id.set(user_id)
    import time
    import datetime

    q.put({"event": "start", "data": {"task": task[:100]}})

    try:
        if chat_id:
            db.add_message(chat_id, "user", task, image_url=image_data)
    except Exception:
        pass

    try:
        agent, used_key = build_agent(model_key=model_key, task=task, project_name=project_name)
        cb = StreamingCallback(q)

        # Build context from session history if chat_id provided
        history = []
        if chat_id:
            raw_msgs = db.get_chat_msgs(chat_id)
            # Take last 10 for context
            for m in raw_msgs[:-1]: 
                role = "user" if m["role"] == "user" else "assistant"
                content = m.get("content", "")
                history.append({"role": role, "content": content})

        # Prepare current message content
        current_content = [{"type": "text", "text": task}]
        if image_data:
            if not image_data.startswith("data:"):
                image_data = f"data:image/png;base64,{image_data}"
            current_content.append({"type": "image_url", "image_url": {"url": image_data}})

        full_msgs = history + [{"role": "user", "content": current_content if image_data else task}]

        result = agent.invoke(
            {"messages": full_msgs},
            config={"callbacks": [cb], "recursion_limit": 200},
        )

        messages = result.get("messages", [])
        final    = ""
        for msg in reversed(messages):
            content = getattr(msg, "content", "")
            if content and isinstance(content, str) and len(content) > 10:
                final = content
                break

        try:
            if chat_id:
                db.add_message(chat_id, "assistant", final or "Done")
        except Exception:
            pass

        try:
            if project_name:
                folder = WORKSPACE / project_name
                files  = get_relative_files(folder) if folder.exists() else []

                stack = "unknown"
                if any(f.endswith((".jsx", ".tsx")) for f in files): stack = "react"
                elif any(f.endswith(".vue") for f in files):         stack = "vue"
                elif "app.py" in files:                              stack = "python"
                elif "index.js" in files:                            stack = "nodejs"
                elif "index.html" in files:                          stack = "html"

                db.upsert_project(user_id, project_name, {
                    "desc": task[:100],
                    "stack": stack,
                    "files": files,
                    "model_used": used_key,
                    "built_at": str(datetime.datetime.now().date()),
                    "status": "built",
                })
        except Exception:
            pass

        q.put({"event": "done", "data": {"result": final or "Done"}})

    except Exception as e:
        q.put({"event": "error", "data": {"error": str(e)[:300]}})

    q.put({"event": "end", "data": {}})


# ═══════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════

@app.route("/api/run", methods=["POST"])
@auth_required
def run():
    body         = request.json or {}
    task         = body.get("task", "")
    model_key    = body.get("model", "auto")
    project_name = body.get("project_name", "")
    stream_id    = body.get("stream_id", "default")
    image_data   = body.get("image")  # base64 image
    chat_id      = body.get("chat_id")
    user_id      = request.user.id

    if not task and not image_data:
        return jsonify({"error": "task or image required"}), 400

    q = queue.Queue()
    _queues[stream_id] = q

    thread = threading.Thread(
        target=run_agent_streaming,
        args=(task, model_key, project_name, q, user_id, image_data, chat_id),
        daemon=True
    )
    thread.start()
    return jsonify({"status": "started", "stream_id": stream_id})


@app.route("/api/stream/<stream_id>")
def stream(stream_id):
    def generate():
        q = _queues.get(stream_id)
        if not q:
            yield f"data: {json.dumps({'event':'error','data':{'error':'stream not found'}})}\n\n"
            return
        while True:
            try:
                msg = q.get(timeout=60)
                yield f"data: {json.dumps(msg)}\n\n"
                if msg.get("event") == "end":
                    break
            except queue.Empty:
                yield f"data: {json.dumps({'event':'ping'})}\n\n"
        _queues.pop(stream_id, None)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        }
    )



@app.route("/api/projects/upload", methods=["POST"])
@auth_required
def upload_project_endpoint():
    user_id = request.user.id
    workspace = get_workspace()
    try:
        files = request.files.getlist("files")
        paths = request.form.getlist("paths")
        print(f"DEBUG UPLOAD: Received {len(files)} files for upload")
        
        if not files:
            return jsonify({"error": "No files uploaded"}), 400
            
        # First file's path gives the project name
        project_name = paths[0].split('/')[0]
        project_dir = workspace / project_name
        print(f"DEBUG UPLOAD: Project name detected as '{project_name}'")
        
        if not project_dir.exists():
            project_dir.mkdir(parents=True, exist_ok=True)
            
        for file, rel_path in zip(files, paths):
            target_path = workspace / rel_path
            target_path.parent.mkdir(parents=True, exist_ok=True)
            file.save(str(target_path))
            
        # Register in DB
        print(f"DEBUG UPLOAD: Registering project '{project_name}' in DB for user {user_id}")
        db.upsert_project(user_id, project_name, {
            "stack": "uploaded",
            "desc": "Manually uploaded project",
            "files": paths
        })
            
        return jsonify({"success": True, "project": project_name})
    except Exception as e:
        print(f"DEBUG UPLOAD Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects")
@auth_required
def projects():
    try:
        user_id   = request.user.id
        print(f"DEBUG PROJECTS: Fetching projects for user {user_id}")
        mem       = {p["name"]: p for p in db.get_user_projects(user_id)}
        workspace = get_workspace()
        print(f"DEBUG PROJECTS: Workspace path is {workspace}")
        result    = []
        
        if not workspace.exists():
            workspace.mkdir(parents=True, exist_ok=True)

        for d in sorted(workspace.iterdir()):
            if not d.is_dir():
                continue
            
            file_count = count_project_files(d)
            print(f"DEBUG: Project {d.name} has {file_count} files")
            
            mem_data = mem.get(d.name, {})
            result.append({
                "name":      d.name,
                "files":     file_count,
                "stack":     mem_data.get("stack", "unknown"),
                "status":    mem_data.get("status", "built"),
                "built_at":  mem_data.get("built_at", ""),
                "desc":      (mem_data.get("desc") or mem_data.get("description") or "")[:80],
            })

        print(f"DEBUG PROJECTS: Returning {len(result)} projects")
        return jsonify(result)
    except Exception as e:
        print(f"DEBUG PROJECTS Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500




@app.route("/api/projects/<name>/files")
@auth_required
def project_files(name):
    user_id = request.user.id
    folder = get_workspace() / name
    if not folder.exists():
        return jsonify([])
    files = []
    for f in sorted(folder.rglob("*")):
        # Exclude hidden and internal dirs
        rel_str = str(f.relative_to(folder))
        bad_dirs = [".git", "node_modules", "__pycache__", ".pytest_cache", "venv", ".next", "dist", "build"]
        if any(b in rel_str for b in bad_dirs):
            continue
            
        if f.is_file():
            files.append({
                "path": rel_str.replace("\\", "/"),
                "size": f.stat().st_size,
            })
    return jsonify(files)


@app.route("/api/projects/<name>/file")
@auth_required
def read_file(name):
    user_id = request.user.id
    filename = request.args.get("path", "")
    filepath = get_workspace() / name / filename
    if not filepath.exists():
        return jsonify({"error": "not found"}), 404
    try:
        return jsonify({"content": filepath.read_text(encoding="utf-8")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<name>/file", methods=["POST"])
@auth_required
def write_file_endpoint(name):
    user_id = request.user.id
    body = request.json or {}
    filename = body.get("path", "")
    content = body.get("content", "")
    if not filename:
        return jsonify({"error": "path required"}), 400
    
    filepath = get_workspace() / name / filename
    if not filepath.parent.exists():
        filepath.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        filepath.write_text(content, encoding="utf-8")
        return jsonify({"status": "saved", "size": filepath.stat().st_size})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<name>/file", methods=["DELETE"])
@auth_required
def delete_file_endpoint(name):
    user_id = request.user.id
    filename = request.args.get("path", "")
    if not filename:
        body = request.json or {}
        filename = body.get("path", "")
        
    if not filename:
        return jsonify({"error": "path required"}), 400
    
    filepath = get_workspace() / name / filename
    if not filepath.exists():
        return jsonify({"error": "not found"}), 404
        
    try:
        # Security check: ensure path stays within project folder
        project_dir = (get_workspace() / name).resolve()
        if not str(filepath.resolve()).startswith(str(project_dir)):
            return jsonify({"error": "invalid path"}), 403
            
        if filepath.is_dir():
            import shutil
            shutil.rmtree(filepath)
        else:
            filepath.unlink()
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<name>/run", methods=["POST"])
@auth_required
def run_project_endpoint(name):
    user_id = request.user.id
    current_user_id.set(user_id)
    try:
        from agents.deep_agent import run_agent
        # Since run_project doesn't exist, we use the general run_agent
        # and ask it to run the project.
        result = run_agent(f"Launch and run the project {name}", project_name=name)
        
        # Extract URL
        import re
        url_match = re.search(r'https?://(?:localhost|0\.0\.0\.0|127\.0\.0\.1):\d+(?:/[a-zA-Z0-9_./-]+)?', result)
        url = url_match.group(0) if url_match else None
        
        # If running on Render/Production, proxy to Workspace Static Serving if it's a localhost link
        if url and ("localhost" in url or "0.0.0.0" in url or "127.0.0.1" in url):
             # Try to serve directly via /api/workspace for HTML/Static apps
             # Note: This is an optimistic fallback for Render where only port 10000 is open
             # We assume if it's local, we can just point the iframe to the static server
             url = f"/api/workspace/{user_id}/{name}/index.html"
            
        return jsonify({"status": "launched", "result": result, "url": url})
    except Exception as e:
        print(f"DEBUG RUN Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<name>/download")
@auth_required
def download_project_zip(name):
    user_id = request.user.id
    folder = get_workspace() / name
    if not folder.exists():
        return jsonify({"error": "not found"}), 404
    
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in folder.rglob("*"):
            if "node_modules" in str(f) or ".git" in str(f) or "__pycache__" in str(f):
                continue
            if f.is_file():
                zf.write(f, f.relative_to(folder))
    
    memory_file.seek(0)
    return Response(
        memory_file.read(),
        mimetype="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={name}.zip"
        }
    )


@app.route("/api/projects/<name>", methods=["DELETE"])
@auth_required
def delete_project(name):
    user_id = request.user.id
    import shutil
    import os
    folder = get_workspace() / name
    
    def on_rm_error(func, path, exc_info):
        # Handle read-only files or other RM errors
        try:
            os.chmod(path, 0o777)
            func(path)
        except Exception:
            pass

    try:
        if folder.exists():
            shutil.rmtree(folder, onerror=on_rm_error)
        
        try:
            db.delete_user_project(user_id, name)
        except Exception:
            pass
            
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/memory")
@auth_required
def memory_stats():
    user_id = request.user.id
    try:
        projects = db.get_user_projects(user_id)
        chats = db.list_user_chats(user_id)
        return jsonify({
            "stats": {
                "total_projects": len(projects),
                "total_chats":    len(chats),
                "total_builds":   len(projects),
            },
            "projects": projects,
            "history":  chats,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/models")
def models():
    return jsonify([
        {"key": "auto",    "label": "AUTO",       "desc": "Smart route",          "color": "#888"},
        {"key": "kimi",    "label": "Kimi K2.5",  "desc": "Code writing",         "color": "#E8831A"},
        {"key": "gpt5",    "label": "GPT-5.2",    "desc": "Planning",             "color": "#10A37F"},
        {"key": "gemini3", "label": "Gemini 3",   "desc": "Fast & lightweight",   "color": "#4285F4"},
        {"key": "claude",  "label": "Claude",     "desc": "Reasoning & chat",     "color": "#CC785C"},
        {"key": "minimax", "label": "MiniMax",    "desc": "Workflows & docs",     "color": "#9B59B6"},
    ])


@app.route("/api/chats")
@auth_required
def list_chats():
    user_id = request.user.id
    chats = db.list_user_chats(user_id)
    
    # Lazy Migration: if Supabase is empty, check local memory.json
    if not chats:
        try:
            from pathlib import Path
            memory_path = Path("workspace/data/agent_memory.json")
            if memory_path.exists():
                print(f"DEBUG MIGRATION: Migrating local data for {user_id}")
                with open(memory_path, 'r') as f:
                    memory = json.load(f)
                
                # Migrate Conversations
                convs = memory.get("conversations", {})
                for cid, conv in convs.items():
                    title = conv.get("title", "Legacy Chat")
                    new_cid = db.create_user_chat(user_id, title)
                    if new_cid:
                        for msg in conv.get("messages", []):
                            db.add_message(new_cid, msg["role"], msg["content"], msg.get("image"))
                
                # Migrate Preferences to Settings
                prefs = memory.get("preferences", {})
                for service, key in prefs.items():
                    # If it looks like an API key
                    if isinstance(key, str) and len(key) > 10:
                        db.save_user_setting(user_id, service, key)
                
                # Re-fetch chats after migration
                chats = db.list_user_chats(user_id)
        except Exception as e:
            print(f"DEBUG MIGRATION: Failed: {str(e)}")
            
    return jsonify(chats)

@app.route("/api/chats", methods=["POST"])
@auth_required
def new_chat():
    user_id = request.user.id
    title = request.json.get("title", "New Chat")
    cid = db.create_user_chat(user_id, title)
    return jsonify({"id": cid, "title": title})

@app.route("/api/chats/<cid>", methods=["GET"])
@auth_required
def get_chat(cid):
    msgs = db.get_chat_msgs(cid)
    return jsonify(msgs)

@app.route("/api/chats/<cid>", methods=["DELETE"])
@auth_required
def remove_chat(cid):
    user_id = request.user.id
    db.delete_user_chat(user_id, cid)
    return jsonify({"status": "deleted"})

@app.route("/api/integrations", methods=["GET"])
@auth_required
def list_integrations():
    user_id = request.user.id
    settings = db.get_user_settings(user_id)
    # Convert list to dict mapping service -> data
    return jsonify({s["service"]: s for s in settings})


@app.route("/api/integrations", methods=["POST"])
@auth_required
def update_integration():
    user_id = request.user.id
    data    = request.json
    service = data.get("service")
    key     = data.get("api_key")
    if not service or not key:
        return jsonify({"error": "service and key required"}), 400
    db.save_user_setting(user_id, service, key)
    return jsonify({"status": "ok"})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/profile/upload", methods=["POST"])
@auth_required
def upload_avatar():
    user_id = request.user.id
    print(f"DEBUG PROFILE: Upload starting for user {user_id}")
    try:
        file = request.files.get("avatar")
        if not file:
            print("DEBUG PROFILE: No file in request")
            return jsonify({"error": "no file"}), 400
            
        # Store in workspace/profiles/<user_id>/avatar.png
        # Use absolute path for reliability
        avatar_dir = Path("workspace").resolve() / "profiles" / user_id
        avatar_dir.mkdir(parents=True, exist_ok=True)
        ext = file.filename.split(".")[-1]
        filename = f"avatar.{ext}"
        filepath = avatar_dir / filename
        file.save(str(filepath))
        print(f"DEBUG PROFILE: File saved to {filepath}")
        
        # URL for frontend
        url = f"/api/profile/avatar/{user_id}/{filename}"
        
        # Update DB
        print(f"DEBUG PROFILE: Updating DB with url {url}")
        db.supabase.table("profiles").update({"avatar_url": url}).eq("id", user_id).execute()
        
        return jsonify({"success": True, "url": url})
    except Exception as e:
        print(f"DEBUG PROFILE Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/profile/avatar/<uid>/<filename>")
def get_avatar(uid, filename):
    try:
        from flask import send_from_directory
        avatar_dir = Path("workspace").resolve() / "profiles" / uid
        print(f"DEBUG PROFILE: Serving avatar from {avatar_dir}/{filename}")
        return send_from_directory(str(avatar_dir), filename)
    except Exception as e:
        print(f"DEBUG PROFILE: Error serving avatar: {str(e)}")
        return "Not found", 404

@app.route("/api/workspace/<uid>/<pname>/<path:filename>")
def serve_workspace_file(uid, pname, filename):
    try:
        from flask import send_from_directory
        # Security: Resolve absolute paths to prevent traversal
        workspace_dir = get_workspace().parent # This is c:\...\workspace
        project_dir = (workspace_dir / uid / pname).resolve()
        
        if not project_dir.exists():
            return "Project not found", 404
            
        return send_from_directory(str(project_dir), filename)
    except Exception as e:
        return str(e), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))

    print("\n  DevAgent Backend Server")
    print(f"  Running on port {port}\n")

    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
