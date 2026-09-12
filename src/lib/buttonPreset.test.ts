import { describe, expect, it } from "vitest";
import { buildButtonNodes, BUTTON_VARIANTS } from "./buttonPreset";

describe("buildButtonNodes", () => {
  it("builds a frame + label pair", () => {
    const [frame, label] = buildButtonNodes({ text: "Get started" });
    expect(frame.type).toBe("frame");
    expect(label.type).toBe("text");
    expect(label.text).toBe("Get started");
    expect(frame.layout).not.toBeNull();
    expect(frame.layout?.mode).toBe("row");
  });

  it("uses unique ids and matching names", () => {
    const [frame, label] = buildButtonNodes();
    expect(frame.id).not.toBe(label.id);
    expect(frame.name).toContain("Button /");
    expect(label.name).toBe("Label");
  });

  it("respects position and variant colors", () => {
    const [frame, label] = buildButtonNodes({
      x: 120,
      y: 80,
      variant: "danger",
    });
    expect(frame.x).toBe(120);
    expect(frame.y).toBe(80);
    expect(frame.fill).toBe("#ef4444");
    expect(label.color).toBe("#ffffff");
  });

  it("outline variant has border and transparent fill", () => {
    const [frame] = buildButtonNodes({ variant: "outline" });
    expect(frame.fill).toBeNull();
    expect(frame.stroke).toBe("#3f3f46");
    expect(frame.strokeWidth).toBeGreaterThan(0);
  });

  it("clamps tiny sizes", () => {
    const [frame] = buildButtonNodes({ w: 5, h: 2 });
    expect(frame.w).toBeGreaterThanOrEqual(64);
    expect(frame.h).toBeGreaterThanOrEqual(32);
  });

  it("falls back to primary for unknown variant", () => {
    const [frame] = buildButtonNodes({ variant: "neon" });
    expect(frame.fill).toBe("#8b5cf6");
    expect(BUTTON_VARIANTS.length).toBeGreaterThanOrEqual(3);
  });
});
