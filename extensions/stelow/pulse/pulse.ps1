<#
.SYNOPSIS
  Stelow Pulse for Windows — periodic inbox processor (PowerShell).
.DESCRIPTION
  Cross-platform alternative to pulse.sh for Windows without bash.
  Processes inbox items, creates workflows, logs provenance.
  Schedule via Windows Task Scheduler.
.PARAMETER MaxItems
  Number of items to process. 0 = all (no cap). Default: 10.
.PARAMETER Force
  Skip pause check and user activity detection.
.PARAMETER DryRun
  Show what would be done without executing.
.PARAMETER TimeoutSec
  Max seconds for pi --print. Default: 120.
.EXAMPLE
  .\pulse.ps1
  .\pulse.ps1 -MaxItems 0 -Force
  .\pulse.ps1 -MaxItems 1
  .\pulse.ps1 -DryRun
#>

param(
  [int]$MaxItems = 10,
  [switch]$Force,
  [switch]$DryRun,
  [int]$TimeoutSec = 120
)

$ErrorActionPreference = "Stop"
$PulseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path "$PulseDir/../.."
$StelowJson = "$ProjectDir/stelow.json"
$Inbox = "$ProjectDir/.stelow/inbox/items.md"
$Log = "$PulseDir/pulse.log"
$Lock = "$PulseDir/pulse.lock"
$PauseFile = "$PulseDir/pulse.pause"
$Provenance = "$ProjectDir/.stelow/inbox/history.jsonl"
$Model = if ($env:PULSE_MODEL) { $env:PULSE_MODEL } else { "" }
$UserActivityMinutes = if ($env:PULSE_USER_ACTIVITY_MINUTES) { [int]$env:PULSE_USER_ACTIVITY_MINUTES } else { 15 }

function Log($Msg) {
  $Line = "[$(Get-Date -Format 'o')] $Msg"
  Add-Content $Log $Line
}

function Get-JsonValue($Path, $Key) {
  # Minimal JSON parser for simple values (no jq dependency)
  $Content = Get-Content $Path -Raw -ErrorAction SilentlyContinue
  if (-not $Content) { return $null }
  if ($Content -match "\`"$Key\`"\s*:\s*\"([^\"]+)\"") { return $Matches[1] }
  return $null
}

# ── Checks ───────────────────────────────────────────────────────────

# 1. Inbox exists and non-empty?
if (-not (Test-Path $Inbox) -or (Get-Item $Inbox).Length -eq 0) {
  Log "Inbox empty — nothing to process"
  exit 2
}

# 2. Paused?
if ((Test-Path $PauseFile) -and (-not $Force)) {
  Log "Pulse paused — remove $PauseFile to resume"
  exit 0
}

# 3. Lock (New-Item -ItemType Directory is atomic on NTFS)
try {
  $null = New-Item -Path $Lock -ItemType Directory -ErrorAction Stop
} catch {
  Log "Another pulse already running"
  exit 1
}

# 4. User activity detection
if (-not $Force) {
  # 4a. stelow.json mtime check
  if (Test-Path $StelowJson) {
    $LastWrite = (Get-Item $StelowJson).LastWriteTime
    $Elapsed = [DateTime]::UtcNow - $LastWrite.ToUniversalTime()
    if ($Elapsed.TotalMinutes -lt $UserActivityMinutes) {
      Log "User activity detected (stelow.json modified < ${UserActivityMinutes}m ago) — skipping"
      Remove-Item $Lock -Force -ErrorAction SilentlyContinue
      exit 3
    }
  }

  # 4b. Check for running pi processes (interactive sessions)
  $PiProcesses = Get-Process -Name "pi" -ErrorAction SilentlyContinue
  foreach ($Proc in $PiProcesses) {
    # pi --print processes have no window. Interactive sessions have a main window.
    if ($Proc.MainWindowHandle -ne [IntPtr]::Zero) {
      Log "User activity detected (pi process PID $($Proc.Id) running interactively) — skipping"
      Remove-Item $Lock -Force -ErrorAction SilentlyContinue
      exit 3
    }
  }
}

# ── Determine items to process ──────────────────────────────────────
$InboxContent = Get-Content $Inbox | Where-Object { $_ -notmatch '^#' -and $_ -notmatch '\[(human(-in-the-loop)?|hitl)\]' }
$ItemCount = $InboxContent.Count

if ($MaxItems -eq 0) {
  # Uncap — user explicitly asked for ALL
  $ToProcess = $ItemCount
  $Label = "all $ItemCount (uncapped)"
  if ($ItemCount -gt 20) {
    Log "⚠️  WARNING: Processing ALL $ItemCount items (-MaxItems 0). This may take a while."
  }
} elseif ($MaxItems -ge $ItemCount) {
  $ToProcess = $ItemCount
  $Label = "all $ItemCount"
} else {
  $ToProcess = $MaxItems
  $Label = "$ToProcess of $ItemCount"
}

$FirstItem = ($InboxContent | Select-Object -First 1).Trim()
Log "Inbox: $ItemCount item(s), processing $Label, first: $($FirstItem.Substring(0, [Math]::Min(80, $FirstItem.Length)))"

if ($DryRun) {
  $DisplayModel = if ($Model) { $Model } else { "harness default" }
  Log "DRY RUN: would process $Label items with model $DisplayModel (timeout: ${TimeoutSec}s)"
  Write-Output "📡 [DRY RUN] Would process $Label item(s)"
  Write-Output "   Model: $DisplayModel"
  Write-Output "   Timeout: ${TimeoutSec}s"
  Write-Output "   First: $($FirstItem.Substring(0, [Math]::Min(80, $FirstItem.Length)))"
  Remove-Item $Lock -Force -ErrorAction SilentlyContinue
  exit 0
}

# ── Execute pi --print headless ──────────────────────────────────────
$SystemPrompt = "$PulseDir/pulse-system.md"
$TaskPrompt = Get-Content "$PulseDir/pulse-task.md" -Raw

$EffectiveTask = @"
$TaskPrompt

PROCESSING LIMIT: Process up to $ToProcess item(s) this cycle.
If there are fewer, process all. If there are more, stop after $ToProcess.
"@

Log "Running pi --print (model: $(if ($Model) { $Model } else { 'harness default' }), max-items: $ToProcess, timeout: ${TimeoutSec}s)..."

try {
  if ($Model) {
    $Output = pi --print --model $Model --append-system-prompt (Get-Content $SystemPrompt -Raw) $EffectiveTask 2>&1
  } else {
    $Output = pi --print --append-system-prompt (Get-Content $SystemPrompt -Raw) $EffectiveTask 2>&1
  }
  $ExitCode = $LASTEXITCODE
} catch {
  $Output = $_.Exception.Message
  $ExitCode = 1
}

Log "pi --print exit code: $ExitCode"

# ── Log provenance ────────────────────────────────────────────────────
$WorkflowName = ""
$WorkflowDir = ""
$ProcessedCount = 1

if ($ExitCode -eq 0) {
  if ($Output -match 'WORKFLOW:\s*(.+)') { $WorkflowName = $Matches[1].Trim() }
  if ($Output -match 'DIR:\s*(.+)') { $WorkflowDir = $Matches[1].Trim() }
  if ($Output -match 'COUNT:\s*(\d+)') { $ProcessedCount = [int]$Matches[1] }
}

$Remaining = [Math]::Max(0, $ItemCount - $ToProcess)
$Entry = @{
  ts = (Get-Date -Format 'o')
  item = $FirstItem
  workflow = $WorkflowName
  dir = $WorkflowDir
  exit_code = $ExitCode
  items_processed = $ProcessedCount
  items_remaining = $Remaining
}
$null = New-Item -Path (Split-Path $Provenance -Parent) -ItemType Directory -Force -ErrorAction SilentlyContinue
Add-Content $Provenance ($Entry | ConvertTo-Json -Compress)

if ($ExitCode -eq 0) {
  Log "✅ Pulse complete — workflow: $WorkflowName, items processed: $ProcessedCount, remaining: $Remaining"
  Write-Output $Output
} else {
  Log "❌ Pulse failed (exit: $ExitCode) — will retry next cycle"
  $Output -split "`n" | Select-Object -Last 5 | ForEach-Object { Log "  $_" }
  Write-Output $Output
}

Remove-Item $Lock -Force -ErrorAction SilentlyContinue
exit $ExitCode
