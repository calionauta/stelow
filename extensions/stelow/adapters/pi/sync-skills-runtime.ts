import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { getRetiredSkillNames } from "../../sync-skills";

export function syncPiSkillsFromClone() {
    try {
      const HOME = homedir();
      const GIT_DIR = join(HOME, ".pi/agent/git/github.com/calionauta/stelow");
      const MARKER = join(HOME, ".agents/skills/.stelow-skill-sync-hash");

      // Fast path: compare git HEAD hash
      const currentHash = execSync(
        "git rev-parse HEAD",
        { cwd: GIT_DIR, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      ).trim();
      if (!currentHash) return 0;
      const lastHash = existsSync(MARKER)
        ? readFileSync(MARKER, "utf8").trim()
        : "";
      if (currentHash === lastHash) return 0;

      const cloneSkillsDir = join(GIT_DIR, "skills");
      if (!existsSync(cloneSkillsDir)) return 0;

      const agentsDir = join(HOME, ".agents/skills");
      mkdirSync(agentsDir, { recursive: true });

      // 1. Collect project skills (directories with SKILL.md)
      const projectSkills = new Set<string>();
      for (const entry of readdirSync(cloneSkillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillDir = join(cloneSkillsDir, entry.name);
        if (existsSync(join(skillDir, "SKILL.md"))) {
          projectSkills.add(entry.name);
        }
      }

      if (projectSkills.size === 0) return 0;

      // 2. Sync each project skill (rm -rf + cp -r = exact mirror)
      for (const skill of projectSkills) {
        rmSync(join(agentsDir, skill), { recursive: true, force: true });
        cpSync(join(cloneSkillsDir, skill), join(agentsDir, skill), { recursive: true });
      }

      // 3. Sync cli-tools from orchestrator to each installed skill.
      //    cli-tools are gitignored in sub-skills (single source of truth:
      //    stelow-product-orchestrator/references/cli-tools/). We regenerate
      //    them here so each skill is self-contained in ~/.agents/skills/.
      const orchCliTools = join(cloneSkillsDir, "stelow-product-orchestrator/references/cli-tools");
      if (existsSync(orchCliTools)) {
        for (const skill of projectSkills) {
          if (skill === "stelow-product-orchestrator") continue;
          const target = join(agentsDir, skill, "references/cli-tools");
          mkdirSync(target, { recursive: true });
          for (const file of readdirSync(orchCliTools)) {
            if (file.endsWith(".md")) {
              cpSync(join(orchCliTools, file), join(target, file));
            }
          }
        }
      }

      // 4. Remove only skills explicitly retired in retired-skills.yaml.
      //    The project's `skills/` directory IS the source of truth for
      //    which skills belong here. We never delete skills managed by
      //    other tools (agent-sync, etc). Only skills listed in
      //    retired-skills.yaml are removed — they were intentionally
      //    deleted/renamed from the project and stale copies should go.
      const retiredNames = getRetiredSkillNames(GIT_DIR);
      if (retiredNames.size > 0 && existsSync(agentsDir)) {
        for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          if (retiredNames.has(entry.name)) {
            rmSync(join(agentsDir, entry.name), { recursive: true, force: true });
          }
        }
      }

      // 5. Write marker hash
      writeFileSync(MARKER, currentHash);

      return projectSkills.size;
    } catch {
      return 0;
    }
  }


