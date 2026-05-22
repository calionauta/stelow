#!/usr/bin/env python3
"""Analyze Anthropic Skills and other key repos for patterns."""

import json
import re
import os

def read_file(filename):
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    return ""

def extract_code_blocks(text, max_count=30):
    """Extract code blocks from markdown."""
    blocks = []
    # Match ```language ... ``` blocks
    pattern = r'```(\w+)?\n(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    for lang, code in matches[:max_count]:
        if len(code.strip()) > 20:
            blocks.append((lang or 'text', code.strip()[:300]))
    return blocks

print("=" * 70)
print("ANTHROPIC SKILLS ANALYSIS")
print("=" * 70)

# Read Anthropic Skills README
readme = read_file('research/anthropic_skills_readme.md')
print("\n### Anthropic Skills README ###\n")
print(readme[:3000])

# Analyze contents
contents = read_file('research/anthropic_skills_contents.json')
if contents:
    try:
        data = json.loads(contents)
        if isinstance(data, list):
            print("\n### Skills Repository Structure ###")
            for item in data[:15]:
                name = item.get('name', 'N/A')
                type_ = item.get('type', 'N/A')
                print(f"  {type_:12} {name}")
    except:
        pass

# Read ECC (Agent harness optimization)
print("\n" + "=" * 70)
print("ECC (AGENT HARNESS OPTIMIZATION) ANALYSIS")
print("=" * 70)

ecc_readme = read_file('research/ecc_readme.md')
print("\n### ECC README (first 4000 chars) ###\n")
print(ecc_readme[:4000])

# Read Hermes Agent
print("\n" + "=" * 70)
print("HERMES AGENT ANALYSIS")
print("=" * 70)

hermes_readme = read_file('research/hermes_readme.md')
print("\n### Hermes README ###\n")
print(hermes_readme[:2000])

# Read OpenClaw
print("\n" + "=" * 70)
print("OPENCLAW (PERSONAL AI ASSISTANT) ANALYSIS")
print("=" * 70)

openclaw_readme = read_file('research/openclaw_readme.md')
print("\n### OpenClaw README (first 3000 chars) ###\n")
print(openclaw_readme[:3000])

print("\n" + "=" * 70)
print("END OF ANALYSIS")
print("=" * 70)
