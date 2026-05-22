#!/usr/bin/env python3
"""Fetch key repos for skill patterns."""

import subprocess
import json

def fetch_json(url, filename):
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '-H', 'Accept: application/vnd.github.v3+json',
             '--max-time', '20', url],
            capture_output=True, text=True, timeout=25
        )
        if result.stdout and len(result.stdout) > 100:
            with open(f'research/{filename}', 'w') as f:
                f.write(result.stdout)
            return len(result.stdout)
    except Exception as e:
        return f"Error: {e}"
    return 0

def fetch_content(url, filename):
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '20', url],
            capture_output=True, text=True, timeout=25
        )
        if len(result.stdout) > 1000:
            with open(f'research/{filename}', 'w') as f:
                f.write(result.stdout)
            return len(result.stdout)
    except Exception as e:
        return f"Error: {e}"
    return 0

print("=== Fetching Key AI Agent Skill Repos ===\n")

# Anthropic Skills (main repo for agent skills!)
print("1. Anthropic Skills...")
size = fetch_json("https://api.github.com/repos/anthropics/skills", "anthropic_skills_repo.json")
print(f"   Repo info: {size} chars")

size = fetch_json("https://api.github.com/repos/anthropics/skills/contents", "anthropic_skills_contents.json")
print(f"   Contents: {size} chars")

# Fetch README
size = fetch_content("https://raw.githubusercontent.com/anthropics/skills/main/README.md", "anthropic_skills_readme.md")
print(f"   README: {size} chars")

# ECC - Agent harness optimization
print("\n2. ECC (Agent Harness Optimization)...")
size = fetch_json("https://api.github.com/repos/affaan-m/ECC", "ecc_repo.json")
print(f"   Repo info: {size} chars")

size = fetch_content("https://raw.githubusercontent.com/affaan-m/ECC/main/README.md", "ecc_readme.md")
print(f"   README: {size} chars")

# Hermes Agent
print("\n3. Hermes Agent...")
size = fetch_json("https://api.github.com/repos/NousResearch/hermes-agent", "hermes_repo.json")
print(f"   Repo info: {size} chars")

size = fetch_content("https://raw.githubusercontent.com/NousResearch/hermes-agent/main/README.md", "hermes_readme.md")
print(f"   README: {size} chars")

# OpenClaw - Personal AI assistant
print("\n4. OpenClaw...")
size = fetch_json("https://api.github.com/repos/openclaw/openclaw", "openclaw_repo.json")
print(f"   Repo info: {size} chars")

size = fetch_content("https://raw.githubusercontent.com/openclaw/openclaw/main/README.md", "openclaw_readme.md")
print(f"   README: {size} chars")

print("\n=== Done ===")
