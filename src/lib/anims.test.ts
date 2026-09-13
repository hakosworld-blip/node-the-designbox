import { describe, expect, it } from "vitest";
import {
  EASINGS,
  TransitionRunner,
  bezierAt,
  easeFn,
  findInteraction,
  interpolateFrames,
  lerpColor,
  resolveNavigation,
  snapshotPage,
  type FrameSnapshot,
} from "./anims";
import { defaultNode, type DesignDoc } from "./geo";

function docWith(pages: { id: string; names: [string, string][] }[]): DesignDoc {
  return {
    pages: pages.map((p) => ({
      id: p.id,
      name: p.id,
      nodes: p.names.map(([name, fill]) => {
        const n = defaultNode("rect", 10, 10);
        n.name = name;
        n.fill = fill;
        return n;
      }),
    })),
    activePageId: pages[0].id,
    background: "#101012",
  };
}

function snapOf(entries: [string, Partial<{ x: number; y: number; opacity: number; fill: string }>][]): FrameSnapshot {
  const nodes = new Map();
  const order: string[] = [];
  for (const [id, patch] of entries) {
    order.push(id);
    nodes.set(id, {
      id,
      name: id,
      type: "rect",
      x: patch.x ?? 0,
      y: patch.y ?? 0,
      w: 100,
      h: 50,
      opacity: patch.opacity ?? 1,
      radius: 0,
      fill: patch.fill ?? "#000000",
      stroke: null,
    });
  }
  return { nodes, order };
}

describe("easings", () => {
  it("has unique ids", () => {
    const ids = EASINGS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("bezierAt hits endpoints and midpoints", () => {
    expect(bezierAt([0, 0, 1, 1], 0)).toBe(0);
    expect(bezierAt([0, 0, 1, 1], 1)).toBe(1);
    const mid = bezierAt([0, 0, 1, 1], 0.5);
    expect(Math.abs(mid - 0.5)).toBeLessThan(0.001);
  });

  it("ease-out overshoots for back easings", () => {
    const f = easeFn("ease-out-back");
    expect(f(0.7)).toBeGreaterThan(1);
  });

  it("ease-in starts slow (below linear)", () => {
    const f = easeFn("ease-in");
    expect(f(0.25)).toBeLessThan(0.25);
  });

  it("is monotonic for standard curves", () => {
    const f = easeFn("ease-in-out");
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const v = f(i / 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("lerpColor", () => {
  it("blends midway", () => {
    expect(lerpColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
  it("returns the nearest color at extremes for unparseable input", () => {
    expect(lerpColor("nope", "#112233", 1)).toBe("#112233");
    expect(lerpColor("#112233", "nope", 0)).toBe("#112233");
  });
});

describe("snapshot + interpolateFrames", () => {
  it("matches nodes by id and lerps position", () => {
    const from = snapOf([["a", { x: 0, y: 0 }]]);
    const to = snapOf([["a", { x: 100, y: 50 }]]);
    const mid = interpolateFrames(from, to, 0.5);
    expect(mid).toHaveLength(1);
    expect(mid[0].x).toBe(50);
    expect(mid[0].y).toBe(25);
  });

  it("falls back to name matching when ids differ (smart animate)", () => {
    const from = snapOf([["Card", { x: 0 }]]);
    const to = snapOf([["moved-id", { x: 80 }]]);
    to.nodes.get("moved-id")!.name = "Card";
    const mid = interpolateFrames(from, to, 0.5);
    expect(mid).toHaveLength(1);
    expect(mid[0].x).toBe(40);
  });

  it("exit-fades nodes missing from the destination", () => {
    const from = snapOf([["gone", {}]]);
    const to = snapOf([]);
    const mid = interpolateFrames(from, to, 0.5);
    expect(mid[0].opacity).toBeCloseTo(0.5);
  });

  it("enter-fades nodes new in the destination", () => {
    const from = snapOf([]);
    const to = snapOf([["new", {}]]);
    const quarter = interpolateFrames(from, to, 0.25);
    expect(quarter[0].opacity).toBeCloseTo(0.25);
  });

  it("crossfades type mismatches without garbage geometry", () => {
    const from = snapOf([["x", {}]]);
    const to = snapOf([["x", {}]]);
    to.nodes.get("x")!.type = "ellipse";
    const mid = interpolateFrames(from, to, 0.5);
    expect(mid).toHaveLength(1);
  });

  it("blends fill colors of matched nodes", () => {
    const from = snapOf([["a", { fill: "#000000" }]]);
    const to = snapOf([["a", { fill: "#ffffff" }]]);
    const mid = interpolateFrames(from, to, 0.5);
    expect(mid[0].fill).toBe("#808080");
  });
});

describe("TransitionRunner", () => {
  it("finishes at the destination frame", () => {
    const runner = new TransitionRunner(
      snapOf([["a", { x: 0 }]]),
      snapOf([["a", { x: 200 }]]),
      { transition: "smart-animate", easing: "linear", duration: 300 },
      { fromW: 800, toW: 800 },
    );
    let frame = runner.tick(150);
    expect(frame.nodes[0].x).toBeCloseTo(100);
    expect(runner.state).toBe("running");
    frame = runner.tick(150);
    expect(runner.state).toBe("done");
    expect(frame.nodes[0].x).toBe(200);
  });

  it("slides use the destination width as the travel distance", () => {
    const runner = new TransitionRunner(
      snapOf([]),
      snapOf([["a", {}]]),
      { transition: "slide-left", easing: "linear", duration: 200 },
      { fromW: 800, toW: 1000 },
    );
    const frame = runner.tick(100);
    expect(frame.dx).toBeCloseTo(500);
  });

  it("dissolve keeps geometry centered (no offset)", () => {
    const runner = new TransitionRunner(
      snapOf([["a", { x: 10 }]]),
      snapOf([["a", { x: 30 }]]),
      { transition: "dissolve", easing: "linear", duration: 100 },
      { fromW: 100, toW: 100 },
    );
    const frame = runner.tick(50);
    expect(frame.dx).toBe(0);
    expect(frame.nodes[0].x).toBeCloseTo(20);
  });

  it("duration 0 jumps immediately to the destination", () => {
    const runner = new TransitionRunner(
      snapOf([["a", {}]]),
      snapOf([["a", { x: 42 }]]),
      { transition: "instant", easing: "linear", duration: 0 },
      { fromW: 10, toW: 10 },
    );
    const frame = runner.tick(16);
    expect(runner.state).toBe("done");
    expect(frame.nodes[0].x).toBe(42);
  });
});

describe("interactions", () => {
  it("returns the node's declared tap interaction", () => {
    const doc = docWith([{ id: "p1", names: [["A", "#111111"], ["B", "#222222"]] }]);
    const node = doc.pages[0].nodes[0];
    node.interactions = [
      { trigger: "tap", toPageId: "p2", transition: "slide-left", easing: "gentle", duration: 400 },
    ];
    const ix = findInteraction(doc, node.id);
    expect(ix).not.toBeNull();
    expect(ix!.toPageId).toBe("p2");
    expect(ix!.duration).toBe(400);
  });

  it("falls back to the next page when no interaction is set", () => {
    const doc = docWith([
      { id: "p1", names: [["A", "#111111"]] },
      { id: "p2", names: [["B", "#222222"]] },
    ]);
    const ix = findInteraction(doc, doc.pages[0].nodes[0].id);
    expect(ix?.toPageId).toBe("p2");
    expect(ix?.transition).toBe("dissolve");
  });

  it("returns null when there is nowhere to go", () => {
    const doc = docWith([{ id: "p1", names: [["A", "#111111"]] }]);
    expect(findInteraction(doc, doc.pages[0].nodes[0].id)).toBeNull();
  });

  it("resolveNavigation keeps the anim spec", () => {
    const doc = docWith([
      { id: "p1", names: [["A", "#111111"]] },
      { id: "p2", names: [["B", "#222222"]] },
    ]);
    doc.pages[0].nodes[0].interactions = [
      { trigger: "tap", toPageId: "p2", transition: "move-in", easing: "bouncy", duration: 500 },
    ];
    const route = resolveNavigation(doc, doc.pages[0].nodes[0].id);
    expect(route?.pageId).toBe("p2");
    expect(route?.anim.transition).toBe("move-in");
    expect(route?.anim.duration).toBe(500);
  });

  it("snapshotPage captures paint order", () => {
    const doc = docWith([{ id: "p1", names: [["Back", "#111111"], ["Front", "#222222"]] }]);
    const snap = snapshotPage(doc, "p1");
    expect(snap.order).toHaveLength(2);
    expect(snap.nodes.get(snap.order[1])!.name).toBe("Front");
  });
});
