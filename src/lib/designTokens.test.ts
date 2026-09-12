import { describe, expect, it } from "vitest";
import { defaultNode, type DesignDoc, type DesignNode } from "./geo";
import { analyzeTokens, formatTokensReport } from "./designTokens";

function docWith(nodes: DesignNode[]): DesignDoc {
  return {
    pages: [{ id: "p1", name: "Page 1", nodes }],
    activePageId: "p1",
    background: "#101012",
  };
}

describe("analyzeTokens", () => {
  it("counts fill and stroke colors across nodes", () => {
    const a = defaultNode("rect", 0, 0);
    a.fill = "#FF0000";
    const b = defaultNode("rect", 10, 0);
    b.fill = "#ff0000"; // same color, different case → deduped
    b.stroke = "#00ff00";
    const t = analyzeTokens(docWith([a, b]));
    const red = t.colors.find((c) => c.value === "#ff0000");
    const green = t.colors.find((c) => c.value === "#00ff00");
    expect(red).toBeDefined();
    expect(red?.count).toBe(2);
    expect(green?.count).toBe(1);
  });

  it("ignores transparent and empty fills", () => {
    const a = defaultNode("rect", 0, 0);
    a.fill = "transparent";
    const b = defaultNode("rect", 0, 0);
    b.fill = null;
    const t = analyzeTokens(docWith([a, b]));
    expect(t.colors).toHaveLength(0);
  });

  it("counts typography from text nodes only", () => {
    const t1 = defaultNode("text", 0, 0);
    t1.fontSize = 24;
    t1.fontWeight = 700;
    const t2 = defaultNode("text", 0, 30);
    t2.fontSize = 24;
    t2.fontWeight = 700;
    const rect = defaultNode("rect", 0, 60);
    rect.fontSize = 99; // non-text node must be ignored
    const t = analyzeTokens(docWith([t1, t2, rect]));
    expect(t.textCount).toBe(2);
    expect(t.fonts).toEqual([{ fontSize: 24, fontWeight: 700, count: 2 }]);
  });

  it("counts corner radii", () => {
    const a = defaultNode("rect", 0, 0);
    a.radius = 12;
    const b = defaultNode("ellipse", 0, 0);
    b.radius = 0; // zero radius not counted
    const t = analyzeTokens(docWith([a, b]));
    expect(t.radii).toEqual([{ value: 12, count: 1 }]);
  });

  it("sorts colors by frequency", () => {
    const nodes = [
      ...Array.from({ length: 3 }, () => {
        const n = defaultNode("rect", 0, 0);
        n.fill = "#111111";
        return n;
      }),
      ...Array.from({ length: 1 }, () => {
        const n = defaultNode("rect", 0, 0);
        n.fill = "#222222";
        return n;
      }),
    ];
    const t = analyzeTokens(docWith(nodes));
    expect(t.colors[0].value).toBe("#111111");
    expect(t.colors[0].count).toBe(3);
  });

  it("reports node and text counts", () => {
    const a = defaultNode("frame", 0, 0);
    const b = defaultNode("text", 0, 0);
    const t = analyzeTokens(docWith([a, b]));
    expect(t.nodeCount).toBe(2);
    expect(t.textCount).toBe(1);
  });

  it("handles an empty doc", () => {
    const t = analyzeTokens(docWith([]));
    expect(t.nodeCount).toBe(0);
    expect(t.colors).toHaveLength(0);
    expect(t.fonts).toHaveLength(0);
    expect(t.radii).toHaveLength(0);
  });
});

describe("formatTokensReport", () => {
  it("renders a bar-chart style report", () => {
    const a = defaultNode("rect", 0, 0);
    a.fill = "#8b5cf6";
    const report = formatTokensReport(analyzeTokens(docWith([a])));
    expect(report).toContain("#8b5cf6");
    expect(report).toContain("█");
    expect(report).toContain("nodes 1");
  });

  it("renders an empty doc without crash", () => {
    const report = formatTokensReport(analyzeTokens(docWith([])));
    expect(report).toContain("nodes 0");
  });
});
