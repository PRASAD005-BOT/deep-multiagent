import json
import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from agents.deep_agent import CUSTOM_TOOLS
from memory import save_integration, get_all_integrations

app = Flask(__name__)
CORS(app)


@app.route("/mcp/tools", methods=["GET"])
def list_tools():
    """List all available tools in MCP format."""
    mcp_tools = []
    for tool in CUSTOM_TOOLS:
        mcp_tools.append({
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.args_schema.schema() if hasattr(tool, "args_schema") else {}
        })
    return jsonify({"tools": mcp_tools})


@app.route("/mcp/execute", methods=["POST"])
def execute_tool():
    """Execute a tool via MCP."""
    data = request.json
    tool_name = data.get("name")
    arguments = data.get("arguments", {})

    # Find the tool
    tool = next((t for t in CUSTOM_TOOLS if t.name == tool_name), None)
    if not tool:
        return jsonify({"error": f"Tool '{tool_name}' not found"}), 404

    try:
        print(f"MCP Executing: {tool_name} with {arguments}")

        # ✅ FIX: handle both tool types
        if isinstance(arguments, dict) and len(arguments) == 1:
            # Single-input tool (like prompt: str)
            result = tool.run(list(arguments.values())[0])
        else:
            # Structured tool
            result = tool.invoke(arguments)

        return jsonify({
            "content": [
                {"type": "text", "text": str(result)}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/integrations", methods=["GET"])
def list_integrations():
    return jsonify(get_all_integrations())


@app.route("/api/integrations", methods=["POST"])
def update_integration():
    data = request.json
    service = data.get("service")
    api_key = data.get("api_key")
    settings = data.get("settings", {})

    if not service or not api_key:
        return jsonify({"error": "service and api_key required"}), 400

    save_integration(service, api_key, settings)
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("MCP_PORT", 8889))
    print(f"\nDevAgent MCP Server starting on port {port}")
    print(f"Tools endpoint: http://0.0.0.0:{port}/mcp/tools")
    app.run(host="0.0.0.0", port=port, debug=False)