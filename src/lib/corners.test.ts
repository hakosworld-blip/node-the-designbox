import { describe, expect, it } from "vitest";
import {
  applyCornerChange,
  clampCorner,
  cornersAreUniform,
  readCorners,
  setUniformRadius,
} from "./corners";
import { defaultNode } from "./geo";

describe("readCorners", () => {
  it("falls back to the uniform radius", () => {
    const n = defaultNode("rect", 0, 0);
    n.radius = 12;
    expect(readCorners(n)).toEqual({ tl: 12, tr: 12, br: 12, bl: 12 });
  });

  it("reads per-corner overrides", () => {
    const n = defaultNode("rect", 0, 0);
    n.radius = 0;
    n.corners = { tl: 20, tr: 0, br: 0, bl: 8 };
    expect(readCorners(n).tl).toBe(20);
    expect(readCorners(n).bl).toBe(8);
  });
});

describe("cornersAreUniform", () => {
  it("is true with no per-corner data", () => {
    const n = defaultNode("rect", 0, 0);
    expect(cornersAreUniform(n)).toBe(true);
  });

  it("is false when one corner differs", () => {
    const n = defaultNode("rect", 0, 0);
    n.corners = { tl: 16, tr: 16, br: 16, bl: 0 };
    expect(cornersAreUniform(n)).toBe(false);
  });
});

describe("setUniformRadius", () => {
  it("sets radius and clears per-corner data", () => {
    const n = defaultNode("rect", 0, 0);
    n.corners = { tl: 20, tr: 0, br: 0, bl: 8 };
    const patch = setUniformRadius(n, 24);
    expect(patch).toEqual({ radius: 24, corners: null });
  });

  it("clamps values", () => {
    const n = defaultNode("rect", 0, 0);
    expect(setUniformRadius(n, 9999).radius).toBe(400);
    expect(setUniformRadius(n, -5).radius).toBe(0);
  });
});

describe("applyCornerChange", () => {
  it("linked mode (all) drives every corner at once", () => {
    const n = defaultNode("rect", 0, 0);
    n.corners = { tl: 20, tr: 0, br: 0, bl: 8 };
    const patch = applyCornerChange(n, { tl: 10 }, { all: true });
    expect(patch.radius).toBe(10);
    expect(patch.corners).toBeNull();
  });

  it("per-corner mode keeps the other corners", () => {
    const n = defaultNode("rect", 0, 0);
    n.radius = 4;
    const patch = applyCornerChange(n, { br: 28 });
    expect(patch.corners).toEqual({ tl: 4, tr: 4, br: 28, bl: 4 });
  });

  it("clamps negative and huge values per corner", () => {
    const n = defaultNode("rect", 0, 0);
    const patch = applyCornerChange(n, { tl: -3, tr: 10000 });
    expect(patch.corners!.tl).toBe(0);
    expect(patch.corners!.tr).toBe(400);
  });
});

describe("clampCorner", () => {
  it("rounds and clamps", () => {
    expect(clampCorner(7.6)).toBe(8);
    expect(clampCorner(-1)).toBe(0);
    expect(clampCorner(5000)).toBe(400);
  });
});
