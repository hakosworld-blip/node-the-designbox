/**
 * Node asset library — premade backgrounds, icons, shapes, UI elements, and
 * text styles that can be inserted into any design file.
 *
 * Every item is composed purely from renderer-supported primitives
 * (frame, rect, ellipse, line, arrow, polygon, text), so items render
 * correctly on canvas, in thumbnails, and in exports. `build()` returns
 * fresh nodes with new ids positioned around a local origin — the caller
 * offsets them to the drop point and groups them.
 *
 * Item counts: 24 backgrounds, 40 icons, 16 shapes, 24 UI, 10 text = 114.
 */

import { uid, type DesignDoc, type DesignNode, type NodeType } from "./geo";
import { COMPONENT_PRESETS } from "./componentPresets";

export type LibraryCategory =
  | "Backgrounds"
  | "Icons"
  | "Shapes"
  | "UI"
  | "Text";

export interface LibraryItem {
  id: string;
  name: string;
  category: LibraryCategory;
  keywords: string[];
  build: () => DesignNode[];
}

/* ---------- node factories ---------- */

const INK = "#e4e4e7";
const DARK = "#1c1c22";

function n(spec: Partial<DesignNode> & { type: NodeType }): DesignNode {
  const t = spec.type;
  return {
    id: uid(t[0]),
    name:
      spec.name ??
      (t === "rect"
        ? "Rectangle"
        : t === "ellipse"
          ? "Ellipse"
          : t === "text"
            ? "Text"
            : t === "line"
              ? "Line"
              : t === "arrow"
                ? "Arrow"
                : t === "polygon"
                  ? "Polygon"
                  : "Frame"),
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    fill: t === "text" ? null : "#8b5cf6",
    stroke: null,
    strokeWidth: 0,
    radius: 0,
    opacity: 1,
    ...spec,
  } as DesignNode;
}

/** Line from (x,y) to (x2,y2). */
const ln = (
  x: number,
  y: number,
  x2: number,
  y2: number,
  sw = 3,
  color = INK,
): DesignNode =>
  n({
    type: "line",
    name: "Line",
    x,
    y,
    w: x2 - x,
    h: y2 - y,
    stroke: color,
    strokeWidth: sw,
  });

const el = (
  x: number,
  y: number,
  w: number,
  h: number,
  style: { fill?: string | null; sw?: number } = {},
): DesignNode =>
  n({
    type: "ellipse",
    name: "Ellipse",
    x,
    y,
    w,
    h,
    fill: style.fill !== undefined ? style.fill : null,
    stroke: style.fill === undefined ? INK : null,
    strokeWidth: style.fill === undefined ? (style.sw ?? 3) : 0,
  });

const rc = (
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0,
  fill: string | null = INK,
  sw = 0,
): DesignNode =>
  n({
    type: "rect",
    name: "Rectangle",
    x,
    y,
    w,
    h,
    radius: r,
    fill,
    stroke: fill === null ? INK : null,
    strokeWidth: fill === null ? sw || 3 : sw,
  });

const pg = (
  x: number,
  y: number,
  w: number,
  h: number,
  sides: number,
  rot = 0,
  fill: string | null = INK,
): DesignNode =>
  n({
    type: "polygon",
    name: "Polygon",
    x,
    y,
    w,
    h,
    points: sides,
    rotation: rot,
    fill,
    stroke: fill === null ? INK : null,
    strokeWidth: fill === null ? 3 : 0,
  });

const tx = (
  text: string,
  x: number,
  y: number,
  size: number,
  weight = 500,
  color = "#f4f4f5",
  w = 300,
  align: "left" | "center" | "right" = "left",
): DesignNode =>
  n({
    type: "text",
    name: text.slice(0, 18),
    text,
    x,
    y,
    w,
    h: Math.round(size * 1.4),
    fontSize: size,
    fontWeight: weight,
    color,
    align,
  });

/* ---------- backgrounds ---------- */

let bgN = 0;
const gradBg = (
  name: string,
  from: string,
  to: string,
  angle: number,
  kw: string[],
): LibraryItem => {
  const i = ++bgN;
  return {
    id: `bg-grad-${i}`,
    name,
    category: "Backgrounds",
    keywords: ["gradient", ...kw],
    build: () => [
      n({
        type: "rect",
        name: `${name} background`,
        w: 800,
        h: 500,
        radius: 24,
        gradient: { from, to, angle },
      }),
    ],
  };
};

const GRADS: [string, string, string, number, string[]][] = [
  ["Aurora", "#7c3aed", "#22d3ee", 135, ["purple", "cyan", "vibrant"]],
  ["Sunset", "#e879f9", "#fbbf24", 160, ["orange", "pink", "warm"]],
  ["Ocean", "#06b6d4", "#3b82f6", 135, ["blue", "sea", "cool"]],
  ["Ember", "#f97316", "#f43f5e", 140, ["red", "fire", "hot"]],
  ["Mint", "#10b981", "#22d3ee", 120, ["green", "fresh"]],
  ["Grape", "#8b5cf6", "#d946ef", 120, ["purple", "magenta"]],
  ["Steel", "#52525b", "#18181b", 135, ["gray", "metal", "dark"]],
  ["Blush", "#f9a8d4", "#fdba74", 135, ["pink", "peach", "soft"]],
  ["Neon night", "#4f46e5", "#09090b", 180, ["indigo", "black", "dark"]],
  ["Forest", "#16a34a", "#0d9488", 135, ["green", "nature"]],
  ["Dune", "#fbbf24", "#ea580c", 160, ["sand", "desert", "warm"]],
  ["Arctic", "#38bdf8", "#6366f1", 135, ["ice", "blue", "cold"]],
  ["Candy", "#f472b6", "#a78bfa", 45, ["pink", "playful"]],
  ["Midnight", "#0b0b10", "#312e81", 200, ["black", "navy", "dark"]],
];

const SOLIDS: [string, string, string[]][] = [
  ["Paper", "#f5f2ea", ["white", "light", "cream"]],
  ["Charcoal", "#1c1c22", ["black", "dark"]],
  ["Ink navy", "#0f172a", ["blue", "dark"]],
  ["Warm gray", "#a8a29e", ["stone", "neutral"]],
];

function patternBgs(): LibraryItem[] {
  const items: LibraryItem[] = [];

  // Grid lines
  items.push({
    id: "bg-grid",
    name: "Grid lines",
    category: "Backgrounds",
    keywords: ["grid", "lines", "blueprint", "pattern"],
    build: () => {
      const nodes: DesignNode[] = [
        n({ type: "rect", name: "Base", w: 800, h: 500, fill: "#101014", radius: 24 }),
      ];
      for (let i = 1; i < 8; i++)
        nodes.push(ln(i * 100, 0, i * 100, 500, 1, "#3f3f46"));
      for (let j = 1; j < 5; j++)
        nodes.push(ln(0, j * 100, 800, j * 100, 1, "#3f3f46"));
      return nodes;
    },
  });

  // Dot field
  items.push({
    id: "bg-dots",
    name: "Dot field",
    category: "Backgrounds",
    keywords: ["dots", "polka", "pattern"],
    build: () => {
      const nodes: DesignNode[] = [
        n({ type: "rect", name: "Base", w: 800, h: 500, fill: "#141419", radius: 24 }),
      ];
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 5; j++)
          nodes.push(el(70 + i * 95, 70 + j * 95, 14, 14, { fill: "#52525b" }));
      return nodes;
    },
  });

  // Diagonal stripes
  items.push({
    id: "bg-stripes",
    name: "Diagonal stripes",
    category: "Backgrounds",
    keywords: ["stripes", "diagonal", "pattern"],
    build: () => {
      const nodes: DesignNode[] = [
        n({ type: "rect", name: "Base", w: 800, h: 500, fill: "#17171d", radius: 24 }),
      ];
      for (let i = -2; i < 8; i++)
        nodes.push(
          n({
            type: "rect",
            name: "Stripe",
            x: i * 140,
            y: -100,
            w: 44,
            h: 900,
            rotation: 24,
            fill: "#27272a",
          }),
        );
      return nodes;
    },
  });

  // Spotlight
  items.push({
    id: "bg-spotlight",
    name: "Spotlight",
    category: "Backgrounds",
    keywords: ["glow", "light", "radial", "dark"],
    build: () => [
      n({ type: "rect", name: "Base", w: 800, h: 500, fill: "#0b0b10", radius: 24 }),
      el(200, -60, 400, 400, { fill: "#8b5cf6" }),
      el(240, -20, 320, 320, { fill: "#0b0b10" }),
      n({ type: "rect", name: "Fade", w: 800, h: 500, radius: 24, opacity: 0.25, gradient: { from: "#8b5cf6", to: "#0b0b10", angle: 180 } }),
    ],
  });

  // Horizon bands
  items.push({
    id: "bg-bands",
    name: "Horizon bands",
    category: "Backgrounds",
    keywords: ["bands", "stripes", "sunset", "retro"],
    build: () => {
      const colors = ["#f97316", "#fb923c", "#fbbf24", "#fde047", "#f4f4f5"];
      const nodes: DesignNode[] = [
        n({ type: "rect", name: "Sky", w: 800, h: 500, radius: 24, gradient: { from: "#312e81", to: "#7c3aed", angle: 180 } }),
      ];
      colors.forEach((c, i) =>
        nodes.push(rc(0, 300 + i * 40, 800, 40, 0, c)),
      );
      return nodes;
    },
  });

  // Corner glow
  items.push({
    id: "bg-corner-glow",
    name: "Corner glow",
    category: "Backgrounds",
    keywords: ["glow", "corner", "gradient", "dark"],
    build: () => [
      n({ type: "rect", name: "Base", w: 800, h: 500, radius: 24, fill: "#0c0c11" }),
      el(420, 160, 520, 520, { fill: "#22d3ee" }),
      el(520, 260, 320, 320, { fill: "#0c0c11" }),
    ],
  });

  return items;
}

const backgrounds: LibraryItem[] = [
  ...GRADS.map(([name, from, to, angle, kw]) =>
    gradBg(name, from, to, angle, kw),
  ),
  ...SOLIDS.map(([name, color, kw]) => ({
    id: `bg-solid-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name: `${name} solid`,
    category: "Backgrounds" as const,
    keywords: ["solid", "plain", ...kw],
    build: () => [
      n({ type: "rect", name: `${name} background`, w: 800, h: 500, radius: 24, fill: color }),
    ],
  })),
  ...patternBgs(),
];

/* ---------- icons (48×48 box) ---------- */

const icon = (
  slug: string,
  name: string,
  kw: string[],
  parts: DesignNode[],
): LibraryItem => ({
  id: `ic-${slug}`,
  name: `${name} icon`,
  category: "Icons",
  keywords: ["icon", ...kw],
  // Regenerate ids on every build: the parts array is shared module state,
  // and inserting the same icon twice must never collide ids on canvas.
  build: () =>
    parts.map((p) => ({
      ...p,
      id: uid(p.type[0]),
      name: p.name === "Node" ? name : p.name,
    })),
});

const icons: LibraryItem[] = [
  icon("search", "Search", ["find", "magnifier", "zoom"], [
    el(8, 8, 22, 22),
    ln(26, 26, 40, 40, 4),
  ]),
  icon("plus", "Plus", ["add", "new", "create"], [
    ln(24, 10, 24, 38, 4),
    ln(10, 24, 38, 24, 4),
  ]),
  icon("minus", "Minus", ["remove", "subtract"], [ln(10, 24, 38, 24, 4)]),
  icon("close", "Close", ["x", "cancel", "delete"], [
    ln(12, 12, 36, 36, 4),
    ln(36, 12, 12, 36, 4),
  ]),
  icon("check", "Check", ["done", "tick", "complete"], [
    ln(10, 26, 20, 36, 4),
    ln(20, 36, 40, 14, 4),
  ]),
  icon("chevron-right", "Chevron right", ["arrow", "next"], [
    ln(16, 10, 32, 24, 4),
    ln(32, 24, 16, 38, 4),
  ]),
  icon("arrow-right", "Arrow right", ["forward", "next"], [
    n({ type: "arrow", name: "Arrow", x: 6, y: 24, w: 30, h: 0, stroke: INK, strokeWidth: 3 }),
  ]),
  icon("clock", "Clock", ["time", "watch"], [
    el(6, 6, 36, 36, { sw: 3 }),
    ln(24, 14, 24, 26, 3),
    ln(24, 24, 32, 30, 3),
  ]),
  icon("calendar", "Calendar", ["date", "schedule"], [
    rc(6, 10, 36, 32, 4, null, 3),
    ln(6, 20, 42, 20, 3),
    ln(16, 6, 16, 14, 3),
    ln(32, 6, 32, 14, 3),
  ]),
  icon("mail", "Mail", ["email", "message", "envelope"], [
    rc(6, 12, 36, 26, 4, null, 3),
    ln(8, 15, 24, 28, 3),
    ln(24, 28, 40, 15, 3),
  ]),
  icon("bell", "Bell", ["notification", "alert", "ring"], [
    el(13, 8, 22, 22, { sw: 3 }),
    rc(9, 28, 30, 5, 2),
    el(21, 35, 6, 6, { fill: INK }),
  ]),
  icon("user", "User", ["person", "account", "profile"], [
    el(16, 6, 16, 16, { sw: 3 }),
    rc(8, 30, 32, 14, 7, null, 3),
  ]),
  icon("lock", "Lock", ["secure", "password", "private"], [
    el(15, 6, 18, 20, { sw: 3 }),
    rc(10, 22, 28, 20, 4),
  ]),
  icon("home", "Home", ["house", "main"], [
    pg(6, 6, 36, 20, 3),
    rc(12, 22, 24, 20, 2),
  ]),
  icon("folder", "Folder", ["directory", "files"], [
    rc(6, 10, 16, 10, 2),
    rc(6, 14, 36, 24, 4),
  ]),
  icon("image", "Image", ["picture", "photo"], [
    rc(6, 8, 36, 32, 4, null, 3),
    el(13, 13, 8, 8, { fill: INK }),
    pg(9, 24, 20, 14, 3),
    pg(21, 28, 18, 10, 3),
  ]),
  icon("camera", "Camera", ["photo", "shoot"], [
    rc(18, 8, 12, 8, 2),
    rc(6, 14, 36, 24, 4),
    el(20, 20, 8, 8, { fill: DARK }),
  ]),
  icon("chat", "Chat", ["comment", "bubble", "talk"], [
    rc(6, 8, 36, 26, 8),
    pg(10, 30, 14, 14, 3, 180),
  ]),
  icon("heart", "Heart", ["love", "like", "favorite"], [
    n({ type: "rect", name: "Heart body", x: 12, y: 12, w: 24, h: 24, rotation: 45, fill: INK }),
    el(10, 8, 15, 15, { fill: INK }),
    el(23, 8, 15, 15, { fill: INK }),
  ]),
  icon("star", "Star", ["favorite", "rate", "rank"], [pg(4, 5, 40, 38, 5)]),
  icon("hexagon", "Hexagon", ["shape", "six"], [pg(5, 8, 38, 32, 6)]),
  icon("diamond", "Diamond", ["shape", "gem"], [pg(7, 7, 34, 34, 4)]),
  icon("triangle", "Triangle", ["shape", "three"], [pg(7, 10, 34, 30, 3)]),
  icon("play", "Play", ["start", "video", "media"], [pg(10, 8, 30, 32, 3, 90)]),
  icon("pause", "Pause", ["stop", "media"], [
    rc(13, 10, 8, 28, 2),
    rc(27, 10, 8, 28, 2),
  ]),
  icon("sun", "Sun", ["light", "day", "bright"], [
    el(15, 15, 18, 18, { fill: INK }),
    ln(24, 4, 24, 10, 3), ln(24, 38, 24, 44, 3),
    ln(4, 24, 10, 24, 3), ln(38, 24, 44, 24, 3),
    ln(10, 10, 14, 14, 3), ln(38, 10, 34, 14, 3),
    ln(10, 38, 14, 34, 3), ln(38, 38, 34, 34, 3),
  ]),
  icon("night", "Night", ["moon", "stars", "dark"], [
    el(11, 11, 26, 26, { fill: INK }),
    ln(36, 8, 42, 8, 2), ln(39, 5, 39, 11, 2),
    ln(34, 24, 40, 24, 2), ln(37, 21, 37, 27, 2),
    ln(34, 38, 40, 38, 2), ln(37, 35, 37, 41, 2),
  ]),
  icon("cloud", "Cloud", ["weather", "storage"], [
    el(8, 20, 20, 14, { fill: INK }),
    el(17, 11, 21, 19, { fill: INK }),
    el(27, 20, 16, 12, { fill: INK }),
    rc(10, 24, 28, 8, 4),
  ]),
  icon("eye", "Eye", ["view", "visible", "preview"], [
    el(6, 14, 36, 20, { sw: 3 }),
    el(18, 17, 12, 14, { fill: INK }),
  ]),
  icon("pin", "Pin", ["location", "map", "place"], [
    el(12, 6, 20, 20, { fill: INK }),
    el(19, 13, 6, 6, { fill: DARK }),
    ln(22, 26, 22, 42, 4),
  ]),
  icon("bookmark", "Bookmark", ["save", "ribbon"], [
    rc(13, 6, 22, 30, 3),
    pg(13, 28, 22, 16, 3, 180),
  ]),
  icon("flag", "Flag", ["report", "mark"], [
    ln(12, 6, 12, 42, 4),
    rc(14, 8, 26, 16, 2),
  ]),
  icon("trash", "Trash", ["delete", "remove", "bin"], [
    rc(10, 14, 28, 28, 3, null, 3),
    rc(8, 8, 32, 5, 2),
    ln(19, 5, 29, 5, 3),
    ln(18, 20, 18, 36, 2),
    ln(30, 20, 30, 36, 2),
  ]),
  icon("download", "Download", ["save", "import", "down"], [
    n({ type: "arrow", name: "Arrow", x: 24, y: 6, w: 0, h: 24, stroke: INK, strokeWidth: 3 }),
    ln(8, 40, 40, 40, 4),
  ]),
  icon("upload", "Upload", ["export", "up"], [
    n({ type: "arrow", name: "Arrow", x: 24, y: 30, w: 0, h: -24, stroke: INK, strokeWidth: 3 }),
    ln(8, 40, 40, 40, 4),
  ]),
  icon("link", "Link", ["chain", "url", "hyperlink"], [
    n({ type: "rect", name: "Link", x: 6, y: 20, w: 20, h: 11, radius: 5, rotation: -45, fill: INK }),
    n({ type: "rect", name: "Link", x: 22, y: 20, w: 20, h: 11, radius: 5, rotation: -45, fill: INK }),
  ]),
  icon("edit", "Edit", ["pencil", "write", "compose"], [
    n({ type: "rect", name: "Pencil", x: 10, y: 20, w: 22, h: 12, radius: 2, rotation: -45, fill: INK }),
    pg(28, 6, 12, 12, 3, 45),
  ]),
  icon("mic", "Microphone", ["record", "voice", "audio"], [
    rc(17, 6, 14, 26, 7),
    ln(24, 32, 24, 40, 3),
    ln(14, 40, 34, 40, 3),
  ]),
  icon("grid", "Grid", ["apps", "layout", "tiles"], [
    rc(8, 8, 14, 14, 2), rc(26, 8, 14, 14, 2),
    rc(8, 26, 14, 14, 2), rc(26, 26, 14, 14, 2),
  ]),
  icon("menu", "Menu", ["hamburger", "nav", "bars"], [
    ln(8, 14, 40, 14, 4), ln(8, 24, 40, 24, 4), ln(8, 34, 40, 34, 4),
  ]),
];

/* ---------- shapes & decorations ---------- */

const shapes: LibraryItem[] = [
  {
    id: "sh-ring",
    name: "Ring",
    category: "Shapes",
    keywords: ["circle", "outline", "stroke"],
    build: () => [el(0, 0, 200, 200, { sw: 10 })],
  },
  {
    id: "sh-target",
    name: "Target",
    category: "Shapes",
    keywords: ["circle", "bullseye", "focus"],
    build: () => [
      el(0, 0, 200, 200, { sw: 8 }),
      el(50, 50, 100, 100, { sw: 8 }),
      el(88, 88, 24, 24, { fill: INK }),
    ],
  },
  {
    id: "sh-progress-ring",
    name: "Progress ring",
    category: "Shapes",
    keywords: ["loader", "spinner", "chart", "donut"],
    build: () => [
      n({ type: "ellipse", name: "Track", x: 0, y: 0, w: 160, h: 160, fill: null, stroke: "#3f3f46", strokeWidth: 12 }),
      n({ type: "ellipse", name: "Progress", x: 0, y: 0, w: 160, h: 160, fill: null, stroke: "#22d3ee", strokeWidth: 12, dash: 220, rotation: -90 }),
    ],
  },
  {
    id: "sh-divider",
    name: "Dashed divider",
    category: "Shapes",
    keywords: ["line", "separator", "rule"],
    build: () => [
      n({ type: "line", name: "Divider", x: 0, y: 0, w: 320, h: 0, stroke: "#52525b", strokeWidth: 2, dash: 10 }),
    ],
  },
  {
    id: "sh-corner-frame",
    name: "Corner frame",
    category: "Shapes",
    keywords: ["crop", "focus", "brackets"],
    build: () => [
      rc(0, 0, 120, 8, 0), rc(0, 0, 8, 120, 0),
      rc(200, 0, 120, 8, 0), rc(312, 0, 8, 120, 0),
      rc(0, 200, 8, 120, 0), rc(0, 312, 120, 8, 0),
      rc(312, 200, 8, 120, 0), rc(200, 312, 120, 8, 0),
    ],
  },
  {
    id: "sh-plus",
    name: "Plus shape",
    category: "Shapes",
    keywords: ["cross", "add", "medical"],
    build: () => [rc(60, 0, 60, 180, 8), rc(0, 60, 180, 60, 8)],
  },
  {
    id: "sh-seal",
    name: "Badge seal",
    category: "Shapes",
    keywords: ["badge", "verified", "stamp", "polygon"],
    build: () => [pg(0, 0, 160, 160, 12)],
  },
  {
    id: "sh-starburst",
    name: "Starburst",
    category: "Shapes",
    keywords: ["burst", "sale", "spark"],
    build: () => [pg(0, 0, 180, 180, 8), el(60, 60, 60, 60, { fill: DARK })],
  },
  {
    id: "sh-bubble",
    name: "Speech bubble",
    category: "Shapes",
    keywords: ["comment", "chat", "tooltip"],
    build: () => [
      rc(0, 0, 240, 120, 20, INK),
      pg(36, 112, 44, 44, 3, 180),
    ],
  },
  {
    id: "sh-banner",
    name: "Ribbon banner",
    category: "Shapes",
    keywords: ["ribbon", "sale", "label"],
    build: () => [
      n({ type: "rect", name: "Tail L", x: -26, y: 22, w: 60, h: 80, rotation: -24, fill: "#a78bfa" }),
      n({ type: "rect", name: "Tail R", x: 186, y: 22, w: 60, h: 80, rotation: 24, fill: "#a78bfa" }),
      rc(0, 0, 220, 64, 6),
    ],
  },
  {
    id: "sh-blob-wide",
    name: "Wide blob",
    category: "Shapes",
    keywords: ["organic", "squircle", "spot"],
    build: () => [n({ type: "ellipse", name: "Blob", x: 0, y: 30, w: 260, h: 130, fill: "#8b5cf6" })],
  },
  {
    id: "sh-blob-tall",
    name: "Tall blob",
    category: "Shapes",
    keywords: ["organic", "squircle", "spot"],
    build: () => [n({ type: "ellipse", name: "Blob", x: 55, y: 0, w: 140, h: 220, fill: "#22d3ee" })],
  },
  {
    id: "sh-pill-outline",
    name: "Pill outline",
    category: "Shapes",
    keywords: ["capsule", "button", "outline"],
    build: () => [rc(0, 0, 220, 72, 36, null, 6)],
  },
  {
    id: "sh-squircle",
    name: "Squircle",
    category: "Shapes",
    keywords: ["rounded", "app", "tile"],
    build: () => [rc(0, 0, 160, 160, 44, "#8b5cf6")],
  },
  {
    id: "sh-chevrons",
    name: "Triple chevron",
    category: "Shapes",
    keywords: ["arrows", "next", "fast"],
    build: () => [
      ln(0, 0, 30, 30, 8), ln(30, 30, 0, 60, 8),
      ln(28, 0, 58, 30, 8), ln(58, 30, 28, 60, 8),
      ln(56, 0, 86, 30, 8), ln(86, 30, 56, 60, 8),
    ],
  },
  {
    id: "sh-crosshair",
    name: "Crosshair",
    category: "Shapes",
    keywords: ["aim", "target", "focus"],
    build: () => [
      el(0, 0, 120, 120, { sw: 4 }),
      ln(60, -14, 60, 24, 4), ln(60, 96, 60, 134, 4),
      ln(-14, 60, 24, 60, 4), ln(96, 60, 134, 60, 4),
    ],
  },
];

/* ---------- UI elements (composed screens-ready pieces) ---------- */

function uiItems(): LibraryItem[] {
  const btn = (
    slug: string,
    label: string,
    fill: string,
    textColor: string,
    kw: string[],
  ): LibraryItem => ({
    id: `ui-btn-${slug}`,
    name: `Button — ${label}`,
    category: "UI",
    keywords: ["button", "cta", ...kw],
    build: () => [
      rc(0, 0, 132, 40, 8, fill),
      tx(label, 0, 11, 14, 600, textColor, 132, "center"),
    ],
  });

  return [
    btn("primary", "Get started", "#8b5cf6", "#ffffff", ["primary", "violet"]),
    btn("secondary", "Learn more", "#27272a", "#e4e4e7", ["secondary", "gray"]),
    btn("destructive", "Delete", "#dc2626", "#ffffff", ["danger", "red", "error"]),
    btn("success", "Confirm", "#10b981", "#052e22", ["green", "ok"]),
    btn("dark", "Continue", "#0b0b10", "#e4e4e7", ["black", "dark"]),
    btn("light", "Cancel", "#f4f4f5", "#18181b", ["white", "light"]),
    {
      id: "ui-input",
      name: "Input field",
      category: "UI",
      keywords: ["text", "form", "field"],
      build: () => [
        rc(0, 0, 240, 40, 8, null, 2),
        tx("Placeholder", 12, 12, 13, 400, "#71717a", 200),
      ],
    },
    {
      id: "ui-search",
      name: "Search bar",
      category: "UI",
      keywords: ["find", "query", "form"],
      build: () => [
        rc(0, 0, 260, 40, 20, null, 2),
        el(12, 12, 16, 16, { sw: 2 }),
        ln(24, 24, 30, 30, 2),
        tx("Search…", 38, 12, 13, 400, "#71717a", 180),
      ],
    },
    {
      id: "ui-checkbox",
      name: "Checkbox",
      category: "UI",
      keywords: ["form", "check", "toggle"],
      build: () => [rc(0, 0, 20, 20, 5, null, 2), tx("Label", 30, 2, 13, 400, INK, 160)],
    },
    {
      id: "ui-checkbox-checked",
      name: "Checkbox — checked",
      category: "UI",
      keywords: ["form", "check", "done"],
      build: () => [
        rc(0, 0, 20, 20, 5, "#8b5cf6"),
        ln(5, 10, 9, 14, 3, "#ffffff"),
        ln(9, 14, 15, 6, 3, "#ffffff"),
        tx("Label", 30, 2, 13, 400, INK, 160),
      ],
    },
    {
      id: "ui-radio",
      name: "Radio — selected",
      category: "UI",
      keywords: ["form", "option", "choice"],
      build: () => [el(0, 0, 20, 20, { sw: 2 }), el(5, 5, 10, 10, { fill: "#8b5cf6" }), tx("Option", 30, 2, 13, 400, INK, 160)],
    },
    {
      id: "ui-toggle-off",
      name: "Toggle — off",
      category: "UI",
      keywords: ["switch", "setting"],
      build: () => [rc(0, 0, 44, 24, 12, "#3f3f46"), el(3, 3, 18, 18, { fill: "#e4e4e7" })],
    },
    {
      id: "ui-toggle-on",
      name: "Toggle — on",
      category: "UI",
      keywords: ["switch", "setting", "active"],
      build: () => [rc(0, 0, 44, 24, 12, "#8b5cf6"), el(23, 3, 18, 18, { fill: "#ffffff" })],
    },
    {
      id: "ui-avatar",
      name: "Avatar",
      category: "UI",
      keywords: ["user", "profile", "person"],
      build: () => [
        el(0, 0, 48, 48, { fill: "#8b5cf6" }),
        tx("A", 0, 12, 20, 700, "#ffffff", 48, "center"),
      ],
    },
    {
      id: "ui-avatar-group",
      name: "Avatar group",
      category: "UI",
      keywords: ["team", "users", "people"],
      build: () => [
        el(0, 0, 40, 40, { fill: "#f472b6" }),
        el(26, 0, 40, 40, { fill: "#22d3ee" }),
        el(52, 0, 40, 40, { fill: "#fbbf24" }),
        el(34, 2, 36, 36, { fill: "#8b5cf6" }),
        tx("A", 34, 12, 16, 700, "#ffffff", 36, "center"),
      ],
    },
    {
      id: "ui-card",
      name: "Profile card",
      category: "UI",
      keywords: ["card", "profile", "content"],
      build: () => [
        rc(0, 0, 280, 210, 14, "#1a1a20"),
        rc(16, 16, 248, 100, 8, "#27272a"),
        n({ type: "rect", name: "Cover", x: 16, y: 16, w: 248, h: 100, radius: 8, gradient: { from: "#8b5cf6", to: "#22d3ee", angle: 135 } }),
        tx("Card title", 16, 128, 15, 600, "#f4f4f5", 200),
        tx("Supporting copy for the card body", 16, 152, 12, 400, "#a1a1aa", 220),
        rc(16, 176, 92, 24, 6, "#8b5cf6"),
        tx("Action", 16, 182, 11, 600, "#ffffff", 92, "center"),
      ],
    },
    {
      id: "ui-navbar",
      name: "Navbar",
      category: "UI",
      keywords: ["header", "nav", "topbar"],
      build: () => [
        rc(0, 0, 640, 52, 0, "#131318"),
        tx("Logo", 20, 17, 14, 700, "#f4f4f5", 80),
        tx("Product", 300, 19, 12, 500, "#a1a1aa", 80),
        tx("Pricing", 380, 19, 12, 500, "#a1a1aa", 80),
        tx("Docs", 460, 19, 12, 500, "#a1a1aa", 80),
        rc(530, 12, 90, 28, 6, "#8b5cf6"),
        tx("Sign up", 530, 20, 11, 600, "#ffffff", 90, "center"),
      ],
    },
    {
      id: "ui-modal",
      name: "Modal dialog",
      category: "UI",
      keywords: ["dialog", "popup", "confirm"],
      build: () => [
        rc(0, 0, 360, 200, 14, "#18181d"),
        tx("Delete this file?", 24, 24, 16, 600, "#f4f4f5", 280),
        tx("This action cannot be undone. The file will be", 24, 56, 12, 400, "#a1a1aa", 300),
        tx("moved to trash for 30 days.", 24, 74, 12, 400, "#a1a1aa", 300),
        rc(196, 150, 66, 30, 6, "#27272a"),
        tx("Cancel", 196, 159, 11, 500, "#e4e4e7", 66, "center"),
        rc(270, 150, 66, 30, 6, "#dc2626"),
        tx("Delete", 270, 159, 11, 600, "#ffffff", 66, "center"),
      ],
    },
    {
      id: "ui-toast",
      name: "Toast",
      category: "UI",
      keywords: ["notification", "snackbar", "alert"],
      build: () => [
        rc(0, 0, 300, 48, 10, "#1a1a20"),
        el(14, 16, 16, 16, { fill: "#10b981" }),
        tx("Changes saved", 42, 16, 13, 500, "#f4f4f5", 200),
      ],
    },
    {
      id: "ui-badge",
      name: "Badge pill",
      category: "UI",
      keywords: ["tag", "label", "chip"],
      build: () => [
        rc(0, 0, 76, 24, 12, null, 2),
        tx("New", 0, 5, 11, 600, "#c4b5fd", 76, "center"),
      ],
    },
    {
      id: "ui-tooltip",
      name: "Tooltip",
      category: "UI",
      keywords: ["hint", "hover", "popover"],
      build: () => [
        rc(0, 0, 150, 32, 8, "#27272a"),
        pg(66, 30, 18, 14, 3, 180),
        tx(" Helpful tip ", 0, 8, 12, 500, "#e4e4e7", 150, "center"),
      ],
    },
    {
      id: "ui-progress",
      name: "Progress bar",
      category: "UI",
      keywords: ["loading", "bar", "percent"],
      build: () => [
        rc(0, 0, 240, 8, 4, "#27272a"),
        rc(0, 0, 150, 8, 4, "#8b5cf6"),
      ],
    },
    {
      id: "ui-slider",
      name: "Slider",
      category: "UI",
      keywords: ["range", "value", "input"],
      build: () => [
        ln(0, 12, 240, 12, 4, "#3f3f46"),
        ln(0, 12, 150, 12, 4, "#8b5cf6"),
        el(140, 2, 20, 20, { fill: "#ffffff" }),
      ],
    },
    {
      id: "ui-tabs",
      name: "Tabs",
      category: "UI",
      keywords: ["segmented", "nav", "switch"],
      build: () => [
        tx("Design", 12, 8, 13, 600, "#f4f4f5", 80),
        tx("Prototype", 100, 8, 13, 500, "#71717a", 90),
        tx("Inspect", 196, 8, 13, 500, "#71717a", 80),
        rc(12, 34, 60, 3, 2, "#8b5cf6"),
        ln(0, 37, 280, 37, 1, "#27272a"),
      ],
    },
    {
      id: "ui-stat",
      name: "Stat card",
      category: "UI",
      keywords: ["metric", "analytics", "kpi", "dashboard"],
      build: () => [
        rc(0, 0, 220, 110, 12, "#17171c"),
        tx("Monthly visitors", 16, 16, 11, 500, "#a1a1aa", 180),
        tx("24,318", 16, 40, 26, 700, "#f4f4f5", 180),
        tx("+12.4% vs last month", 16, 80, 11, 600, "#34d399", 180),
      ],
    },
    {
      id: "ui-pagination",
      name: "Pagination",
      category: "UI",
      keywords: ["pages", "nav", "numbers"],
      build: () => [
        rc(0, 0, 28, 28, 6, "#8b5cf6"),
        tx("1", 0, 7, 12, 600, "#ffffff", 28, "center"),
        rc(34, 0, 28, 28, 6, null, 2),
        tx("2", 34, 7, 12, 500, "#a1a1aa", 28, "center"),
        rc(68, 0, 28, 28, 6, null, 2),
        tx("3", 68, 7, 12, 500, "#a1a1aa", 28, "center"),
        rc(102, 0, 28, 28, 6, null, 2),
        tx("…", 102, 7, 12, 500, "#a1a1aa", 28, "center"),
      ],
    },
  ];
}

/* ---------- text styles ---------- */

const textItems: LibraryItem[] = [
  ["Display", 48, 700, "#fafafa", ["hero", "h1", "big"]],
  ["Heading 1", 40, 700, "#fafafa", ["title", "h1"]],
  ["Heading 2", 32, 600, "#f4f4f5", ["h2"]],
  ["Title", 24, 600, "#f4f4f5", ["h3"]],
  ["Subtitle", 18, 500, "#d4d4d8", ["h4"]],
  ["Body", 16, 400, "#d4d4d8", ["paragraph", "p"]],
  ["Caption", 12, 400, "#a1a1aa", ["small", "label"]],
  ["Overline", 11, 600, "#a78bfa", ["eyebrow", "uppercase"]],
  ["Quote", 28, 500, "#e4e4e7", ["blockquote", "serif"]],
  ["Link", 16, 500, "#22d3ee", ["hyperlink", "url"]],
].map(([name, size, weight, color, kw]) => ({
  id: `tx-${String(name).toLowerCase().replace(/\s+/g, "-")}`,
  name: `Text — ${name}`,
  category: "Text" as const,
  keywords: ["text", "typography", ...(kw as string[])],
  build: () => [
    tx(
      String(name) === "Overline" ? "OVERLINE LABEL" : `The quick brown fox`,
      0,
      0,
      Number(size),
      Number(weight),
      String(color),
      420,
    ),
  ],
}));

/* ---------- exports ---------- */

// Component presets (componentPresets.ts) exposed as searchable UI items.
const componentPresetItems: LibraryItem[] = COMPONENT_PRESETS.map((preset) => ({
  id: "component-" + preset.id,
  name: preset.label,
  category: "UI" as const,
  keywords: [preset.category.toLowerCase(), "component", preset.id],
  build: () => preset.build(0, 0),
}));

export const LIBRARY: LibraryItem[] = [
  ...backgrounds,
  ...icons,
  ...shapes,
  ...uiItems(),
  ...componentPresetItems,
  ...textItems,
];

export const LIBRARY_CATEGORIES = [
  "All",
  "Backgrounds",
  "Icons",
  "Shapes",
  "UI",
  "Text",
] as const;

export type LibraryFilter = (typeof LIBRARY_CATEGORIES)[number];

/** Filter the library by free-text query and category. */
export function searchLibrary(q: string, cat: LibraryFilter): LibraryItem[] {
  const needle = q.trim().toLowerCase();
  return LIBRARY.filter((item) => {
    if (cat !== "All" && item.category !== cat) return false;
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      item.keywords.some((k) => k.includes(needle))
    );
  });
}

/** Build a one-page doc for thumbnail previews of a library item. */
export function libraryThumbDoc(item: LibraryItem): DesignDoc {
  return {
    background: "#141419",
    activePageId: "thumb",
    pages: [{ id: "thumb", name: "Thumb", nodes: item.build() }],
  } as unknown as DesignDoc;
}
