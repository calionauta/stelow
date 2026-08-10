# Multica integration

Stelow can project its authoritative local workflow state to a Multica issue.

## Runtime contract

Set these variables in the Multica-managed run:

```bash
export STELOW_MULTICA_HOST=1
export MULTICA_ISSUE_ID=<issue-uuid>
export STELOW_WORKFLOW_ID=<stable-workflow-uuid>
export STELOW_VERSION=<stelow-version>
```

`stelow.json` remains authoritative. After a successful atomic local write, the adapter best-effort projects:

- workflow metadata;
- native issue status;
- one mutually-exclusive `stelow:<stage>` label;
- gate approval and blocked-reason metadata;
- artifact attachments, deduplicated by SHA-256 metadata key.

A Multica failure never rolls back or corrupts the local workflow file. The adapter logs the projection error and retries on the next durable transition.

## Stage labels

Labels are visual/indexing helpers. `metadata.current_stage` remains the structured value for automation. Only one `stelow:*` label is retained on an issue.

## Stelow Runner

Recommended autopilot configuration:

```bash
multica autopilot create \
  --title "Stelow Runner" \
  --agent <agent-id-or-name> \
  --mode run_only \
  --project <project-id> \
  --description "Advance eligible Stelow workflows. Read stelow.json as authority; do not advance active review gates without an approval receipt."
```

Add a schedule/webhook only after a manual trigger succeeds. The runner must use the issue-scoped workflow ID and must not execute two runs for the same issue concurrently.

## Skill import

Multica imports local skills from `.skill` or `.zip` archives. Run `scripts/package-multica-skills.sh` to create portable `.tgz` source bundles for verification/distribution, then convert them to a Multica-supported archive format (or package as `.zip` on a host with `zip`) before importing:

```bash
multica skill import --file <skill.zip> --on-conflict overwrite --output json
```

Verify the workspace skill count and inspect every imported skill's file list before enabling the runner.
