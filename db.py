import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any
from datetime import datetime
from contextvars import ContextVar

current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")

load_dotenv()

URL = os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ ERROR: Supabase credentials missing in .env")
    supabase: Client = None
else:
    supabase: Client = create_client(URL, KEY)

def ensure_profile(user_id: str, email: str = None, full_name: str = None):
    """Ensure a profile exists in the profiles table for the given user_id."""
    if not supabase: return
    try:
        # Check if profile exists
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not res.data:
            print(f"DEBUG DB: Creating profile for user {user_id}")
            data = {"id": user_id}
            if email: data["username"] = email.split('@')[0]
            # full_name is not in profiles table according to ER, only username, avatar_url
            supabase.table("profiles").insert(data).execute()
    except Exception as e:
        print(f"DEBUG DB: Error ensuring profile: {str(e)}")

# ── Projects ────────────────────────────────────────────────
def get_user_projects(user_id: str) -> List[Dict[str, Any]]:
    if not supabase: return []
    res = supabase.table("projects").select("*").eq("user_id", user_id).execute()
    return res.data

def upsert_project(user_id: str, name: str, details: Dict[str, Any]):
    if not supabase: 
        print("DEBUG DB: Supabase not initialized, skipping upsert")
        return
    data = {
        "user_id": user_id,
        "name": name,
        "stack": details.get("stack"),
        "status": details.get("status"),
        "description": details.get("desc") or details.get("description"),
        "files": details.get("files", []),
        "built_at": details.get("built_at"),
        "last_modified": datetime.now().isoformat()
    }
    print(f"DEBUG DB: Upserting project '{name}' for user {user_id}")
    try:
        res = supabase.table("projects").upsert(data, on_conflict="user_id, name").execute()
        print(f"DEBUG DB: Upsert successful. Data: {res.data}")
    except Exception as e:
        print(f"DEBUG DB: Upsert FAILED: {str(e)}")
        raise e

def get_project(user_id: str, name: str) -> Dict[str, Any]:
    if not supabase: return {}
    res = supabase.table("projects").select("*").eq("user_id", user_id).eq("name", name).execute()
    return res.data[0] if res.data else {}

def update_project(user_id: str, name: str, data: Dict[str, Any]):
    if not supabase: return
    supabase.table("projects").update(data).eq("user_id", user_id).eq("name", name).execute()

def delete_project_memory(user_id: str, name: str):
    if not supabase: return
    supabase.table("projects").delete().eq("user_id", user_id).eq("name", name).execute()

# ── Chats & Messages ────────────────────────────────────────
def list_user_chats(user_id: str) -> List[Dict[str, Any]]:
    if not supabase: return []
    res = supabase.table("chats").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
    return res.data

def create_user_chat(user_id: str, title: str = "New Chat") -> str:
    if not supabase: return None
    res = supabase.table("chats").insert({"user_id": user_id, "title": title}).execute()
    return res.data[0]["id"] if res.data else None

def get_chat_msgs(chat_id: str) -> List[Dict[str, Any]]:
    if not supabase: return []
    res = supabase.table("messages").select("*").eq("chat_id", chat_id).order("created_at").execute()
    return res.data

def delete_user_chat(user_id: str, chat_id: str):
    if not supabase: return
    # RLS or EQ check for user safety
    supabase.table("chats").delete().eq("id", chat_id).eq("user_id", user_id).execute()

def add_message(chat_id: str, role: str, content: str, image_url: str = None):
    if not supabase: return
    data = {
        "chat_id": chat_id,
        "role": role,
        "content": content,
        "image_url": image_url
    }
    supabase.table("messages").insert(data).execute()
    # Update chat timestamp
    supabase.table("chats").update({"updated_at": datetime.now().isoformat()}).eq("id", chat_id).execute()

def save_message(user_id: str, role: str, content: str):
    """Saves a message to the MOST RECENT chat for the user."""
    if not supabase: return
    res = supabase.table("chats").select("id").eq("user_id", user_id).order("updated_at", desc=True).limit(1).execute()
    if res.data:
        add_message(res.data[0]["id"], role, content)

# ── Settings & Integrations ─────────────────────────────────
def get_user_settings(user_id: str) -> List[Dict[str, Any]]:
    if not supabase: return []
    res = supabase.table("settings").select("*").eq("user_id", user_id).execute()
    return res.data

def save_user_setting(user_id: str, service: str, api_key: str, config: Dict[str, Any] = None):
    if not supabase: return
    data = {
        "user_id": user_id,
        "service": service,
        "api_key": api_key,
        "config": config or {},
        "updated_at": datetime.now().isoformat()
    }
    supabase.table("settings").upsert(data, on_conflict="user_id, service").execute()

def get_integration(user_id: str, service: str) -> Dict[str, Any]:
    """Helper for migration: returns a single integration's key and config."""
    if not user_id or not supabase: return {}
    res = supabase.table("settings").select("*").eq("user_id", user_id).eq("service", service).execute()
    if res.data:
        s = res.data[0]
        return {
            "api_key": s.get("api_key"),
            "settings": s.get("config", {}),
            "updated_at": s.get("updated_at")
        }
    return {}

# ── Errors & Summaries ──────────────────────────────────────
def save_error(user_id: str, project_name: str, error: str, fix: str):
    # Log to projects table's metadata or a separate errors table if it existed.
    # For now, let's just print as we don't want to break if 'errors' table is missing.
    print(f"DEBUG DB: Error in {project_name}: {error[:50]}... Fix: {fix[:50]}...")

def get_similar_errors(user_id: str, error_text: str) -> List[Dict[str, Any]]:
    return [] # Placeholder

def show_db_summary(user_id: str):
    projects = get_user_projects(user_id)
    chats = list_user_chats(user_id)
    print(f"""
  🧠 Agent Database Summary
  {'─'*44}
  📂 Projects remembered : {len(projects)}
  💬 Chats history       : {len(chats)}
  {'─'*44}""")
    if projects:
        print("  📁 Known Projects:")
        for p in projects:
            print(f"     • {p['name']:<20} {p.get('stack','?'):<15} {p.get('status','?')}")
