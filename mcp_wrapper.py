from mcp.server.fastmcp import FastMCP
import requests
import time

BASE_URL = "http://127.0.0.1:8888"

mcp = FastMCP("dev-agent")


def wait_for_flask():
    for _ in range(10):
        try:
            res = requests.get(f"{BASE_URL}/mcp/tools")
            if res.status_code == 200:
                return res.json()
        except:
            time.sleep(1)
    return None


tools_data = wait_for_flask()

if not tools_data:
    print("Flask not running")
    tools_data = {"tools": []}


def make_tool(tool_name):
    def tool_func(**kwargs):
        try:
            res = requests.post(
                f"{BASE_URL}/mcp/execute",
                json={"name": tool_name, "arguments": kwargs}
            )
            return res.json()
        except Exception as e:
            return {"error": str(e)}
    return tool_func


# ✅ REGISTER TOOLS BEFORE RUN
for t in tools_data.get("tools", []):
    mcp.tool(
        name=t["name"],
        description=t.get("description", "")
    )(make_tool(t["name"]))


print("Registered tools:", [t["name"] for t in tools_data.get("tools", [])])

mcp.run()