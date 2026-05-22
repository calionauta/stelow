#!/usr/bin/env python3
"""Fetch skill-related content from structured sources."""

import subprocess
import json
import os

def fetch_json(url, filename):
    """Fetch JSON API response."""
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '-H', 'Accept: application/vnd.github.v3+json', 
             '--max-time', '15', url],
            capture_output=True, text=True, timeout=20
        )
        if result.stdout and result.stdout.strip().startswith('{'):
            with open(f'research/{filename}', 'w') as f:
                f.write(result.stdout)
            return len(result.stdout)
        return f"Non-JSON: {len(result.stdout)}"
    except Exception as e:
        return f"Error: {e}"

# Fetch GitHub repos with AI agent skills
print("Fetching GitHub AI agent repos...")

repos = [
    ("microsoft/vscode-copilot-free", "copilot_api.json"),
    ("anthropics/anthropic-cookbook", "anthropic_cookbook.json"),
    ("openai/openai-cookbook", "openai_cookbook.json"),
    ("cursor-ai/cursor", "cursor_repo.json"),
    ("pi-sdk/pi", "pi_repo.json"),
]

for repo, filename in repos:
    size = fetch_json(f"https://api.github.com/repos/{repo}", filename)
    print(f"  {repo}: {size}")

# Fetch NPM package info for AI agents
print("\nFetching NPM AI agent packages...")
size = fetch_json("https://registry.npmjs.org/-/v1/search?text=ai-agent skill&size=10", "npm_ai.json")
print(f"  NPM search: {size}")

# Fetch LangChain GitHub
print("\nFetching LangChain GitHub...")
size = fetch_json("https://api.github.com/repos/langchain-ai/langchain", "langchain_repo.json")
print(f"  LangChain: {size}")

print("\n=== Fetch complete ===")
