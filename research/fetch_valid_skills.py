#!/usr/bin/env python3
"""Fetch valid skill examples from Anthropic."""

import subprocess
import json

def fetch(url, filename):
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

# Anthropic skills that exist
print("=== Fetching Anthropic Skills ===")
anthropic_skills = [
    ("skills/algorithmic-art/SKILL.md", "anthropic_algorithmic_art.md"),
    ("skills/brand-guidelines/SKILL.md", "anthropic_brand.md"),
    ("skills/frontend-design/SKILL.md", "anthropic_frontend.md"),
    ("skills/skill-creator/SKILL.md", "anthropic_skill_creator.md"),
    ("skills/webapp-testing/SKILL.md", "anthropic_web_testing.md"),
    ("skills/doc-coauthoring/SKILL.md", "anthropic_doc_coauthor.md"),
    ("README.md", "anthropic_readme2.md"),
    ("template/SKILL.md", "anthropic_template.md"),
]

for path, filename in anthropic_skills:
    url = f"https://raw.githubusercontent.com/anthropics/skills/main/{path}"
    size = fetch(url, filename)
    print(f"  {path}: {size}")

# Fetch template from Anthropic
print("\n=== Fetching Anthropic Template ===")
fetch("https://raw.githubusercontent.com/anthropics/skills/refs/heads/main/template/SKILL.md", "anthropic_template.md")

# Fetch from ECC 
print("\n=== Fetching ECC Skill Examples ===")
ecc_files = [
    ("README.md", "ecc_readme2.md"),
    ("docs/HERMES-SETUP.md", "ecc_hermes_setup.md"),
    ("skills/README.md", "ecc_skills_readme.md"),
]

for path, filename in ecc_files:
    url = f"https://raw.githubusercontent.com/affaan-m/ECC/main/{path}"
    size = fetch(url, filename)
    print(f"  {path}: {size}")

# Fetch Hermes documentation
print("\n=== Fetching Hermes Documentation ===")
hermes_files = [
    ("README.md", "hermes_readme2.md"),
    ("docs/SKILLS.md", "hermes_skills.md"),
]

for path, filename in hermes_files:
    url = f"https://raw.githubusercontent.com/NousResearch/hermes-agent/main/{path}"
    size = fetch(url, filename)
    print(f"  {path}: {size}")

print("\n=== Done ===")
