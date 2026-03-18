import os
import sys
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

import db
from db import current_user_id

load_dotenv()

def get_openrouter_key():
    # Priority 1: Integration Settings (Supabase)
    user_id = current_user_id.get()
    integration = db.get_integration(user_id, "openrouter")
    if integration and integration.get("api_key"):
        return integration["api_key"]
    # Priority 2: Environment Variable
    return os.getenv("OPENROUTER_API_KEY")

BASE_URL = "https://openrouter.ai/api/v1"

def get_model(model_name: str, temperature: float = 0.5, api_key: str = None):
    if not api_key:
        api_key = get_openrouter_key()
    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base=BASE_URL,
        temperature=temperature,
    )

MODEL_CONFIGS = {
    "gpt5":    ("openai/gpt-5.2",                0.5),
    "kimi":    ("moonshotai/kimi-k2.5",          0.3),
    "minimax": ("minimax/minimax-m2.5",           0.5),
    "gemini3": ("google/gemini-3-flash-preview",  0.5),
    "claude":  ("anthropic/claude-sonnet-4-6",    0.5),
}

_MODEL_INSTANCES = {}

class LazyModels:
    def __getitem__(self, key):
        from db import current_user_id
        user_id = current_user_id.get()
        api_key = get_openrouter_key()
        cache_key = (user_id, key, api_key)
        
        if cache_key not in _MODEL_INSTANCES:
            config = MODEL_CONFIGS.get(key)
            if not config:
                raise KeyError(f"Model key '{key}' not found.")
            _MODEL_INSTANCES[cache_key] = get_model(config[0], config[1], api_key=api_key)
        return _MODEL_INSTANCES[cache_key]

MODELS = LazyModels()

MODEL_SKILLS = {
    "gpt5":    "Complex reasoning, planning, architecture",
    "kimi":    "Code writing, debugging, all tech stacks",
    "minimax": "Workflows, documentation, step-by-step",
    "gemini3": "Fast summarization, quick analysis",
    "claude":  "Orchestration, logic, long context",
}

ICONS = {
    "gpt5":    "🔵 GPT-5.2",
    "kimi":    "🟠 Kimi K2.5",
    "minimax": "🟣 MiniMax M2.5",
    "gemini3": "🟢 Gemini 3 Flash",
    "claude":  "🤖 Claude Sonnet",
}

MODEL_DISPLAY = {
    "openai/gpt-5.2":                "🔵 GPT-5.2",
    "moonshotai/kimi-k2.5":          "🟠 Kimi K2.5",
    "minimax/minimax-m2.5":           "🟣 MiniMax M2.5",
    "google/gemini-3-flash-preview":  "🟢 Gemini 3 Flash",
    "anthropic/claude-sonnet-4-6":    "🤖 Claude Sonnet",
}

# ── Tech stack routing ────────────────────────────────────
RULES = {
    # Code tasks → Kimi
    "react":      "kimi",   "nextjs":    "kimi",
    "vue":        "kimi",   "angular":   "kimi",
    "node":       "kimi",   "express":   "kimi",
    "fastapi":    "kimi",   "flask":     "kimi",
    "django":     "kimi",   "html":      "kimi",
    "tailwind":   "kimi",   "typescript":"kimi",
    "python":     "kimi",   "build":     "kimi",
    "create":     "kimi",   "code":      "kimi",
    "fix":        "kimi",   "debug":     "kimi",
    "error":      "kimi",   "bug":       "kimi",
    # Planning → GPT-5
    "plan":       "gpt5",   "architect": "gpt5",
    "design":     "gpt5",   "structure": "gpt5",
    # Fast ops → Gemini
    "list":       "gemini3","show":      "gemini3",
    "summarize":  "gemini3","summary":   "gemini3",
    # Chat → Claude
    "explain":    "claude", "how":       "claude",
    "what":       "claude", "why":       "claude",
}

def smart_route(description: str) -> str:
    desc = description.lower()
    for keyword, model_key in RULES.items():
        if keyword in desc:
            print(f"  ⚡ Auto-routed → {ICONS[model_key]} (free routing)")
            return model_key
    print(f"  ⚡ Default → {ICONS['kimi']}")
    return "kimi"