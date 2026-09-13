import { describe, expect, it } from "vitest";
import { COMPONENT_PRESETS, getPreset } from "./componentPresets";

describe("COMPONENT_PRESETS registry", () => {
  it("exposes at least 12 presets across 4 categories", () => {
    expect(COMPONENT_PRESETS.length).toBeGreaterThanOrEqual(12);
    const cats = new Set(COMPONENT_PRESETS.map((p) => p.category));
    expect(cats.size).toBe(4);
  });

  it("has unique ids and labels", () => {
    expect(new Set(COMPONENT_PRESETS.map((p) => p.id)).size).toBe(COMPONENT_PRESETS.length);
    expect(new Set(COMPONENT_PRESETS.map((p) => p.label)).size).toBe(COMPONENT_PRESETS.length);
  });

  it("getPreset resolves and falls back to undefined", () => {
    expect(getPreset("input")?.label).toBe("Input field");
    expect(getPreset("nope")).toBeUndefined();
  });
});

describe("preset builders", () => {
  it.each(COMPONENT_PRESETS.map((p) => [p.id, p] as const))(
    "%s builds valid nodes",
    (_id, preset) => {
      const nodes = preset.build(100, 200);
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      for (const n of nodes) {
        expect(n.id).toBeTruthy();
        expect(n.name).toBeTruthy();
        expect(Number.isFinite(n.x)).toBe(true);
        expect(Number.isFinite(n.y)).toBe(true);
        expect(Number.isFinite(n.w)).toBe(true);
        expect(n.w).toBeGreaterThan(0);
        expect(n.h).toBeGreaterThan(0);
        expect(n.opacity).toBeGreaterThan(0);
      }
    },
  );

  it("every node lands at the requested origin offset", () => {
    for (const preset of COMPONENT_PRESETS) {
      const nodes = preset.build(500, 300);
      for (const n of nodes) {
        // Nodes belong to a 600x400 region starting at the drop point;
        // small overhangs (e.g. slider knobs) are intentional.
        expect(n.x).toBeGreaterThanOrEqual(499 - 8);
        expect(n.y).toBeGreaterThanOrEqual(299 - 8);
      }
    }
  });

  it("input has a placeholder label", () => {
    const nodes = getPreset("input")!.build(0, 0);
    const texts = nodes.filter((n) => n.type === "text");
    expect(texts.length).toBe(1);
    expect(texts[0].text).toBe("Placeholder");
  });

  it("toggle knob fits inside the track", () => {
    const [track, knob] = getPreset("toggle")!.build(0, 0);
    expect(knob.w).toBeLessThanOrEqual(track.h);
    expect(knob.x).toBeGreaterThanOrEqual(track.x);
    expect(knob.x + knob.w).toBeLessThanOrEqual(track.x + track.w + 0.01);
  });

  it("card includes a title and body", () => {
    const nodes = getPreset("card")!.build(0, 0);
    const names = nodes.map((n) => n.name);
    expect(names).toContain("Title");
    expect(names).toContain("Body");
  });

  it("navbar has three links", () => {
    const nodes = getPreset("navbar")!.build(0, 0);
    const links = nodes.filter((n) => n.name.startsWith("Link / "));
    expect(links).toHaveLength(3);
  });

  it("table builds a 3x3 grid of cells", () => {
    const nodes = getPreset("table")!.build(0, 0);
    const headers = nodes.filter((n) => n.name.startsWith("Header / "));
    const cells = nodes.filter((n) => n.name.startsWith("Cell "));
    expect(headers).toHaveLength(3);
    expect(cells).toHaveLength(6);
  });

  it("fab is circular with a shadow", () => {
    const [frame] = getPreset("fab")!.build(0, 0);
    expect(frame.radius).toBeGreaterThanOrEqual(frame.w / 2 - 1);
    expect(frame.shadowBlur).toBeGreaterThan(0);
  });
});
