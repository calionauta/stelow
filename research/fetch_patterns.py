#!/usr/bin/env python3
"""Fetch more patterns and best practices."""

import subprocess
import json

def fetch(url, filename):
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
    except:
        pass
    return 0

def fetch_raw(url, filename):
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '20', url],
            capture_output=True, text=True, timeout=25
        )
        if len(result.stdout) > 100:
            with open(f'research/{filename}', 'w') as f:
                f.write(result.stdout)
            return len(result.stdout)
    except:
        pass
    return 0

print("=== Fetching Additional Patterns ===\n")

# Fetch more skill examples from Anthropic
fetch_raw("https://raw.githubusercontent.com/anthropics/skills/main/skills/canvas-design/SKILL.md", "canvas_design.md")
print("canvas-design: fetched")

fetch_raw("https://raw.githubusercontent.com/anthropics/skills/main/skills/claude-api/SKILL.md", "claude_api.md")
print("claude-api: fetched")

fetch_raw("https://raw.githubusercontent.com/anthropics/skills/main/skills/mcp-builder/SKILL.md", "mcp_builder.md")
print("mcp-builder: fetched")

# Fetch ECC documentation
fetch_raw("https://raw.githubusercontent.com/affaan-m/ECC/main/docs/architecture/cross-harness.md", "ecc_cross_harness.md")
print("ecc-cross-harness: fetched")

fetch_raw("https://raw.githubusercontent.com/affaan-m/ECC/main/docs/skills/SKILL.md", "ecc_skills_full.md")
print("ecc-skills: fetched")

# Search for prompt engineering best practices
print("\n=== Fetching Prompt Engineering Best Practices ===")
fetch("https://api.github.com/search/repositories?q=prompt+engineering+skills+in:readme&sort=stars", "prompt_engineering_repos.json")
print("prompt engineering repos: fetched")

# Fetch from agentskills.io
fetch_raw("https://raw.githubusercontent.com/anthropics/skills/main/spec/SPEC.md", "skill_spec.md")
print("skill-spec: fetched")

# Fetch Hermes skills documentation
fetch_raw("https://raw.githubusercontent.com/NousResearch/hermes-agent/main/docs/SKILLS.md", "hermes_skills.md")
print("hermes-skills: fetched")

# Fetch OpenClaw skills docs
fetch_raw("https://raw.githubusercontent.com/openclaw/openclaw/main/docs/SKILLS.md", "openclaw_skills.md")
print("openclaw-skills: fetched")

print("\n=== Done ===")
