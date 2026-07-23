// Pi-native visual_review implementation. The canonical tool is
// visual_review; Pi maps it to the existing Plannotator executable.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

export function registerPlannotatorTool(pi: unknown): void {
  const api = pi as { registerTool?: (definition: unknown) => void };
  if (typeof api.registerTool !== "function") return;
  api.registerTool({
    name: "plannotator",
    label: "Visual review",
    description: "Review a markdown file with the Pi visual review implementation.",
    parameters: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] },
    async execute(_id: string, params: { filePath?: string }, _signal: unknown, _update: unknown, ctx: { cwd: string }) {
      const filePath = params.filePath?.trim();
      if (!filePath) return { content: [{ type: "text", text: "filePath is required" }], details: { decision: "error" } };
      const fullPath = join(ctx.cwd, filePath);
      if (!existsSync(fullPath)) return { content: [{ type: "text", text: `File not found: ${filePath}` }], details: { decision: "error" } };
      const result = spawnSync("plannotator", ["annotate", fullPath, "--gate", "--json"], { cwd: ctx.cwd, encoding: "utf8" });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      const decision = output.includes('"decision":"approved"') ? "approved" : output.includes('"decision":"dismissed"') ? "dismissed" : "annotated";
      if (decision === "approved") {
        const dirHash = "default";
        const dir = join(ctx.cwd, ".stelow", "approvals", dirHash);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${basename(filePath)}.approved.md`), `approved: true\napproved_at: ${new Date().toISOString()}\napproved_via: plannotator\nsource_file: ${filePath}\n`);
      }
      return { content: [{ type: "text", text: JSON.stringify({ decision }) }], details: { decision } };
    },
  });
}
