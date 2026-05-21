# Security Guide

Tools and practices for supply chain security when using this project.

---

## Tool Comparison

| Criteria | Snyk | Trivy (Aqua) | OSV-Scanner (Google) |
|----------|------|-------------|---------------------|
| **Free** | ⚠️ Limited (100 SAST/mo) | ✅ 100% free, MIT | ✅ 100% free, Apache 2.0 |
| **Auth required** | ❌ Account + token needed | ✅ None | ✅ None |
| **Architecture** | ❌ Cloud round-trip (~18s) | ✅ Fully local (~7s) | ✅ Fully local (~3s) |
| **Offline** | ❌ No | ✅ Local DB (~400MB) | ✅ Local DB |
| **Severity filter** | ✅ `--severity-threshold` | ✅ `--severity HIGH,CRITICAL` | ⚠️ Only in `fix` subcommand |
| **Detection scope** | SCA + container + IaC + SAST | **Universal** (OS pkgs, lang deps, IaC, secrets, SBOM, licenses) | SCA focused (precise commit-hash matching) |
| **False positives** | 5.1% | **4.2%** (lowest of the three) | Lowest raw rate (commit-hash precision), but narrower scope |
| **Ease for AGENTS.md** | Needs auth setup | ✅ `trivy fs .` — one line | ✅ `osv-scanner scan -r .` — one line |

**Verdict:** Trivy is the best recommendation for any developer — zero auth, local, fast, scans everything. OSV-Scanner is ideal for precision (fewer false positives). Snyk is the worst fit here due to mandatory account + cloud dependency + free tier limits.

---

## Layer 1: Behavioral Malware Scanning — Socket.dev

[Socket.dev](https://socket.dev) detects malicious packages before you install them. Unlike CVE-based scanners, it analyzes package behavior: obfuscated code, network access in install scripts, typosquatting, and suspicious maintainer activity.

```bash
npm install -g socket
socket login                          # Requires account at socket.dev
socket wrapper on                     # Transparent npm/npx wrapping

# CI gate
socket ci

# Manual scan
socket scan create --report
```

---

## Layer 2: CVE Scanning — Trivy (Recommended)

[Trivy](https://github.com/aquasecurity/trivy) by Aqua Security scans dependencies, IaC, secrets, containers, and SBOMs — all from a single binary. No account, no SaaS, no rate limits.

```bash
# Install
brew install trivy

# Scan current project dependencies
trivy fs --severity HIGH,CRITICAL --exit-code 1 .

# Scan with all detectors
trivy fs --scanners vuln,secret,config --severity HIGH,CRITICAL .

# Scan a specific lockfile
trivy fs --severity HIGH,CRITICAL /path/to/package-lock.json

# SARIF output for GitHub Security tab
trivy fs --format sarif --output results.sarif .
```

### CI (GitHub Actions)

```yaml
- uses: aquasecurity/trivy-action@v0.36.0
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
    exit-code: '1'
    severity: 'CRITICAL,HIGH'
```

---

## Layer 3: Precision Scanning — OSV-Scanner (Optional)

[OSV-Scanner](https://github.com/google/osv-scanner) by Google matches vulnerabilities to precise commit hashes rather than version ranges. This minimizes false positives. It uses the OSV.dev database (aggregates from GitHub Advisories, RustSec, Go vulndb, npm, PyPI, and more).

```bash
# Install
brew install osv-scanner

# Scan project (recursively finds all lockfiles)
osv-scanner scan -r .

# Scan a specific lockfile
osv-scanner scan -L package-lock.json

# Guided remediation (npm, Maven)
osv-scanner fix -M package.json -L package-lock.json
```

### CI (GitHub Actions)

```yaml
jobs:
  scan:
    uses: "google/osv-scanner-action/.github/workflows/osv-scanner-reusable-pr.yml@v2.3.8"
```

---

## How to Instruct Your Agent

Copy the sections below that match the tools you use. Each is independent — add only what you have installed.

### Socket.dev (malware prevention)

```markdown
## Security Scanning

Before installing packages: `socket npm install <pkg>` (if Socket.dev installed)
```

### Trivy (CVE + IaC + secrets — recommended)

```markdown
## Security Scanning

Before pushing: `trivy fs --severity HIGH,CRITICAL --exit-code 1 .` (if Trivy installed)
```

### OSV-Scanner (precision CVE — optional)

```markdown
## Security Scanning

Before pushing: `osv-scanner scan -r .` (if OSV-Scanner installed)
```

If using multiple tools, combine them into one block:

```markdown
## Security Scanning

Before installing packages: `socket npm install <pkg>` (if Socket.dev installed)
Before pushing:
- `trivy fs --severity HIGH,CRITICAL --exit-code 1 .` (if Trivy installed)
- `osv-scanner scan -r .` (if OSV-Scanner installed)
```

Each layer catches different things:

| Moment | Tool | What it catches |
|--------|------|-----------------|
| Before `npm install` | Socket.dev | Novel malware, obfuscation, behavioral anomalies |
| Before push / in CI | Trivy | Known CVEs, IaC misconfigs, secrets, licenses |
| Before push / in CI | OSV-Scanner | Same CVEs with fewer false positives, guided remediation |

Socket.dev blocks attacks at install time. Trivy provides broad coverage. OSV-Scanner adds precision if false positives are a concern.

---

## Summary

| Layer | Tool | Cost | Auth | Scope |
|-------|------|------|------|-------|
| Malware prevention | Socket.dev | Free tier | ✅ Required | Behavioral analysis |
| CVE + IaC + secrets | **Trivy** | 100% free | ❌ None | Universal |
| Precision CVE | OSV-Scanner | 100% free | ❌ None | Dependencies only |

Start with Trivy — it covers the most ground with zero friction. Add Socket.dev for install-time malware protection. Add OSV-Scanner if false positives become a problem.

---

## Related

- [Installation Guide](INSTALLATION.md) — how cali-product-workflow itself is distributed
