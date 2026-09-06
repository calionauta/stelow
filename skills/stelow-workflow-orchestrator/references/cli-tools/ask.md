# ask_user_question

Use the canonical `ask_user_question` tool for human input. Hosts map this
name to their native interaction API in their own config — never here.

Do not invoke a host-specific command from a skill. Resolve by a leading
convention instead:

- If the `ask_user_question` tool is registered on this session, call it
  directly.
- Otherwise, use the portable `stelow ask` file-handoff form:

  ```bash
  export STELOW_THREAD_ID="<id of THIS worker session>"
  stelow ask \
    --question "<single clear question>" \
    --option "<label 1>" --option "<label 2>" \
    [--option "<label 3>" ...] [--multiple]
  ```

  Identity comes from `STELOW_THREAD_ID` (fallback `BB_THREAD_ID`) — never
  a provider session id, a directory hash, or any other id, and never via
  a `--thread` flag (explicit ids get copied wrong).

  Repeat `--question` groups (each with its own `--option` labels) in ONE
  call to ask several independent questions together — see the batching
  rule in `stelow-workflow-orchestrator/stages/ask-patterns.md`
  (Usage Rules). Ask dependent questions one at a time.

  `stelow ask` writes `ask/pending.json` in the state dir and blocks until
  the host records `ask/answer.json` or the timeout lapses. The host
  fulfills with its own UI (or by watching the directory) and the workflow
  stays answerable after timeouts. Never substitute
  prose like "waiting for your choice" — that is the pattern that breaks the
  question flow.
