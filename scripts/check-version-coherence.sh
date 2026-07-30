#!/usr/bin/env bash
# Check package.json#version against the latest annotated release tag.
#
# This script is intentionally POSIX-shell-compatible apart from Bash strict
# mode and Bash conditionals; CI runs it on Ubuntu and developers may run it
# from macOS. Node is used only to read the JSON version field.
#
# CI mode (default):
#   bash scripts/check-version-coherence.sh [--mode=ci]
# Commit-msg mode:
#   bash scripts/check-version-coherence.sh --hook=commit-msg <message-file>

set -euo pipefail

POST_MORTEM="docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md"
RELEASE_BUMP_RE='^Release-Bump: v[0-9]+\.[0-9]+\.[0-9]+$'
ROLLBACK_RE='^Rollback: v[0-9]+\.[0-9]+\.[0-9]+ → v[0-9]+\.[0-9]+\.[0-9]+ — [^[:space:]].*'

warning() {
  printf '::warning::%s\n' "$*"
}

error() {
  printf '::error::%s\n' "$*"
}

usage() {
  printf 'Usage: %s [--mode=ci | --hook=commit-msg <commit-msg-file>]\n' "$0" >&2
}

has_valid_intent_text() {
  local message=$1

  printf '%s\n' "$message" | grep -Eq "$RELEASE_BUMP_RE" || \
    printf '%s\n' "$message" | grep -Eq "$ROLLBACK_RE"
}

latest_annotated_tag() {
  local tag

  # `git describe --tags` also resolves lightweight tags. Inspecting the
  # object type first ensures only annotated release tags can satisfy this
  # guard. The final regex excludes rc/pre-release and unrelated tags.
  for tag in $(git for-each-ref --format='%(refname:strip=2)' refs/tags 2>/dev/null); do
    [ "$(git cat-file -t "$tag" 2>/dev/null || true)" = "tag" ] || continue
    git merge-base --is-ancestor "$tag^{}" origin/main 2>/dev/null || continue
    printf '%s\n' "$tag"
  done | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1 || true
}

run_commit_msg_check() {
  local message_file=$1
  local package_diff
  local trailer_text
  local version_changed

  if [ ! -f "$message_file" ]; then
    printf 'ERROR: commit message file does not exist: %s\n' "$message_file" >&2
    return 2
  fi

  # The commit-msg hook fires AFTER the index is staged but BEFORE the commit
  # is finalised. The hook does not have the commit's tree yet — only the
  # index. To detect a `package.json#version` change robustly across both
  # minified one-line JSON and pretty-printed JSON output (the latter is what
  # `npm version` produces), diff the staged `package.json` against HEAD.
  package_diff="$(git diff --cached -- package.json || true)"
  if [ -z "$package_diff" ]; then
    return 0
  fi

  # Match either a one-line `{"version": "..."}` diff or a pretty-printed
  # `  "version": "..."` change. The leading `-` and `+` are required.
  version_changed=0
  if printf '%s\n' "$package_diff" | grep -Eq '^[-+].*"version"'; then
    version_changed=1
  elif printf '%s\n' "$package_diff" | grep -Eq '^[-+][[:space:]]*"version"'; then
    version_changed=1
  fi

  if [ "$version_changed" -eq 0 ]; then
    return 0
  fi

  trailer_text="$(cat "$message_file")"

  # Valid trailers first — `Release-Bump:` is the legitimate forward path.
  if printf '%s\n' "$trailer_text" | grep -Eq "$RELEASE_BUMP_RE"; then
    return 0
  fi

  # `Rollback:` with a non-empty reason is also valid. This check MUST run
  # before the bare `^Rollback:` check below, otherwise the broad regex
  # would incorrectly fire on every `Rollback:` line — including the
  # perfectly valid reason-bearing form — and reject a legitimate rollback.
  if printf '%s\n' "$trailer_text" | grep -Eq "$ROLLBACK_RE"; then
    return 0
  fi

  # `Rollback:` requires a non-empty reason. Reject the case where the
  # trailer line is present but has no `— <reason>` tail so the operator
  # cannot bypass intent declaration by writing a bare trailer.
  if printf '%s\n' "$trailer_text" | grep -Eq '^Rollback: v[0-9]+\.[0-9]+\.[0-9]+ → v[0-9]+\.[0-9]+\.[0-9]+$'; then
    printf '%s\n' \
      'ERROR: a Rollback: trailer requires a mandatory reason after `—`.' \
      'Add `Rollback: v<X.Y.Z> → v<A.B.C> — <reason>` with a non-empty reason.' >&2
    return 1
  fi

  # Bare `Rollback:` trailer without even the version pair is a different
  # error — name the trailer format explicitly.
  if printf '%s\n' "$trailer_text" | grep -E '^Rollback:' >/dev/null; then
    printf '%s\n' \
      'ERROR: malformed Rollback: trailer; expected `Rollback: v<X.Y.Z> → v<A.B.C> — <reason>`.' >&2
    return 1
  fi

  printf '%s\n' \
    'ERROR: this commit changes package.json#version but has no valid intent trailer.' \
    'Add `Release-Bump: v<X.Y.Z>` for a release bump, or' \
    '`Rollback: v<X.Y.Z> → v<A.B.C> — <reason>` with a mandatory reason.' >&2
  return 1
}

run_ci_check() {
  local current_version
  local latest_tag

  # A CI checkout can have no usable remote (for example, a local preflight).
  # In that case there is no trustworthy tag baseline, so skip rather than
  # turning a missing CI context into a false failure.
  if ! git fetch origin main; then
    warning 'could not fetch origin/main; skipping version coherence check'
    return 0
  fi

  latest_tag="$(latest_annotated_tag)"
  if [ -z "$latest_tag" ]; then
    warning 'no annotated tag exists on origin/main; skipping version coherence check'
    return 0
  fi

  current_version="$(node -p "require('./package.json').version")"
  if [ "v${current_version}" = "$latest_tag" ]; then
    printf 'package.json#version (%s) matches latest annotated tag %s\n' "$current_version" "$latest_tag"
    return 0
  fi

  if has_valid_intent_text "$(git log -1 --pretty=%B HEAD)"; then
    printf 'package.json#version (%s) differs from %s with a declared intent trailer\n' \
      "$current_version" "$latest_tag"
    return 0
  fi

  error "package.json#version (${current_version}) differs from latest annotated tag ${latest_tag} without Rollback/Release-Bump trailer"
  error "See ${POST_MORTEM} for the v0.55.2 release-drift guard rationale"
  return 1
}

main() {
  local mode=ci
  local message_file
  local original_cwd

  original_cwd=$PWD
  case "${1:-}" in
    '')
      ;;
    --mode=ci)
      ;;
    --hook=commit-msg)
      if [ "$#" -ne 2 ]; then
        usage
        return 2
      fi
      message_file=$2
      case "$message_file" in
        /*) ;;
        *) message_file="$original_cwd/$message_file" ;;
      esac
      mode=commit-msg
      ;;
    *)
      usage
      return 2
      ;;
  esac

  if ! cd "$(git rev-parse --show-toplevel 2>/dev/null)"; then
    printf 'ERROR: must run inside a Git worktree.\n' >&2
    return 2
  fi

  if [ "$mode" = commit-msg ]; then
    run_commit_msg_check "$message_file"
  else
    run_ci_check
  fi
}

main "$@"
