import { describe, expect, it } from "vitest";
import { defaultNode, type DesignDoc, type DesignNode } from "./geo";
import { lintDoc, contrastRatio } from "./designLint";

function docWith(nodes: DesignNode[]): DesignDoc {
  return {
    pages: [{ id: "p1", name: "Page 1", nodes }],
    activePageId: "p1",
    background: "#101012",
  };
}

describe("contrastRatio", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 1);
  });
  it("returns null for non-hex colors", () => {
    expect(contrastRatio("rgb(1,2,3)", "#ffffff")).toBeNull();
  });
});

describe("lintDoc", () => {
  it("flags generic names with a suggested rename fix", () => {
    const a = defaultNode("rect", 0, 0); // default name is "Rectangle"
    const { issues } = lintDoc(docWith([a]));
    const hit = issues.find((i) => i.rule === "naming/generic-name");
    expect(hit).toBeDefined();
    expect(hit?.fix?.name).toBe("Surface");
  });

  it("flags low text contrast on a dark card", () => {
    const card = defaultNode("rect", 0, 0);
    card.fill = "#111111";
    card.name = "Card";
    card.w = 300;
    card.h = 120;
    const t = defaultNode("text", 10, 10);
    t.text = "hi";
    t.color = "#333333";
    t.fontSize = 16;
    t.name = "Caption";
    const { issues } = lintDoc(docWith([card, t]));
    const hit = issues.find((i) => i.rule === "a11y/contrast");
    expect(hit).toBeDefined();
    expect(hit?.message).toContain("4.5");
  });

  it("passes high contrast text", () => {
    const card = defaultNode("rect", 0, 0);
    card.fill = "#111111";
    card.name = "Card";
    card.w = 300;
    card.h = 120;
    const t = defaultNode("text", 10, 10);
    t.text = "hi";
    t.color = "#ffffff";
    t.name = "Title";
    const { issues } = lintDoc(docWith([card, t]));
    expect(issues.find((i) => i.rule === "a11y/contrast")).toBeUndefined();
  });

  it("detects exact duplicates", () => {
    const a = defaultNode("rect", 0, 0);
    a.name = "A";
    const b = defaultNode("rect", 0, 0);
    b.name = "B";
    const { issues } = lintDoc(docWith([a, b]));
    expect(issues.filter((i) => i.rule === "structure/duplicate")).toHaveLength(1);
  });

  it("flags zero-size shapes as errors", () => {
    const a = defaultNode("rect", 0, 0);
    a.w = 0;
    a.name = "Broken";
    const { issues } = lintDoc(docWith([a]));
    const hit = issues.find((i) => i.rule === "layout/zero-size");
    expect(hit?.severity).toBe("error");
  });

  it("flags fully transparent nodes", () => {
    const a = defaultNode("rect", 0, 0);
    a.opacity = 0;
    a.name = "Ghost";
    const { issues } = lintDoc(docWith([a]));
    expect(issues.some((i) => i.rule === "layout/invisible")).toBe(true);
  });

  it("skips hidden nodes entirely", () => {
    const a = defaultNode("rect", 0, 0);
    a.hidden = true;
    a.name = "rect"; // would be flagged if not hidden
    const { issues } = lintDoc(docWith([a]));
    expect(issues).toHaveLength(0);
  });

  it("reports checked counts", () => {
    const { checked } = lintDoc(docWith([defaultNode("rect", 0, 0), defaultNode("text", 0, 0)]));
    expect(checked).toBe(2);
  });

  it("clean doc yields no issues", () => {
    const card = defaultNode("frame", 0, 0);
    card.name = "Hero";
    const { issues } = lintDoc(docWith([card]));
    expect(issues).toHaveLength(0);
  });
});
