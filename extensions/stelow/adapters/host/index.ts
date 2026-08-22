/**
 * Host Adapter — public exports.
 *
 * This module is the seam between the stelow orchestrator and external
 * human-in-the-loop hosts (Multica today; Slack / Linear / Notion tomorrow).
 *
 *   stelow orchestrator
 *        │
 *        │  createHostAdapter(projectRoot)  → DecisionGateway
 *        ▼
 *   DecisionGateway (this module)
 *        │
 *        ├── MulticaAdapter (default; CLI `multica`)
 *        ├── SlackAdapter (future)
 *        ├── LinearAdapter (future)
 *        └── NotionAdapter (future)
 *
 * See `docs/design/host-adapter-multica.md` for the architecture and
 * decision rationale.
 */

export type {
  DecisionRequest,
  DecisionResult,
  DecisionKind,
  DecisionOutcome,
  DecisionGateway,
  Question,
  Option,
  PendingDecision,
} from "./types";

export { BaseHostAdapter } from "./base-adapter";
export { MulticaAdapter, interpretMemberReply, interpretQuestionReply } from "./multica-adapter";
export { parseNumberedReply } from "./numbered-parser";
export {
  loadWorkgroupConfig,
  resolveReviewer,
  WorkgroupConfigError,
} from "./config";
export type { WorkgroupConfig, ReviewerRef } from "./config";
export { createHostAdapter, HostAdapterError } from "./host-factory";