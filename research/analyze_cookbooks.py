#!/usr/bin/env python3
"""Analyze GitHub cookbook data for skill patterns."""

import json

print("=" * 60)
print("GITHUB REPO ANALYSIS")
print("=" * 60)

files = {
    'anthropic_cookbook.json': 'Anthropic Cookbook',
    'openai_cookbook.json': 'OpenAI Cookbook',
    'langchain_repo.json': 'LangChain',
}

for filename, name in files.items():
    print(f"\n### {name} ###")
    try:
        with open(f'research/{filename}', 'r') as f:
            data = json.loads(f.read())
        
        if isinstance(data, dict):
            print(f"  Name: {data.get('full_name', 'N/A')}")
            print(f"  Description: {data.get('description', 'N/A')}")
            print(f"  Stars: {data.get('stargazers_count', 'N/A')}")
            print(f"  Topics: {data.get('topics', [])}")
            print(f"  Language: {data.get('language', 'N/A')}")
            
            # Look for skill/tool patterns in description
            desc = data.get('description', '').lower()
            if 'skill' in desc or 'tool' in desc or 'agent' in desc:
                print(f"  ⚠️ Contains skill/agent keywords")
    except Exception as e:
        print(f"  Error: {e}")

# Look for specific pattern files in existing skills
print("\n" + "=" * 60)
print("SEARCHING FOR SKILL PATTERNS IN COMMON REPOS")
print("=" * 60)

# Search for Claude skills examples
print("\n### Claude Skills Patterns ###")
try:
    result = subprocess.run(
        ['curl', '-s', 'https://api.github.com/search/code?q=skills+in:path+repo:anthropics/claude-code'],
        capture_output=True, text=True, timeout=15
    )
    if result.stdout:
        data = json.loads(result.stdout)
        print(f"  Found {data.get('total_count', 0)} results")
except Exception as e:
    print(f"  Error: {e}")
