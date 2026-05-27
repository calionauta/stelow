// @ts-nocheck
import * as esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

await esbuild.build({
  entryPoints: ["src/index.ts", "src/tui.tsx"],
  bundle: true,
  outdir: "dist",
  format: "esm",
  platform: "node",
  target: "node22",
  plugins: [solidPlugin()],
  external: ["@opencode-ai/plugin", "@opentui/core", "@opentui/solid"],
  sourcemap: true,
  minify: false,
});

console.log("Build complete!");