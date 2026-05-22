#!/usr/bin/env python3
"""Analyze MCP specification for skill design patterns."""

import json
import re

def extract_md_content(html_file, max_lines=200):
    """Extract main content from HTML for markdown-like analysis."""
    if not __import__('os').path.exists(html_file):
        return ""
    
    with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Extract text between specific patterns
    # Look for code blocks, headings, and key sections
    text_sections = []
    
    # Extract code blocks
    code_blocks = re.findall(r'<code>(.*?)</code>', content, re.DOTALL)
    for block in code_blocks[:50]:  # Limit to first 50
        clean = re.sub(r'<[^>]+>', '', block).strip()
        if len(clean) > 20:
            text_sections.append(f"CODE: {clean[:200]}")
    
    # Extract headings
    headings = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', content, re.DOTALL)
    for h in headings[:30]:
        clean = re.sub(r'<[^>]+>', '', h).strip()
        if clean:
            text_sections.append(f"HEADING: {clean}")
    
    return '\n'.join(text_sections[:max_lines])

print("=" * 70)
print("MCP SPECIFICATION ANALYSIS")
print("=" * 70)

# Analyze MCP spec
print("\n### MCP Spec Content ###")
content = extract_md_content('research/mcp_spec.html', 150)
for line in content.split('\n')[:80]:
    print(line)

# Analyze GitHub trending
print("\n" + "=" * 70)
print("GITHUB TRENDING AI SKILLS")
print("=" * 70)

try:
    with open('research/github_trending.json', 'r') as f:
        data = json.loads(f.read())
    
    if isinstance(data, dict) and 'items' in data:
        repos = data['items'][:10]
        for repo in repos:
            print(f"\n- {repo.get('full_name', 'N/A')}")
            print(f"  Stars: {repo.get('stargazers_count', 0)}")
            print(f"  Description: {repo.get('description', 'N/A')[:100]}")
            topics = repo.get('topics', [])[:5]
            if topics:
                print(f"  Topics: {', '.join(topics)}")
except Exception as e:
    print(f"Error: {e}")
