import { describe, expect, it } from "vitest";
import { defaultNode, type DesignNode } from "./geo";
import { axisGaps, measureNodes, measureSummary } from "./measure";

function rect(x: number, y: number, w = 100, h = 50): DesignNode {
  const n = defaultNode("rect", x, y);
  n.w = w;
  n.h = h;
  return n;
}

describe("axisGaps", () => {
  it("computes edge-to-edge gaps on both axes", () => {
    const g = axisGaps(
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 150, y: 100, w: 40, h: 40 },
    );
    expect(g.dx).toBe(50);
    expect(g.dy).toBe(50);
  });

  it("returns 0 for overlapping ranges", () => {
    const g = axisGaps(
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 50, y: 20, w: 20, h: 20 },
    );
    expect(g.dx).toBe(0);
    expect(g.dy).toBe(0);
  });

  it("handles touching edges as zero gap", () => {
    const g = axisGaps(
      { x: 0, y: 0, w: 100, h: 10 },
      { x: 100, y: 0, w: 50, h: 10 },
    );
    expect(g.dx).toBe(0);
  });
});

describe("measureNodes", () => {
  it("measures two disjoint nodes", () => {
    const m = measureNodes(rect(0, 0), rect(200, 0, 30, 30));
    expect(m.gaps.dx).toBe(100);
    expect(m.gaps.dy).toBe(0);
    expect(m.nested).toBe(false);
  });

  it("detects nesting", () => {
    const m = measureNodes(rect(0, 0, 300, 200), rect(50, 50, 30, 30));
    expect(m.nested).toBe(true);
  });

  it("computes center distances", () => {
    const m = measureNodes(rect(0, 0, 100, 100), rect(300, 0, 100, 100));
    expect(m.centerDx).toBe(300);
    expect(m.centerDy).toBe(0);
  });

  it("rounds to two decimals", () => {
    const m = measureNodes(rect(0, 0), rect(100.333, 0, 10, 10));
    expect(m.gaps.dx).toBe(0.33);
  });
});

describe("measureSummary", () => {
  it("formats gaps and deltas", () => {
    const m = measureNodes(rect(0, 0), rect(150, 100, 30, 30));
    const s = measureSummary(m);
    expect(s).toContain("gap 50");
    expect(s).toContain("Δx 115");
    expect(s).toContain("Δy 90");
  });

  it("reports nested nodes as nested", () => {
    const m = measureNodes(rect(0, 0, 300, 300), rect(10, 10, 20, 20));
    expect(measureSummary(m)).toContain("nested");
  });
});
