// Design token analysis — adapted from OpenPencil's `analyze colors/typography`
// CLI tools (upstream/packages/core/src/tools/analyze/*), reimplemented for
// Node's DesignDoc model. Pure functions, no DOM.

import type { DesignDoc, DesignNode } from "./geo";

export interface ColorCount {
  value: string;
  count: number;
}

export interface FontCount {
  fontSize: number;
  fontWeight: number;
  count: number;
}

export interface RadiusCount {
  value: number;
  count: number;
}

export interface TokenAnalysis {
  colors: ColorCount[];
  fonts: FontCount[];
  radii: RadiusCount[];
  nodeCount: number;
  textCount: number;
}

/** Normalize a css color for dedup (lowercase, trim; transparent collapses). */
function normColor(c: string | null | undefined): string | null {
  if (!c) return null;
  const v = c.trim().toLowerCase();
  if (!v || v === "transparent" || v === "none") return null;
  return v;
}

/** All nodes across every page (Node keeps a flat array per page; groups
 * reference members by id, so no recursion is needed). */
function collectNodes(doc: DesignDoc): DesignNode[] {
  const out: DesignNode[] = [];
  for (const page of doc.pages) {
    for (const n of page.nodes) out.push(n);
  }
  return out;
}

function incrementMap(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function analyzeTokens(doc: DesignDoc): TokenAnalysis {
  const colorCounts = new Map<string, number>();
  const fontCounts = new Map<string, number>();
  const radiusCounts = new Map<string, number>();
  let textCount = 0;

  const nodes = collectNodes(doc);
  for (const n of nodes) {
    const fill = normColor(n.fill);
    if (fill) incrementMap(colorCounts, fill);
    const stroke = normColor(n.stroke);
    if (stroke) incrementMap(colorCounts, stroke);
    if (n.type === "text") {
      textCount++;
      if (n.fontSize && n.fontSize > 0) {
        const key = `${n.fontSize}/${n.fontWeight ?? 400}`;
        incrementMap(fontCounts, key);
      }
    }
    if (n.radius && n.radius > 0) incrementMap(radiusCounts, String(n.radius));
  }

  const colors: ColorCount[] = [...colorCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const fonts: FontCount[] = [...fontCounts.entries()]
    .map(([key, count]) => {
      const [fs, fw] = key.split("/");
      return { fontSize: Number(fs), fontWeight: Number(fw), count };
    })
    .sort((a, b) => b.count - a.count || b.fontSize - a.fontSize);

  const radii: RadiusCount[] = [...radiusCounts.entries()]
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count);

  return {
    colors,
    fonts,
    radii,
    nodeCount: nodes.length,
    textCount,
  };
}

/** Render an upstream-style bar chart report (hex ███ count). */
export function formatTokensReport(a: TokenAnalysis): string {
  const lines: string[] = [];
  const bar = (count: number, max: number): string => {
    const width = Math.max(1, Math.round((count / Math.max(1, max)) * 30));
    return "█".repeat(width);
  };

  lines.push(`nodes ${a.nodeCount} · text ${a.textCount}`);
  if (a.colors.length > 0) {
    lines.push("");
    lines.push("colors");
    const max = a.colors[0].count;
    for (const c of a.colors.slice(0, 8)) {
      lines.push(`${c.value} ${bar(c.count, max)} ${c.count}×`);
    }
  }
  if (a.fonts.length > 0) {
    lines.push("");
    lines.push("typography");
    const max = a.fonts[0].count;
    for (const f of a.fonts.slice(0, 6)) {
      lines.push(
        `${f.fontSize}px/${f.fontWeight} ${bar(f.count, max)} ${f.count}×`,
      );
    }
  }
  if (a.radii.length > 0) {
    lines.push("");
    lines.push("corner radius");
    const max = a.radii[0].count;
    for (const r of a.radii.slice(0, 5)) {
      lines.push(`${r.value}px ${bar(r.count, max)} ${r.count}×`);
    }
  }
  return lines.join("\n");
}
