/**
 * DesignBox starter templates — ready-made documents so a new file is never
 * a blank void. Each template builds a DesignDoc with real, editable nodes.
 */
import { emptyDoc, uid, type DesignDoc, type DesignNode } from "./geo";

type NodeInit = Partial<DesignNode> & { type: DesignNode["type"] };

function make(init: NodeInit): DesignNode {
  const base: DesignNode = {
    id: uid(init.type[0]),
    type: init.type,
    name: init.name ?? init.type,
    x: 0,
    y: 0,
    w: 100,
    h: 40,
    fill: "#8b5cf6",
    stroke: null,
    strokeWidth: 0,
    radius: 0,
    opacity: 1,
  };
  return { ...base, ...init, id: base.id };
}

function text(
  t: string,
  x: number,
  y: number,
  size = 16,
  color = "#f4f4f5",
  weight = 600,
  w = 300,
): DesignNode {
  return make({
    type: "text",
    text: t,
    x,
    y,
    w,
    h: size * 1.4,
    fontSize: size,
    fontWeight: weight,
    color,
    fill: null,
    name: t.slice(0, 24),
  });
}

export type TemplateKind = "blank" | "mobile" | "web";

export function buildTemplate(kind: TemplateKind): DesignDoc {
  const doc = emptyDoc();
  const page = doc.pages[0];

  if (kind === "mobile") {
    page.nodes = [
      make({ type: "frame", name: "iPhone frame", x: 60, y: 60, w: 390, h: 844, fill: "#17171c", radius: 40 }),
      text("Good morning, Ava", 92, 116, 26, "#ffffff", 700, 320),
      text("Your Tuesday at a glance", 92, 156, 14, "#8b8b94", 400, 320),
      make({ type: "rect", name: "Hero card", x: 92, y: 200, w: 326, h: 150, fill: "#8b5cf6", radius: 20 }),
      text("Design sync", 116, 224, 18, "#ffffff", 700, 240),
      text("10:30 – 11:15 with the platform team", 116, 252, 12, "rgba(255,255,255,0.75)", 400, 280),
      make({ type: "rect", name: "Card 2", x: 92, y: 372, w: 326, h: 96, fill: "#232329", radius: 16 }),
      make({ type: "ellipse", name: "Icon 1", x: 112, y: 396, w: 44, h: 44, fill: "#22d3ee" }),
      text("Handoff review", 172, 402, 15, "#ffffff", 600, 220),
      text("4 screens approved", 172, 426, 12, "#8b8b94", 400, 220),
      make({ type: "rect", name: "Card 3", x: 92, y: 484, w: 326, h: 96, fill: "#232329", radius: 16 }),
      make({ type: "ellipse", name: "Icon 2", x: 112, y: 508, w: 44, h: 44, fill: "#f472b6" }),
      text("Export assets", 172, 514, 15, "#ffffff", 600, 220),
      text("3 icons ready for dev", 172, 538, 12, "#8b8b94", 400, 220),
      make({ type: "rect", name: "Primary button", x: 92, y: 780, w: 326, h: 52, fill: "#34d399", radius: 26 }),
      text("Get started", 92, 794, 15, "#0b3b2e", 700, 326),
    ];
    const label = page.nodes[page.nodes.length - 1];
    label.align = "center";
  } else if (kind === "web") {
    page.nodes = [
      make({ type: "frame", name: "Dashboard frame", x: 80, y: 80, w: 1120, h: 700, fill: "#17171c", radius: 16 }),
      make({ type: "rect", name: "Sidebar", x: 80, y: 80, w: 220, h: 700, fill: "#1d1d23", radius: 16 }),
      text("DesignBox", 108, 112, 18, "#ffffff", 700, 180),
      text("Overview", 108, 180, 13, "#8b5cf6", 600, 160),
      text("Assets", 108, 212, 13, "#8b8b94", 500, 160),
      text("Components", 108, 244, 13, "#8b8b94", 500, 160),
      text("Settings", 108, 276, 13, "#8b8b94", 500, 160),
      text("Welcome back", 348, 120, 24, "#ffffff", 700, 320),
      text("Here's what shipped this week", 348, 156, 13, "#8b8b94", 400, 320),
      make({ type: "rect", name: "KPI 1", x: 348, y: 208, w: 260, h: 120, fill: "#232329", radius: 14 }),
      text("2,318", 372, 232, 26, "#ffffff", 700, 180),
      text("Asset exports", 372, 276, 12, "#8b8b94", 400, 180),
      make({ type: "rect", name: "KPI 2", x: 628, y: 208, w: 260, h: 120, fill: "#232329", radius: 14 }),
      text("98.2%", 652, 232, 26, "#34d399", 700, 180),
      text("Handoff coverage", 652, 276, 12, "#8b8b94", 400, 180),
      make({ type: "rect", name: "KPI 3", x: 908, y: 208, w: 260, h: 120, fill: "#232329", radius: 14 }),
      text("14", 932, 232, 26, "#f472b6", 700, 180),
      text("Active projects", 932, 276, 12, "#8b8b94", 400, 180),
      make({ type: "rect", name: "Activity panel", x: 348, y: 352, w: 820, h: 380, fill: "#1d1d23", radius: 14 }),
      text("Recent activity", 372, 376, 15, "#ffffff", 600, 200),
      make({ type: "rect", name: "Row 1", x: 372, y: 416, w: 772, h: 60, fill: "#232329", radius: 10 }),
      make({ type: "rect", name: "Row 2", x: 372, y: 488, w: 772, h: 60, fill: "#232329", radius: 10 }),
      make({ type: "rect", name: "Row 3", x: 372, y: 560, w: 772, h: 60, fill: "#232329", radius: 10 }),
      make({ type: "ellipse", name: "Dot 1", x: 388, y: 434, w: 24, h: 24, fill: "#8b5cf6" }),
      make({ type: "ellipse", name: "Dot 2", x: 388, y: 506, w: 24, h: 24, fill: "#22d3ee" }),
      make({ type: "ellipse", name: "Dot 3", x: 388, y: 578, w: 24, h: 24, fill: "#facc15" }),
    ];
  }
  // "blank" keeps an empty page
  return doc;
}
