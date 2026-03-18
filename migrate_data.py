import json
import os
from datetime import datetime
from pathlib import Path
import db

MEMORY_FILE = Path("workspace/data/agent_memory.json")
USER_ID = "31e921b0-e70b-4ba5-a852-67c5fb212c48"

def migrate():
    if not MEMORY_FILE.exists():
        print("No local memory file found.")
        return

    print(f"Migrating data from {MEMORY_FILE} for user {USER_ID}...")
    
    with open(MEMORY_FILE, 'r') as f:
        memory = json.load(f)

    # 1. Migrate Projects
    projects = memory.get("projects", {})
    for name, p in projects.items():
        print(f" Migrating project: {name}")
        db.upsert_project(USER_ID, name, p.get("stack", "unknown"), p.get("desc", ""))

    # 2. Migrate Conversations
    conversations = memory.get("conversations", {})
    for cid, conv in conversations.items():
        title = conv.get("title", "Legacy Chat")
        print(f" Migrating chat: {title}")
        
        # Create chat in Supabase
        new_cid = db.create_user_chat(USER_ID, title)
        if not new_cid:
            print(f"  Failed to create chat {title}")
            continue
            
        # Add messages
        for msg in conv.get("messages", []):
            db.add_message(new_cid, msg["role"], msg["content"], msg.get("image"))
            
    # 3. Migrate Settings/Integrations (if any in preferences)
    # The current memory.json preferences: {}
    # But let's check if the user had anything in 'integrations' (not in this version of memory.json though)
    
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
