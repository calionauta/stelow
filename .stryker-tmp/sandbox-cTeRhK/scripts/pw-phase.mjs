#!/usr/bin/env node
// @ts-nocheck
/**
 * pw-phase - Update workflow phase in tracking.json
 * 
 * Usage:
 *   pw-phase get                    - Get current phase
 *   pw-phase set <phase>           - Set phase (0-indexed)
 *   pw-phase next                  - Advance to next phase
 *   pw-phase reset                 - Reset to phase 0
 * 
 * Example:
 *   pw-phase set 3                 - Set to phase 4 (0-indexed: 3)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const WORKFLOW_DIR = ".cali-product-workflow";
const TRACKING_FILE = "cali-product-workflow.json";

function getCwd() {
  return cwd();
}

function findTrackingFile(cwd) {
  const path = join(cwd, WORKFLOW_DIR, TRACKING_FILE);
  try {
    readFileSync(path);
    return path;
  } catch {
    return null;
  }
}

function getCurrentPhase(tracking) {
  const active = tracking.workflows?.find(w => w.status === "in-progress");
  return active?.currentPhase ?? 0;
}

function setPhase(tracking, phase) {
  const idx = tracking.workflows?.findIndex(w => w.status === "in-progress");
  if (idx === -1 || idx === undefined) {
    console.error("No active workflow found");
    process.exit(1);
  }
  
  tracking.workflows[idx].currentPhase = phase;
  tracking.workflows[idx].phases?.forEach((p, i) => {
    p.status = i < phase ? "completed" : i === phase ? "in-progress" : "pending";
  });
  tracking.updated = new Date().toISOString();
  
  return tracking;
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  const cwd = getCwd();
  const trackingPath = findTrackingFile(cwd);
  
  if (!trackingPath) {
    console.error(`Not in a workflow directory. No ${WORKFLOW_DIR}/${TRACKING_FILE} found.`);
    process.exit(1);
  }
  
  const tracking = JSON.parse(readFileSync(trackingPath, "utf8"));
  
  switch (cmd) {
    case "get": {
      const phase = getCurrentPhase(tracking);
      console.log(phase);
      break;
    }
    
    case "set": {
      const phase = parseInt(args[1], 10);
      if (isNaN(phase) || phase < 0) {
        console.error("Usage: pw-phase set <phase> (0-indexed)");
        process.exit(1);
      }
      const updated = setPhase(tracking, phase);
      writeFileSync(trackingPath, JSON.stringify(updated, null, 2));
      console.log(`Phase set to ${phase}`);
      break;
    }
    
    case "next": {
      const current = getCurrentPhase(tracking);
      const updated = setPhase(tracking, current + 1);
      writeFileSync(trackingPath, JSON.stringify(updated, null, 2));
      console.log(`Phase advanced to ${current + 1}`);
      break;
    }
    
    case "reset": {
      const updated = setPhase(tracking, 0);
      writeFileSync(trackingPath, JSON.stringify(updated, null, 2));
      console.log("Phase reset to 0");
      break;
    }
    
    case "info": {
      const active = tracking.workflows?.find(w => w.status === "in-progress");
      if (!active) {
        console.log("No active workflow");
        break;
      }
      console.log(JSON.stringify({
        name: active.name,
        currentPhase: active.currentPhase,
        phases: active.phases?.map(p => p.name),
        status: active.status
      }, null, 2));
      break;
    }
    
    default:
      console.log(`pw-phase - Update workflow phase

Usage:
  pw-phase get                    Get current phase (0-indexed)
  pw-phase set <phase>           Set phase (0-indexed)
  pw-phase next                   Advance to next phase
  pw-phase reset                  Reset to phase 0
  pw-phase info                   Show workflow info
`);
      process.exit(0);
  }
}

main();
