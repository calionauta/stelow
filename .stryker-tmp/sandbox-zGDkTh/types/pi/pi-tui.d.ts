/**
 * Stub type declarations for @earendil-works/pi-tui
 * 
 * These are stub types since the package is an optional peer dependency.
 * Users who install the package for Pi will have the real types installed.
 */
// @ts-nocheck


// TUI Components
export class Container {
  addChild(child: Component): void;
  render(width: number): string;
  invalidate(): void;
}

export class Text {
  constructor(text: string, width?: number, height?: number);
}

export class Spacer {
  constructor(size?: number);
}

export class SelectList {
  constructor(items: SelectItem[], maxVisible?: number, options?: SelectListOptions);
  onSelect?: (item: SelectItem) => void;
  onCancel?: () => void;
  handleInput(data: string): void;
}

export interface SelectItem {
  label: string;
  description?: string;
  value: string;
}

export interface SelectListOptions {
  selectedPrefix?: (text: string) => string;
  selectedText?: (text: string) => string;
  description?: (text: string) => string;
  scrollInfo?: (text: string) => string;
  noMatch?: (text: string) => string;
}

export function matchesKey(input: string, key: Key): boolean;

export class Key {
  static escape: Key;
  static enter: Key;
  static arrowUp: Key;
  static arrowDown: Key;
}

// UI options
export interface CustomOptions {
  overlay?: boolean;
  overlayOptions?: OverlayOptions;
}

export interface OverlayOptions {
  width?: string | number;
  minWidth?: number;
  maxHeight?: string | number;
  anchor?: string;
}

export interface Theme {
  fg(color: string, text: string): string;
  bold(text: string): string;
}

// UI interface
export interface UI {
  notify(message: string, type: 'info' | 'error'): void;
  custom<T>(render: CustomRenderFn<T>, options?: CustomOptions): Promise<T | null>;
}

// Component interface
export interface Component {
  render(width: number): string;
  invalidate(): void;
  handleInput?(data: string): void;
}

export type CustomRenderFn<T> = (
  tui: any,
  theme: Theme,
  keyboard: any,
  done: (result: T | null) => void
) => Component;