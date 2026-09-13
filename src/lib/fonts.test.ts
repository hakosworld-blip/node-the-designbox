import { describe, expect, it } from "vitest";
import { FONTS, FONT_IDS, getFont } from "./fonts";

describe("FONTS registry", () => {
  it("has unique ids", () => {
    expect(new Set(FONT_IDS).size).toBe(FONT_IDS.length);
  });

  it("covers the four categories", () => {
    const cats = new Set(FONTS.map((f) => f.category));
    expect(cats.has("Sans")).toBe(true);
    expect(cats.has("Serif")).toBe(true);
    expect(cats.has("Mono")).toBe(true);
    expect(cats.has("Display")).toBe(true);
  });

  it("every stack ends in a generic family", () => {
    for (const f of FONTS) {
      const last = f.stack.trim().split(",").pop()!.trim();
      expect(["sans-serif", "serif", "monospace"]).toContain(last);
    }
  });

  it("every stack has at least 3 families for cross-platform coverage", () => {
    for (const f of FONTS) {
      expect(f.stack.split(",").length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("getFont", () => {
  it("resolves by id", () => {
    expect(getFont("mono").category).toBe("Mono");
  });

  it("falls back to the default for unknown/undefined ids", () => {
    expect(getFont("does-not-exist").id).toBe(FONTS[0].id);
    expect(getFont(undefined).id).toBe(FONTS[0].id);
  });
});
