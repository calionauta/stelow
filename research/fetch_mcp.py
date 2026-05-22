#!/usr/bin/env python3
"""Fetch and analyze MCP (Model Context Protocol) skill patterns."""

import subprocess
import json
import re

def fetch(url, filename):
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '20', url],
            capture_output=True, text=True, timeout=25
        )
        if len(result.stdout) > 1000:
            with open(f'research/{filename}', 'w') as f:
                f.write(result.stdout)
            return len(result.stdout)
        return f"Too small: {len(result.stdout)}"
    except Exception as e:
        return f"Error: {e}"

print("=== Fetching MCP Specification ===")

# MCP Specification
size = fetch("https://modelcontextprotocol.io/specification", "mcp_spec.html")
print(f"MCP Spec: {size}")

# MCP Server Templates
size = fetch("https://github.com/modelcontextprotocol/servers", "mcp_servers.html")
print(f"MCP Servers: {size}")

# MCP Python SDK
size = fetch("https://github.com/modelcontextprotocol/python-sdk", "mcp_python_sdk.html")
print(f"MCP Python SDK: {size}")

# Fetch GitHub trending repos related to AI skills
print("\n=== Fetching GitHub Trending ===")
size = fetch("https://api.github.com/search/repositories?q=AI+agent+skills+in:readme&sort=stars&order=desc", "github_trending.json")
print(f"GitHub trending: {size}")

print("\n=== Done ===")
