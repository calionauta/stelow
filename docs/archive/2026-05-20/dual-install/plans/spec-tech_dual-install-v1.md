---
source: cali-product-tech-planning
original_files: research from context-mode + current implementation
date: 2026-05-20
---

# Technical Spec: Dual-Install Pattern (Global + Pi Extension)

**Version:** v1  
**Status:** Draft - For Execution  
**Date:** 2026-05-20  
**Author:** Cali (Renato Caliari)

---

## 0. Context

### Current State
- Single npm package with all files
- Pi-specific deps in `optionalPeerDependencies`
- Extension in `extensions/cali-product-workflow/`

### Problem
- Package.json has Pi-specific fields blocking other CLIs
- Skills need to be accessible globally
- Extension needs lightweight structure for Pi

### Solution (Context Mode Pattern)
```
npm install -g @renatocaliari/stelow  → Core (skills, adapters)
pi install npm:@renatocaliari/stelow-pw-pi  → Lightweight Pi extension
```

---

## 1. Research: Context Mode Implementation

### Main Package Structure
```json
{
  "name": "context-mode",
  "bin": { "context-mode": "./cli.bundle.mjs" },
  "exports": {
    ".": "./build/adapters/opencode/plugin.js",
    "./plugin": "./build/adapters/opencode/plugin.js",
    "./cli": "./cli.bundle.mjs"
  },
  "pi": {
    "extensions": ["./build/adapters/pi/extension.js"],
    "skills": ["./skills"]
  }
}
```

### Pi Extension Structure
```json
{
  "name": "context-mode",
  "main": "index.ts",
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
```

### Key Patterns
1. **Exports field**: Multiple entry points
2. **Bin field**: CLI executable globally
3. **Pi field**: Extension path (Pi-specific)
4. **Lightweight deps**: Only what Pi needs

---

## 2. Identified Scopes

| # | Scope | Type | Justification |
|---|-------|------|---------------|
| 0 | spike-dual-install-research | spike | Investigate context-mode pattern in detail |
| 1 | feature-create-pi-extension | feature | Create lightweight Pi extension package |
| 2 | feature-update-package-structure | feature | Add exports, bin fields to main package |
| 3 | feature-update-install-script | feature | Dual-install in install.sh |
| 4 | test-dual-install | test-behavior | Test both installs work |

---

## 3. Detailed Scopes

---

## [SCOPE-0] spike-dual-install-research

**Type:** spike  
**Objective:** Investigate context-mode dual-install pattern thoroughly

### Tasks
1. Read context-mode package.json exports structure
2. Read context-mode build scripts
3. Understand how Pi extension references main package
4. Document installation flow
5. Identify potential issues with our implementation

### Output
- `docs/DUAL-INSTALL-PATTERN.md` with findings

---

## [SCOPE-1] feature-create-pi-extension

**Type:** feature  
**Objective:** Create lightweight Pi extension package

### Tasks
1. Create `extensions/stelow-pw-pi/package.json`
2. Move Pi-specific dependencies to extension package.json
3. Create `index.ts` that imports from main package
4. Update main package.json to point to extension
5. Add build script for extension

### New File Structure
```
extensions/stelow-pw-pi/
├── package.json
├── index.ts
├── tsconfig.json
└── README.md
```

---

## [SCOPE-2] feature-update-package-structure

**Type:** feature  
**Objective:** Update main package.json with exports and bin fields

### Tasks
1. Add `exports` field with multiple entry points
2. Add `bin` field for CLI (if we have one)
3. Keep `pi` field pointing to new extension
4. Move non-essential Pi deps to optionalPeerDependencies
5. Update files array in package.json

---

## [SCOPE-3] feature-update-install-script

**Type:** feature  
**Objective:** Update install.sh for dual-install pattern

### Tasks
1. Update install.sh to do dual-install:
   - `npm install -g @renatocaliari/stelow` (core)
   - `pi install npm:@renatocaliari/stelow-pw-pi` (extension)
2. Add separation message between installs
3. Test on Pi system
4. Test on non-Pi (should only install core)

---

## [SCOPE-4] test-dual-install

**Type:** test-behavior  
**Objective:** Test dual-install pattern works correctly

### Tasks
1. Test global install only (non-Pi)
2. Test dual-install (Pi)
3. Test extension loads correctly
4. Test skills are accessible
5. Test commands work

---

## 4. Summary

| Scope | Type | Effort |
|-------|------|--------|
| spike-dual-install-research | spike | Low |
| feature-create-pi-extension | feature | Medium |
| feature-update-package-structure | feature | Low |
| feature-update-install-script | feature | Low |
| test-dual-install | test | Medium |

---

## 5. Risks

| Risk | Mitigation |
|------|-----------|
| Extension can't find main package | Use npm workspaces or peerDependencies |
| Build complexity increases | Keep build simple, no complex bundling |
| Version sync issues | Use workspace:* for local development |