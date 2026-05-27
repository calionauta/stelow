/**
 * Pi UI Adapter
 * 
 * UI adapter implementation for Pi coding agent.
 * Uses Pi's native ExtensionAPI for TUI components.
 */
// @ts-nocheck


//  - Optional peer dependency for Pi environment
import type { ExtensionContext, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  Container, Text, Spacer, SelectList, matchesKey, Key,
  type SelectItem
//  - Optional peer dependency for Pi environment
} from "@earendil-works/pi-tui";
import type { CLI } from "../../types";
import type { NotificationType, SelectOption, StatusInfo } from "../cli-adapter";
import {
  UIAdapter,
  formatAnsiNotification,
} from "../ui-adapter";

// ── State ────────────────────────────────────────────────────────────

let _ctx: ExtensionContext | null = null;
let _statusLine = "";

export function setPiContext(ctx: ExtensionContext): void {
  _ctx = ctx;
}

// ── Pi UI Adapter ────────────────────────────────────────────────────

export class PiUIAdapter implements UIAdapter {
  readonly cliName: CLI = "pi";
  
  private get ctx(): ExtensionContext | null {
    return _ctx;
  }
  
  // ── Notifications ─────────────────────────────────────────────────
  
  notify(message: string, type: NotificationType = "info"): void {
    if (!this.ctx?.ui?.notify) {
      // Fallback to console
      console.log(formatAnsiNotification(message, type));
      return;
    }
    
    // Map to Pi notification type
    const piType = type === "error" ? "error" : "info";
    this.ctx.ui.notify(message, piType as "info" | "error");
  }
  
  // ── Select Lists ──────────────────────────────────────────────────
  
  async select(options: SelectOption[], title?: string): Promise<string | null> {
    if (!this.ctx?.ui?.custom) {
      // Fallback: return first option
      console.warn("[PiUI] Select list not available, returning first option");
      return options[0]?.value || null;
    }
    
    const items: SelectItem[] = options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      description: opt.description,
    }));
    
    return new Promise<string | null>((resolve) => {
      this.ctx!.ui!.custom<string | null>(
        (_tui: any, theme: any, _kb: any, done: (result: string | null) => void) => {
          const c = new Container();
          
          if (title) {
            c.addChild(new Text(theme.fg("accent", theme.bold(`◆ ${title}`)), 1, 0));
            c.addChild(new Spacer(1));
          }
          
          const sl = new SelectList(items, Math.min(items.length + 2, 12), {
            selectedPrefix: (t: string) => theme.fg("accent", t),
            selectedText: (t: string) => theme.fg("accent", t),
            description: (t: string) => theme.fg("muted", t),
            scrollInfo: (t: string) => theme.fg("dim", t),
            noMatch: (t: string) => theme.fg("warning", t),
          });
          sl.onSelect = (item: any) => done(item.value);
          sl.onCancel = () => done(null);
          c.addChild(sl);
          c.addChild(new Spacer(1));
          c.addChild(new Text(
            theme.fg("dim", "↑↓ navigate  Enter:select  Esc:cancel"), 1, 0
          ));
          
          return {
            render: (w: number) => c.render(w),
            invalidate: () => c.invalidate(),
            handleInput: (data: string) => {
              sl.handleInput(data);
              if (data === "q" || matchesKey(data, Key.escape)) done(null);
            },
          };
        },
        {
          overlay: true,
          overlayOptions: { width: "50%", minWidth: 44, maxHeight: "70%", anchor: "center" },
        }
      ).then((result: any) => resolve(result ?? null));
    });
  }
  
  // ── Status Line ──────────────────────────────────────────────────
  
  setStatus(info: StatusInfo): void {
    if (!this.ctx?.ui) return;
    
    _statusLine = info.text;
    
    // Build compact status string
    const text = info.text || "";
    
    // Use custom status if available
    if (typeof this.ctx.ui.setStatus === "function") {
      this.ctx.ui.setStatus("workflow", text);
    }
  }
  
  clearStatus(): void {
    if (!this.ctx?.ui) return;
    
    _statusLine = "";
    
    if (typeof this.ctx.ui.setStatus === "function") {
      this.ctx.ui.setStatus("workflow", undefined);
    }
  }
  
  // ── Fallback Detection ───────────────────────────────────────────
  
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent" {
    if (this.ctx?.ui?.custom) return "native";
    return "plain";
  }
}

// ── Singleton Instance ───────────────────────────────────────────────

let _instance: PiUIAdapter | null = null;

export function createPiUIAdapter(): PiUIAdapter {
  if (!_instance) {
    _instance = new PiUIAdapter();
  }
  return _instance;
}

export function getPiUIAdapter(): PiUIAdapter | null {
  return _instance;
}