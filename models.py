import os
import sys
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

import db
from db import current_user_id

load_dotenv()

# ── Gemini key helper ─────────────────────────────────────
def get_gemini_key():
    """Return the user's Gemini API key (Supabase settings → env var fallback)."""
    user_id = current_user_id.get()
    integration = db.get_integration(user_id, "gemini")
    if integration and integration.get("api_key"):
        return integration["api_key"]
    return os.getenv("GEMINI_API_KEY")

def get_gemini_model(model_name: str, temperature: float = 0.5, api_key: str = None):
    """
    Return a native ChatGoogleGenerativeAI instance.
    """
    from langchain_openai import ChatOpenAI
    
    if not api_key:
        api_key = get_gemini_key()

    MODEL_ALIASES = {
        "gemini-2.5-flash": "gemini-3.6-flash",
        "models/gemini-2.5-flash": "gemini-3.6-flash",
        "gemini-2.5-pro": "gemini-3.1-pro-preview",
        "models/gemini-2.5-pro": "gemini-3.1-pro-preview",
        "gemini-2.0-flash-lite": "gemini-3.1-flash-lite",
        "models/gemini-2.0-flash-lite": "gemini-3.1-flash-lite",
    }
    model_name = MODEL_ALIASES.get(model_name, model_name)
    
    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base="https://generativelanguage.googleapis.com/v1beta/openai/",
        temperature=temperature,
        max_retries=2,
    )

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

# OpenRouter-backed models (key → (openrouter model id, temperature))
MODEL_CONFIGS = {
    "gpt5":    ("openai/gpt-5.2",                0.5),
    "kimi":    ("moonshotai/kimi-k2.5",          0.3),
    "minimax": ("minimax/minimax-m2.5",           0.5),
    "gemini3": ("google/gemini-3-flash-preview",  0.5),
    "claude":  ("anthropic/claude-sonnet-4-6",    0.5),
}

# Direct Gemini models (key → (google model id, temperature))
GEMINI_MODEL_CONFIGS = {
    "gemini-flash":      ("gemini-2.5-flash",                  0.7),
    "gemini-pro":        ("gemini-2.5-pro",                    0.7),
    "gemini-flash-lite": ("gemini-2.0-flash-lite",             0.3),
    "gemini-2-5-pro":    ("gemini-2.5-pro",                    0.5),
}

_MODEL_INSTANCES = {}

class LazyModels:
    def __getitem__(self, key):
        from db import current_user_id
        user_id = current_user_id.get()

        # ── Direct Gemini models ──────────────────────────────
        if key in GEMINI_MODEL_CONFIGS:
            gemini_key = get_gemini_key()
            cache_key = (user_id, key, gemini_key)
            if cache_key not in _MODEL_INSTANCES:
                config = GEMINI_MODEL_CONFIGS[key]
                if gemini_key:
                    # Use Google's API directly
                    _MODEL_INSTANCES[cache_key] = get_gemini_model(config[0], config[1], api_key=gemini_key)
                else:
                    # Fallback: route through OpenRouter (models available there too)
                    or_key = get_openrouter_key()
                    or_model = f"google/{config[0]}"
                    _MODEL_INSTANCES[cache_key] = get_model(or_model, config[1], api_key=or_key)
            return _MODEL_INSTANCES[cache_key]

        # ── OpenRouter-backed models ──────────────────────────
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
    "gpt5":             "Complex reasoning, planning, architecture",
    "kimi":             "Code writing, debugging, all tech stacks",
    "minimax":          "Workflows, documentation, step-by-step",
    "gemini3":          "Fast summarization, quick analysis (OpenRouter)",
    "claude":           "Orchestration, logic, long context",
    # Direct Gemini
    "gemini-flash":     "Ultra-fast Gemini 2.5 — best for quick tasks",
    "gemini-pro":       "Balanced reasoning & coding",
    "gemini-flash-lite":"Super cost-effective 2.0 lite",
    "gemini-2-5-pro":   "Most capable Gemini 2.5 — advanced reasoning",
}

ICONS = {
    "gpt5":             "🔵 GPT-5.2",
    "kimi":             "🟠 Kimi K2.5",
    "minimax":          "🟣 MiniMax M2.5",
    "gemini3":          "🟢 Gemini 3 Flash",
    "claude":           "🤖 Claude Sonnet",
    # Direct Gemini
    "gemini-flash":     "⚡ Gemini 2.5 Flash",
    "gemini-pro":       "🌐 Gemini 1.5 Pro",
    "gemini-flash-lite":"💨 Gemini 2.0 Flash Lite",
    "gemini-2-5-pro":   "✨ Gemini 2.5 Pro",
}

MODEL_DISPLAY = {
    "openai/gpt-5.2":                    "🔵 GPT-5.2",
    "moonshotai/kimi-k2.5":              "🟠 Kimi K2.5",
    "minimax/minimax-m2.5":              "🟣 MiniMax M2.5",
    "google/gemini-3-flash-preview":     "🟢 Gemini 3 Flash",
    "anthropic/claude-sonnet-4-6":       "🤖 Claude Sonnet",
    # Direct Gemini
    "gemini-2.5-flash":                  "⚡ Gemini 2.5 Flash",
    "gemini-1.5-pro":                    "🌐 Gemini 1.5 Pro",
    "gemini-2.0-flash-lite":             "💨 Gemini 2.0 Flash Lite",
    "gemini-2.5-pro":                    "✨ Gemini 2.5 Pro",
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
