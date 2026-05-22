#!/usr/bin/env python3
"""Analyze real Anthropic skill examples."""

import os
import json

def read_file(filename):
    if os.path.exists(f'research/{filename}'):
        with open(f'research/{filename}', 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    return ""

print("=" * 70)
print("ANTHROPIC SKILL EXAMPLES ANALYSIS")
print("=" * 70)

# Read and display skill examples
skills = [
    ("anthropic_algorithmic_art.md", "Algorithmic Art"),
    ("anthropic_brand.md", "Brand Guidelines"),
    ("anthropic_frontend.md", "Frontend Design"),
    ("anthropic_skill_creator.md", "Skill Creator"),
    ("anthropic_web_testing.md", "Webapp Testing"),
    ("anthropic_doc_coauthor.md", "Doc Coauthoring"),
    ("anthropic_template.md", "Skill Template"),
]

for filename, name in skills:
    content = read_file(filename)
    if content and len(content) > 200:
        print(f"\n### {name} ({len(content)} chars) ###")
        print("-" * 50)
        # Show first 1500 chars
        print(content[:1500])
        print("...")
        print()
