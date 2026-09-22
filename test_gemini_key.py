"""
Gemini API Key Tester
======================
Tests your Google Gemini API key using the OpenAI-compatible endpoint.
Run:  python test_gemini_key.py
"""

import os
import sys
import requests
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ── PASTE YOUR KEY HERE OR SET GEMINI_API_KEY ─────────────
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDgbCiJnNVjMXJUAAfMAFh_RDEYirYrU-c")
# ─────────────────────────────────────────────────────────

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"

MODELS_TO_TEST = [
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
]

def test_key(api_key: str):
    print("\n" + "═" * 55)
    print("   🔑  Gemini API Key Tester")
    print("═" * 55)
    print(f"   Key  : {api_key[:8]}...{api_key[-4:]}")
    print(f"   Endpoint: {BASE_URL}")
    print("═" * 55 + "\n")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # ── 1. List available models ──────────────────────────
    print("📋 Step 1 — Fetching available models...")
    try:
        r = requests.get(f"{BASE_URL}/models", headers=headers, timeout=10)
        if r.status_code == 200:
            models = r.json().get("data", [])
            gemini_models = [m["id"] for m in models if "gemini" in m.get("id", "")]
            print(f"   ✅ Found {len(gemini_models)} Gemini models")
            for m in gemini_models[:8]:
                print(f"      • {m}")
        elif r.status_code == 401:
            print("   ❌ INVALID API KEY — 401 Unauthorized")
            return False
        else:
            print(f"   ⚠️  Could not list models (status {r.status_code})")
    except Exception as e:
        print(f"   ⚠️  Models list error: {e}")

    print()

    # ── 2. Test chat completion ───────────────────────────
    print("💬 Step 2 — Testing chat completion...")
    success = False
    for model in MODELS_TO_TEST:
        print(f"   Trying {model}...", end=" ")
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with just: HELLO"}],
            "max_tokens": 20,
        }
        try:
            r = requests.post(
                f"{BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=15,
            )
            data = r.json()

            if r.status_code == 200:
                reply = data["choices"][0]["message"]["content"]
                print(f"✅  Reply: '{reply.strip()}'")
                success = True
                break
            elif r.status_code == 401:
                print("❌ INVALID KEY")
                return False
            elif r.status_code == 429:
                retry = ""
                try:
                    retry = data[0]["error"].get("details", {}).get("retryDelay", "")
                except Exception:
                    pass
                print(f"⏳ Rate limited (429) — retry in {retry or '~2s'}")
            elif r.status_code == 400:
                print(f"⚠️  Bad request: {data}")
            else:
                print(f"⚠️  HTTP {r.status_code}: {str(data)[:80]}")
        except Exception as e:
            print(f"❌ Error: {e}")

    print()

    # ── 3. Result ─────────────────────────────────────────
    print("═" * 55)
    if success:
        print("   ✅  API KEY IS VALID — Gemini is working!")
    else:
        print("   ⚠️  Key seems valid but got rate-limited or no response.")
        print("       Wait a few seconds and try again.")
    print("═" * 55 + "\n")
    return success


if __name__ == "__main__":
    test_key(API_KEY)
