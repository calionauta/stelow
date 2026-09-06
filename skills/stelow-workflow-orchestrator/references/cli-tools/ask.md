# ask_user_question

Use the canonical `ask_user_question` tool for human input. Hosts may map this
name to their native interaction API:

| Host | Mapping |
|------|---------|
| Fusion | `fn_ask_question` |
| bb via `bb-plugin-stelow` | `bb stelow ask ...` |

Do not invoke a host-specific command directly from a skill — resolve by a
leading convention instead:

- If the `ask_user_question` tool is registered on this session, call it
  directly.
- Otherwise, if running inside **bb** with the `bb-plugin-stelow` board
  **and** the worker thread was spawned from a Stelow card, use the bb CLI
  form:

  ```bash
  bb stelow ask --thread <your-worker-thread-id> \
    --question "<single clear question>" \
    --option "<label 1>" --option "<label 2>" \
    [--option "<label 3>" ...] [--multiple]
  ```

  Pass the id of THIS worker session — never a provider session id, a directory hash, or any other id.

  Repeat `--question` groups (each with its own `--option` labels) in ONE
  call to ask several independent questions together — see the batching
  rule in `stelow-workflow-orchestrator/stages/ask-patterns.md`
  (Usage Rules). Ask dependent questions one at a time.

  `bb stelow ask` renders into bb's structured form (`stelow-question`
  renderer) and blocks until the user submits or cancels. In the plugin, the
  card stays in its column and signals it is waiting for an answer while
  the question is open. Never substitute
  prose like "waiting for your choice" — that is the pattern that breaks the
  card's question flow.
