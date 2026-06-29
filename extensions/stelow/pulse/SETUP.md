# Stelow Pulse — Setup Guide

> Cross-platform: macOS, Linux, Windows.
> All paths relative to project root (`/projeto`).

---

## Prerequisites

| Requirement | Check |
|-------------|-------|
| `pi` CLI installed | `pi --version` |
| Node.js >= 18 (for npx) | `node --version` |
| Git (for project) | `git --version` |
| `bash` 4+ | `bash --version` |
| Pulse files exist | `ls .stelow/pulse/` |

---

## Quick Test

Before scheduling, test manually:

```bash
# Add an item to inbox
pi -p "Add an item to inbox: 'Test pulse processing'"

# Or manually:
mkdir -p .stelow/inbox
echo "Test feature X" >> .stelow/inbox/items.md

# Run pulse once (dry-run first)
bash .stelow/pulse/pulse.sh --dry-run

# Real run
bash .stelow/pulse/pulse.sh
```

Expected output:
```
📡 Pulse complete — workflow: test-feature-x, processed: 1
```

Verify:
```bash
/sw-status          # Should show new workflow
/sw-inbox           # Should be empty (or fewer items)
/sw-inbox history   # Should show provenance entry
/sw-pulse log       # Should show pulse log
```

---

## macOS — launchd (recommended)

`launchd` is Apple's native scheduler — no extra dependencies.

### 1. Create plist

`~/Library/LaunchAgents/com.stelow.pulse.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.stelow.pulse</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/you/projeto/.stelow/pulse/pulse.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/you/projeto</string>
  <key>StandardOutPath</key>
  <string>/Users/you/projeto/.stelow/pulse/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/you/projeto/.stelow/pulse/launchd.err</string>
  <key>StartInterval</key>
  <integer>1800</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
```

> **PATH is critical** — launchd runs with minimal PATH. Ensure `/opt/homebrew/bin` (Apple Silicon) or `/usr/local/bin` (Intel) is included so `pi` is found.

### 2. Load

```bash
launchctl load ~/Library/LaunchAgents/com.stelow.pulse.plist

# Control
launchctl start com.stelow.pulse    # manual trigger
launchctl stop com.stelow.pulse     # stop
launchctl unload ~/Library/LaunchAgents/com.stelow.pulse.plist  # remove
```

### 3. Verify

```bash
launchctl list | grep stelow.pulse
# Should show PID if running
tail -f .stelow/pulse/launchd.log
```

---

## Linux — systemd (user timer)

### 1. Service unit

`~/.config/systemd/user/stelow-pulse.service`:

```ini
[Unit]
Description=Stelow Pulse — process one inbox item

[Service]
Type=oneshot
ExecStart=%h/projeto/.stelow/pulse/pulse.sh
WorkingDirectory=%h/projeto
```

### 2. Timer unit

`~/.config/systemd/user/stelow-pulse.timer`:

```ini
[Unit]
Description=Run Stelow Pulse every 30 minutes

[Timer]
OnCalendar=*:0/30
Persistent=true
RandomizedDelaySec=60

[Install]
WantedBy=timers.target
```

> `RandomizedDelaySec=60` prevents thundering herd at minute boundaries.

### 3. Enable & start

```bash
systemctl --user daemon-reload
systemctl --user enable stelow-pulse.timer
systemctl --user start stelow-pulse.timer

# Control
systemctl --user start stelow-pulse.service  # manual trigger
systemctl --user stop stelow-pulse.timer     # pause
systemctl --user disable stelow-pulse.timer  # remove
```

### 4. Verify

```bash
systemctl --user list-timers | grep stelow-pulse
journalctl --user -u stelow-pulse.service -n 10
```

---

## Linux — cron (alternative)

```bash
crontab -e
```

Add line:

```cron
# Stelow Pulse — every 30 minutes
*/30 * * * * cd /home/you/projeto && bash .stelow/pulse/pulse.sh >> .stelow/pulse/cron.log 2>&1
```

> Unlike systemd, cron has no built-in random delay. Add `sleep $((RANDOM % 60))` at script start on shared systems.

---

## Windows — Task Scheduler

### Option A: Git Bash

1. Open **Task Scheduler**
2. Create Task:
   - **General:** Run whether user is logged on or not
   - **Triggers:** Daily, repeat every 30 minutes
   - **Action:** Start a program
     - Program: `C:\Program Files\Git\bin\bash.exe`
     - Arguments: `-l -c "cd /c/Users/you/projeto && bash .stelow/pulse/pulse.sh"`
     - Start in: `C:\Users\you\projeto`
3. Ensure PATH includes `C:\Program Files\Git\bin` and the Node.js directory

### Option B: PowerShell script (no bash dependency)

The PowerShell script is at `.stelow/pulse/pulse.ps1` — a full implementation
with the same features as pulse.sh (lock, pause, user detection, provenance, max-items, timeout, dry-run).

Run directly:
```powershell
powershell -File .stelow/pulse/pulse.ps1
powershell -File .stelow/pulse/pulse.ps1 -MaxItems 0 -Force
powershell -File .stelow/pulse/pulse.ps1 -DryRun
```

Schedule with:
```powershell
# Create scheduled task
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-ExecutionPolicy Bypass -File C:\Users\you\projeto\.stelow\pulse\pulse.ps1"

$Trigger = New-ScheduledTaskTrigger -Daily -At "00:00" -RepetitionInterval (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName "StelowPulse" -Action $Action -Trigger $Trigger -User $env:USERNAME

# Control
Start-ScheduledTask -TaskName "StelowPulse"
Stop-ScheduledTask -TaskName "StelowPulse"
Unregister-ScheduledTask -TaskName "StelowPulse" -Confirm:$false
```

---

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `PULSE_MODEL` | `haiku` | Model for triage (e.g., `sonnet`, `gpt-4o-mini`) |
| `PULSE_USER_ACTIVITY_MINUTES` | `15` | Skip pulse if stelow.json modified within this many minutes |
| `PULSE_TIMEOUT` | `120` | Max seconds for pi --print call |

Example:
```bash
PULSE_MODEL=sonnet PULSE_USER_ACTIVITY_MINUTES=30 bash .stelow/pulse/pulse.sh
PULSE_MAX_CAP=20 PULSE_TIMEOUT=300 bash .stelow/pulse/pulse.sh
```

---

## Multi-Item Behavior

| Inbox size | Default (10) | `--max-items 1` | `--max-items 0` |
|------------|-------------|------------------|------------------|
| 0 | Skip (exit 2) | Skip | Skip |
| 1 | Process 1 | Process 1 | Process 1 |
| 5 | Process 5 | Process 1 | Process 5 |
| 10 | Process 10 | Process 1 | Process 10 |
| 25 | Process 10 | Process 1 | Process **25** (no cap, warning logged) |

- **Default = process up to 10 items** per cycle
- Use `--max-items 1` for one-per-cycle behavior
- Use `--max-items 0` for **no limit** — processes everything (logs warning if > 20 items)
- Each item becomes a **separate workflow**
- Provenance records how many items were processed and how many remain

### Conflict prevention

| Scenario | Behavior |
|----------|----------|
| Pulse runs, another pulse already active | Lock → exit 1 |
| Pulse runs, user modified stelow.json recently | Skip → exit 3 (configurable via `PULSE_USER_ACTIVITY_MINUTES`) |
| Pulse runs, user inside pi (not modifying stelow.json) | Proceeds (no conflict — separate file operations) |
| User runs `/sw-pulse process` while cron fires | Lock prevents second pulse |
| Network failure during pi --print | Logs error, retries next cycle |
| pi --print takes >30min (next cycle fires) | Lock prevents second pulse |

### Race condition window

The only real risk: pulse and user BOTH write to `stelow.json` simultaneously.
This window is ~5-15 seconds (pi --print duration). Mitigated by:
1. User activity detection (skip if recently modified)
2. Atomic writes (JSON write is single operation)
3. Stelow.json uses writeFileSync (blocking, no partial write)

---

## Monitoring

```bash
# Pulse log
tail -f .stelow/pulse/pulse.log

# Provenance history
/sw-inbox history n=20

# Pulse status
/sw-pulse status

# Launchd (macOS)
launchctl list | grep stelow.pulse

# Systemd (Linux)
systemctl --user status stelow-pulse.service
systemctl --user list-timers | grep stelow-pulse

# Windows
Get-ScheduledTask -TaskName "StelowPulse" | Get-ScheduledTaskInfo
```

---

## Troubleshooting

## Marking Items for Human Review

Prefix an inbox item with `[human-in-the-loop]` (or `[hitl]` for short, or `[human]` for backward compat) to prevent Pulse from processing it:

```
# Inbox

[human-in-the-loop] Pricing strategy — needs market research
Add login page
Fix CSS bug
[hitl] Partnership agreement terms
```

- **Marked items**: Pulse skips them entirely (code-enforced via grep/notmatch). They stay in the inbox for manual triage via `/sw-start`.
- **Unmarked items**: Processed automatically by Pulse.
- **`/sw-start` (interactive)**: Includes marked items in the draft and adds a NOTE suggesting a Review Mode higher than Auto.

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Pulse exits with code 3 | User activity detected | Wait, or `--force` |
| Pulse exits with code 1 | Another pulse running | Wait, check `.stelow/pulse/pulse.lock` |
| `pi: command not found` | PATH missing in scheduler | Add `PATH=/opt/homebrew/bin:$PATH` to cron/systemd/launchd |
| Workflow created but inbox not cleaned | LLM didn't remove item | Check `pulse-task.md` instructions |
| No provenance entry | pi --print failed | Check pulse.log |
| Multiple pulses stacking | Lock file stale | `rm -rf .stelow/pulse/pulse.lock` |
