#!/usr/bin/env python3
"""Fetch example skills from Anthropic's repository."""

import subprocess
import json

def fetch_content(url, filename):
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '20', url],
            capture_output=True, text=True, timeout=25
        )
        if len(result.stdout) > 100:
            with open(f'research/{filename}', 'w') as f:
                f.write(result.stdout)
            return len(result.stdout)
    except Exception as e:
        return f"Error: {e}"
    return 0

print("=== Fetching Anthropic Skill Examples ===\n")

# Get the list of skills from the directory
result = subprocess.run(
    ['curl', '-s', 'https://api.github.com/repos/anthropics/skills/contents/skills'],
    capture_output=True, text=True, timeout=15
)
if result.stdout:
    try:
        skills = json.loads(result.stdout)
        if isinstance(skills, list):
            print(f"Found {len(skills)} skill folders\n")
            for skill in skills[:20]:
                name = skill.get('name', 'N/A')
                print(f"  - {name}")
    except:
        pass

# Fetch specific skill examples
skills_to_fetch = [
    ("skills/test-web-app/SKILL.md", "test_web_app.md"),
    ("skills/code-review/SKILL.md", "code_review.md"),
    ("skills/readme-writer/SKILL.md", "readme_writer.md"),
    ("skills/pr-writer/SKILL.md", "pr_writer.md"),
    ("template/SKILL.md", "skill_template.md"),
    ("spec/SPEC.md", "skill_spec.md"),
]

print("\n=== Fetching Skill Files ===\n")
for path, filename in skills_to_fetch:
    url = f"https://raw.githubusercontent.com/anthropics/skills/main/{path}"
    size = fetch_content(url, filename)
    print(f"  {path}: {size} chars")

# Fetch ECC skill examples
print("\n=== Fetching ECC Skill Examples ===")
ecc_skills = [
    ("skills/swe-bench/SKILL.md", "ecc_swe_skill.md"),
    ("docs/skills/SKILL.md", "ecc_skills_doc.md"),
    ("docs/architecture/skills.md", "ecc_architecture.md"),
]

for path, filename in ecc_skills:
    url = f"https://raw.githubusercontent.com/affaan-m/ECC/main/{path}"
    size = fetch_content(url, filename)
    print(f"  {path}: {size} chars")

print("\n=== Done ===")
