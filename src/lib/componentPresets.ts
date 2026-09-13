// Component presets — Figma-style one-click UI components. Each builder
// returns real, fully-editable nodes (frames, text, primitives) composed the
// same way a designer would build them by hand, so they participate in auto
// layout, components, restyling, and export exactly like manual work.

import type { DesignNode } from "./geo";
import { defaultNode, uid } from "./geo";
import { FONTS } from "./fonts";

export interface PresetDef {
  id: string;
  label: string;
  category: "Forms" | "Display" | "Navigation" | "Data";
  build: (x: number, y: number) => DesignNode[];
}

const SANS = FONTS[0].canvasFamilies;

function textNode(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fontSize: number,
  color: string,
  weight = 500,
): DesignNode {
  const n = defaultNode("text", x, y);
  n.id = uid(id);
  n.name = label.length > 24 ? label.slice(0, 24) + "…" : label;
  n.w = w;
  n.h = h;
  n.fill = null;
  n.text = label;
  n.fontSize = fontSize;
  n.fontWeight = weight;
  n.color = color;
  n.align = "left";
  return n;
}

/** Row auto-layout frame sized to center its single child horizontally. */
function paddedRow(
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  child: DesignNode,
  fill: string | null,
  radius = 10,
  stroke: string | null = null,
): DesignNode {
  const frame = defaultNode("frame", x, y);
  frame.id = uid(id);
  frame.name = name;
  frame.w = w;
  frame.h = h;
  frame.fill = fill;
  frame.stroke = stroke;
  frame.strokeWidth = stroke ? 1 : 0;
  frame.radius = radius;
  const childW = child.w;
  frame.layout = { mode: "row", gap: 8, padding: Math.max(6, Math.round((w - childW) / 2)) };
  return frame;
}

// ---------- Builders ----------

function buildInput(x: number, y: number): DesignNode[] {
  const w = 260;
  const h = 44;
  const frame = defaultNode("frame", x, y);
  frame.id = uid("inp");
  frame.name = "Input";
  frame.w = w;
  frame.h = h;
  frame.fill = "#232329";
  frame.stroke = "#3f3f46";
  frame.strokeWidth = 1;
  frame.radius = 10;
  const label = textNode("inpl", x + 14, y + h / 2 - 8, 120, 18, "Placeholder", 13, "#71717a");
  label.x = frame.x + 14;
  label.y = frame.y + (h - 18) / 2;
  return [frame, label];
}

function buildCheckbox(x: number, y: number): DesignNode[] {
  const box = defaultNode("rect", x, y);
  box.id = uid("chk");
  box.name = "Checkbox";
  box.w = 20;
  box.h = 20;
  box.fill = "#8b5cf6";
  box.radius = 6;
  const mark = textNode("chkm", x + 3, y + 1, 14, 18, "✓", 13, "#ffffff", 700);
  mark.name = "Checkmark";
  mark.text = "✓";
  const label = textNode("chkl", x + 30, y + 1, 110, 18, "Remember me", 13, "#e4e4e7");
  return [box, mark, label];
}

function buildToggle(x: number, y: number): DesignNode[] {
  const track = defaultNode("frame", x, y);
  track.id = uid("tgl");
  track.name = "Toggle";
  track.w = 44;
  track.h = 24;
  track.fill = "#8b5cf6";
  track.radius = 12;
  const knob = defaultNode("ellipse", x + 22, y + 2);
  knob.id = uid("tglk");
  knob.name = "Knob";
  knob.w = 20;
  knob.h = 20;
  knob.fill = "#ffffff";
  return [track, knob];
}

function buildAvatar(x: number, y: number): DesignNode[] {
  const av = defaultNode("ellipse", x, y);
  av.id = uid("ava");
  av.name = "Avatar";
  av.w = 40;
  av.h = 40;
  av.fill = "#7c3aed";
  const initials = textNode("avai", x + 10, y + 11, 20, 18, "AB", 13, "#ffffff", 700);
  initials.name = "Initials";
  initials.align = "center";
  return [av, initials];
}

function buildBadge(x: number, y: number): DesignNode[] {
  const label = textNode("bdgl", x, y + 4, 52, 16, "New", 11, "#c4b5fd", 600);
  const frame = paddedRow("bdg", "Badge", x, y, 60, 24, label, "#4c1d95", 12);
  frame.layout = { mode: "row", gap: 8, padding: Math.max(4, Math.round((60 - label.w) / 2)) };
  label.x = frame.x + Math.round((60 - label.w) / 2);
  label.y = frame.y + 4;
  return [frame];
}

function buildCard(x: number, y: number): DesignNode[] {
  const frame = defaultNode("frame", x, y);
  frame.id = uid("card");
  frame.name = "Card";
  frame.w = 280;
  frame.h = 180;
  frame.fill = "#1c1c22";
  frame.stroke = "#2e2e36";
  frame.strokeWidth = 1;
  frame.radius = 16;
  const title = textNode("cardt", x + 20, y + 20, 200, 22, "Card title", 17, "#fafafa", 600);
  title.name = "Title";
  const body = textNode("cardb", x + 20, y + 52, 240, 40, "Supporting copy that describes the card content.", 13, "#a1a1aa");
  body.name = "Body";
  body.h = 40;
  return [frame, title, body];
}

function buildNavbar(x: number, y: number): DesignNode[] {
  const frame = defaultNode("frame", x, y);
  frame.id = uid("nav");
  frame.name = "Nav bar";
  frame.w = 480;
  frame.h = 56;
  frame.fill = "#18181b";
  frame.radius = 0;
  const links = ["Product", "Pricing", "Docs"];
  const nodes: DesignNode[] = [frame];
  let lx = x + 24;
  for (let i = 0; i < links.length; i++) {
    const link = textNode("navl", lx, y + 19, 70, 18, links[i], 13, "#d4d4d8", 500);
    link.name = "Link / " + links[i];
    nodes.push(link);
    lx += 96;
  }
  return nodes;
}

function buildSearch(x: number, y: number): DesignNode[] {
  const frame = defaultNode("frame", x, y);
  frame.id = uid("srch");
  frame.name = "Search bar";
  frame.w = 240;
  frame.h = 40;
  frame.fill = "#232329";
  frame.stroke = "#3f3f46";
  frame.strokeWidth = 1;
  frame.radius = 20;
  const icon = defaultNode("ellipse", x + 14, y + 12);
  icon.id = uid("srchi");
  icon.name = "Icon";
  icon.w = 16;
  icon.h = 16;
  icon.fill = null;
  icon.stroke = "#71717a";
  icon.strokeWidth = 2;
  const ph = textNode("srchp", x + 40, y + 11, 140, 18, "Search…", 13, "#71717a");
  ph.name = "Placeholder";
  return [frame, icon, ph];
}

function buildProgress(x: number, y: number): DesignNode[] {
  const track = defaultNode("rect", x, y);
  track.id = uid("prgt");
  track.name = "Track";
  track.w = 220;
  track.h = 8;
  track.fill = "#2e2e36";
  track.radius = 4;
  const fillBar = defaultNode("rect", x, y);
  fillBar.id = uid("prgf");
  fillBar.name = "Fill";
  fillBar.w = 140;
  fillBar.h = 8;
  fillBar.fill = "#8b5cf6";
  fillBar.radius = 4;
  return [track, fillBar];
}

function buildSlider(x: number, y: number): DesignNode[] {
  const track = defaultNode("rect", x, y);
  track.id = uid("sldt");
  track.name = "Track";
  track.w = 200;
  track.h = 4;
  track.fill = "#2e2e36";
  track.radius = 2;
  const active = defaultNode("rect", x, y);
  active.id = uid("slda");
  active.name = "Active";
  active.w = 120;
  active.h = 4;
  active.fill = "#8b5cf6";
  active.radius = 2;
  const knob = defaultNode("ellipse", x + 112, y - 6);
  knob.id = uid("sldk");
  knob.name = "Knob";
  knob.w = 16;
  knob.h = 16;
  knob.fill = "#ffffff";
  return [track, active, knob];
}

function buildTable(x: number, y: number): DesignNode[] {
  const nodes: DesignNode[] = [];
  const cols = ["Name", "Status", "Amount"];
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols.length; c++) {
      const cell = textNode(
        "tblc",
        x + c * 120,
        y + r * 32,
        110,
        20,
        r === 0 ? cols[c] : `${cols[c][0]}${r}${c}`,
        12,
        r === 0 ? "#fafafa" : "#a1a1aa",
        r === 0 ? 600 : 400,
      );
      cell.name = r === 0 ? `Header / ${cols[c]}` : `Cell ${r}-${c}`;
      nodes.push(cell);
    }
  }
  return nodes;
}

function buildFab(x: number, y: number): DesignNode[] {
  const frame = defaultNode("frame", x, y);
  frame.id = uid("fab");
  frame.name = "FAB";
  frame.w = 56;
  frame.h = 56;
  frame.fill = "#8b5cf6";
  frame.radius = 28;
  frame.shadowBlur = 16;
  frame.shadowColor = "#8b5cf680";
  const plus = textNode("fabp", x + 18, y + 14, 20, 28, "+", 26, "#ffffff", 700);
  plus.name = "Plus";
  plus.align = "center";
  plus.x = frame.x + 18;
  return [frame, plus];
}

// ---------- Registry ----------

export const COMPONENT_PRESETS: PresetDef[] = [
  { id: "input", label: "Input field", category: "Forms", build: buildInput },
  { id: "checkbox", label: "Checkbox", category: "Forms", build: buildCheckbox },
  { id: "toggle", label: "Toggle switch", category: "Forms", build: buildToggle },
  { id: "slider", label: "Slider", category: "Forms", build: buildSlider },
  { id: "avatar", label: "Avatar", category: "Display", build: buildAvatar },
  { id: "badge", label: "Badge", category: "Display", build: buildBadge },
  { id: "card", label: "Content card", category: "Display", build: buildCard },
  { id: "navbar", label: "Nav bar", category: "Navigation", build: buildNavbar },
  { id: "search", label: "Search bar", category: "Navigation", build: buildSearch },
  { id: "fab", label: "Floating action button", category: "Navigation", build: buildFab },
  { id: "progress", label: "Progress bar", category: "Data", build: buildProgress },
  { id: "table", label: "Table", category: "Data", build: buildTable },
];

export function getPreset(id: string): PresetDef | undefined {
  return COMPONENT_PRESETS.find((p) => p.id === id);
}
