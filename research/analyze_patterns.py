#!/usr/bin/env python3
"""Analyze fetched content for skill design patterns."""

import os
import re
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip_tags = {'script', 'style', 'nav', 'header', 'footer'}
        self.current_tag = None
        
    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        if tag in self.skip_tags:
            self.skip_tags.add(tag)
            
    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.skip_tags.discard(tag)
        self.current_tag = None
        
    def handle_data(self, data):
        if self.current_tag not in self.skip_tags and data.strip():
            self.text.append(data.strip())

def extract_text(html_file, max_chars=50000):
    """Extract readable text from HTML."""
    if not os.path.exists(html_file):
        return ""
    with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()[:max_chars]
    parser = TextExtractor()
    parser.feed(html)
    return '\n'.join(parser.text[:500])

# Analyze each file
files = {
    'mcp_docs.html': 'Model Context Protocol',
    'anthropic_tools.html': 'Anthropic Tools',
    'openai_functions.html': 'OpenAI Functions',
    'langchain_tools.html': 'LangChain Tools',
    'cursor_rules.html': 'Cursor Rules',
}

print("=" * 60)
print("SKILL DESIGN PATTERNS ANALYSIS")
print("=" * 60)

for filename, source in files.items():
    print(f"\n### {source} ###")
    text = extract_text(f'research/{filename}')
    # Show first 1500 chars
    print(text[:1500])
    print("...")
