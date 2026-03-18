#!/bin/bash
# Start the MCP server in the background
python mcp_server.py &

# Start the main UI server in the foreground
python server.py
