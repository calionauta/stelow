#!/usr/bin/env python3
"""Fetch skill-related content for analysis."""

import subprocess
import json
import re

def fetch_url(url, filename):
    """Fetch URL content and save to file."""
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '15', url],
            capture_output=True, text=True, timeout=20
        )
        content = result.stdout
        if len(content) > 100:
            with open(f'research/{filename}', 'w') as f:
                f.write(content)
            return len(content)
    except Exception as e:
        return f"Error: {e}"
    return 0

# Fetch MCP documentation
print("Fetching MCP documentation...")
size = fetch_url("https://modelcontextprotocol.io/introduction", "mcp_docs.html")
print(f"  MCP intro: {size} chars")

size = fetch_url("https://modelcontextprotocol.io/specification/2024-11-05", "mcp_spec.html")
print(f"  MCP spec: {size} chars")

# Fetch Anthropic Claude docs on tools
print("\nFetching Anthropic tool documentation...")
size = fetch_url("https://docs.anthropic.com/en/docs/build-with-claude/tools/overview", "anthropic_tools.html")
print(f"  Anthropic tools: {size} chars")

# Fetch OpenAI function calling docs
print("\nFetching OpenAI function calling docs...")
size = fetch_url("https://platform.openai.com/docs/guides/function-calling", "openai_functions.html")
print(f"  OpenAI functions: {size} chars")

# Fetch LangChain tools documentation
print("\nFetching LangChain tools docs...")
size = fetch_url("https://python.langchain.com/docs/concepts/tools/", "langchain_tools.html")
print(f"  LangChain tools: {size} chars")

# Fetch GitHub trending on AI agents
print("\nFetching GitHub AI agent repos...")
size = fetch_url("https://github.com/topics/ai-agent?l=typescript", "github_ai_agent.html")
print(f"  GitHub AI agents: {size} chars")

# Fetch Cursor rules / AI agent best practices
print("\nFetching Cursor AI best practices...")
size = fetch_url("https://docs.cursor.com/context/rules-for-ai-best-practices", "cursor_rules.html")
print(f"  Cursor rules: {size} chars")

print("\n=== Fetch complete ===")
