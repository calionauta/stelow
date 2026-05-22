#!/usr/bin/env python3
"""Analyze additional skill patterns."""

import os

def read_file(filename):
    if os.path.exists(f'research/{filename}'):
        with open(f'research/{filename}', 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    return ""

print("=" * 70)
print("SKILL SPECIFICATION ANALYSIS")
print("=" * 70)

spec = read_file('skill_spec.md')
if spec:
    print(spec[:3000])

print("\n" + "=" * 70)
print("CANVAS DESIGN SKILL")
print("=" * 70)

canvas = read_file('canvas_design.md')
if canvas:
    print(canvas[:2000])

print("\n" + "=" * 70)
print("MCP BUILDER SKILL")
print("=" * 70)

mcp = read_file('mcp_builder.md')
if mcp:
    print(mcp[:2000])

print("\n" + "=" * 70)
print("ECC CROSS-HARNESS ARCHITECTURE")
print("=" * 70)

ecc = read_file('ecc_cross_harness.md')
if ecc:
    print(ecc[:2000])

print("\n" + "=" * 70)
print("HERMES SKILLS")
print("=" * 70)

hermes = read_file('hermes_skills.md')
if hermes:
    print(hermes[:2000])

print("\n" + "=" * 70)
print("OPENCLAW SKILLS")
print("=" * 70)

openclaw = read_file('openclaw_skills.md')
if openclaw:
    print(openclaw[:2000])

print("\n" + "=" * 70)
print("END")
print("=" * 70)
