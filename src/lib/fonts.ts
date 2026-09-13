// Web-safe font stacks — no webfont loading, no external requests. Every
// stack resolves on macOS/Windows/Linux using system fonts, so the canvas,
// exported SVG, and CSS exports render identically without licensing
// concerns.

export interface FontDef {
  id: string;
  label: string;
  /** CSS font-family list (used in SVG/CSS export). */
  stack: string;
  /** Compact family list for canvas font strings. */
  canvasFamilies: string;
  category: "Serif" | "Sans" | "Mono" | "Display";
  note: string;
}

export const FONTS: FontDef[] = [
  {
    id: "sans",
    label: "System Sans (Inter-like)",
    stack: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    canvasFamilies: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    category: "Sans",
    note: "Current default",
  },
  {
    id: "helvetica",
    label: "Helvetica / Arial",
    stack: "Helvetica, Arial, sans-serif",
    canvasFamilies: "Helvetica, Arial, sans-serif",
    category: "Sans",
    note: "Classic grotesque",
  },
  {
    id: "geometric",
    label: "Avenir / Futura",
    stack: "Avenir, 'Futura PT', Futura, 'Century Gothic', sans-serif",
    canvasFamilies: "Avenir, Futura, 'Century Gothic', sans-serif",
    category: "Sans",
    note: "Geometric sans",
  },
  {
    id: "humanist",
    label: "Optima / Candara",
    stack: "Optima, Candara, 'Segoe UI', sans-serif",
    canvasFamilies: "Optima, Candara, 'Segoe UI', sans-serif",
    category: "Sans",
    note: "Humanist sans",
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: "Georgia, 'Times New Roman', serif",
    canvasFamilies: "Georgia, 'Times New Roman', serif",
    category: "Serif",
    note: "Screen serif",
  },
  {
    id: "garamond",
    label: "Garamond / EB Garamond",
    stack: "'EB Garamond', Garamond, 'Apple Garamond', Georgia, serif",
    canvasFamilies: "'EB Garamond', Garamond, Georgia, serif",
    category: "Serif",
    note: "Old-style serif",
  },
  {
    id: "times",
    label: "Times / Liberation Serif",
    stack: "'Times New Roman', Times, 'Liberation Serif', serif",
    canvasFamilies: "'Times New Roman', Times, 'Liberation Serif', serif",
    category: "Serif",
    note: "Editorial serif",
  },
  {
    id: "mono",
    label: "SF Mono / Consolas",
    stack: "'SF Mono', 'Cascadia Code', Consolas, Menlo, monospace",
    canvasFamilies: "'SF Mono', 'Cascadia Code', Consolas, Menlo, monospace",
    category: "Mono",
    note: "Code & specs",
  },
  {
    id: "courier",
    label: "Courier Prime / Courier",
    stack: "'Courier Prime', 'Courier New', Courier, monospace",
    canvasFamilies: "'Courier Prime', 'Courier New', Courier, monospace",
    category: "Mono",
    note: "Typewriter",
  },
  {
    id: "impact",
    label: "Impact / Haettenschweiler",
    stack: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    canvasFamilies: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    category: "Display",
    note: "Display headers",
  },
];

export const FONT_IDS = FONTS.map((f) => f.id);

export function getFont(id: string | undefined): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
