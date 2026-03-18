import sys
import os
import flask
import importlib.util

print("--- DEEP ENVIRONMENT AUDIT ---")
print(f"CWD: {os.getcwd()}")
print(f"Python: {sys.version}")
print(f"Path: {sys.path}")
print(f"Env: {os.environ.get('PYTHONPATH', 'NOT SET')}")

# Check flask
spec = importlib.util.find_spec("flask")
if spec:
    print(f"Flask Spec: {spec}")
    print(f"Flask Origin: {spec.origin}")
    print(f"Flask Submodule Search Locations: {spec.submodule_search_locations}")
    
    try:
        from flask import Flask
        print("✅ SUCCESS: Flask imported correctly inside diagnostic script.")
    except ImportError as e:
        print(f"❌ FAIL: Flask import failed: {e}")
        print(f"Flask Directory Contents: {os.listdir(os.path.dirname(flask.__file__))}")
else:
    print("❌ FAIL: Flask spec NOT FOUND.")

print("--- END AUDIT ---")
