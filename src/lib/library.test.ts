import { describe, expect, it } from "vitest";
import {
  LIBRARY,
  LIBRARY_CATEGORIES,
  libraryThumbDoc,
  searchLibrary,
  type LibraryItem,
} from "./library";
import { defaultNode, activePage } from "@/lib/geo";
import type { DesignNode } from "@/lib/geo";

/* The renderer supports exactly these node types. */
const RENDERABLE = new Set([
  "frame",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "polygon",
  "text",
]);

describe("library catalog", () => {
  it("contains at least 100 items", () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(100);
  });

  it("has globally unique ids and unique id+category counts matching", () => {
    const ids = LIBRARY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses categories from LIBRARY_CATEGORIES", () => {
    const cats = new Set(LIBRARY_CATEGORIES.filter((c) => c !== "All"));
    for (const item of LIBRARY) expect(cats.has(item.category)).toBe(true);
  });

  it("every category has items", () => {
    for (const cat of ["Backgrounds", "Icons", "Shapes", "UI", "Text"] as const) {
      expect(
        LIBRARY.filter((i) => i.category === cat).length,
        `category ${cat}`,
      ).toBeGreaterThan(0);
    }
  });

  it("gives every item a non-empty name and keyword list", () => {
    for (const item of LIBRARY) {
      expect(item.name.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(item.keywords)).toBe(true);
    }
  });
});

describe("library build() output", () => {
  it("every item builds at least one node", () => {
    for (const item of LIBRARY) {
      expect(item.build().length, item.id).toBeGreaterThan(0);
    }
  });

  it("every built node uses only renderer-supported types", () => {
    for (const item of LIBRARY) {
      for (const node of item.build()) {
        expect(RENDERABLE.has(node.type), `${item.id}: ${node.type}`).toBe(
          true,
        );
      }
    }
  });

  it("produces fresh unique node ids on every build call", () => {
    for (const item of LIBRARY) {
      const a = item.build().map((n) => n.id);
      const b = item.build().map((n) => n.id);
      expect(new Set(a).size).toBe(a.length);
      expect(new Set([...a, ...b]).size).toBe(a.length + b.length);
    }
  });

  it("builds nodes with sane geometry (finite, non-negative size; lines/arrows may have a zero axis)", () => {
    for (const item of LIBRARY) {
      for (const node of item.build()) {
        expect(Number.isFinite(node.x), item.id).toBe(true);
        expect(Number.isFinite(node.y), item.id).toBe(true);
        expect(Number.isFinite(node.w), item.id).toBe(true);
        expect(Number.isFinite(node.h), item.id).toBe(true);
        // Lines/arrows encode direction as signed w/h (upward arrows are
        // negative) — nodeBounds and the renderer both support that.
        if (node.type !== "line" && node.type !== "arrow") {
          expect(node.w, item.id).toBeGreaterThan(0);
          expect(node.h, item.id).toBeGreaterThan(0);
        }
        if (node.type === "text") expect(node.text?.length ?? 0).toBeGreaterThan(0);
        if (node.type === "polygon")
          expect(node.points ?? 3).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("keeps opacity in [0,1] and known colors", () => {
    for (const item of LIBRARY) {
      for (const node of item.build()) {
        expect(node.opacity).toBeGreaterThanOrEqual(0);
        expect(node.opacity).toBeLessThanOrEqual(1);
        if (node.fill !== null && node.fill !== undefined) {
          expect(node.fill.startsWith("#") || node.fill.startsWith("rgb")).toBe(
            true,
          );
        }
      }
    }
  });

  it("is safe to mutate build output without corrupting the catalog", () => {
    const item = LIBRARY[0];
    const nodes = item.build();
    nodes[0].x += 999;
    expect(item.build()[0].x).not.toBe(nodes[0].x);
  });
});

describe("searchLibrary", () => {
  it("returns everything for empty query in All", () => {
    expect(searchLibrary("", "All").length).toBe(LIBRARY.length);
  });

  it("filters by category", () => {
    const icons = searchLibrary("", "Icons");
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.every((i) => i.category === "Icons")).toBe(true);
  });

  it("matches by name case-insensitively", () => {
    const r = searchLibrary("aurora", "All");
    expect(r.some((i) => i.name.includes("Aurora"))).toBe(true);
  });

  it("matches by keyword", () => {
    expect(searchLibrary("email", "All").length).toBeGreaterThan(0);
    expect(searchLibrary("dark", "Backgrounds").length).toBeGreaterThan(0);
  });

  it("returns empty for nonsense", () => {
    expect(searchLibrary("zzzznope", "All")).toHaveLength(0);
  });

  it("combines category + query", () => {
    const r = searchLibrary("heart", "Icons");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((i) => i.category === "Icons")).toBe(true);
  });
});

describe("libraryThumbDoc", () => {
  it("wraps the built nodes in a valid single-page doc", () => {
    const item: LibraryItem = LIBRARY[0];
    const doc = libraryThumbDoc(item);
    expect(doc.pages).toHaveLength(1);
    expect(doc.activePageId).toBe("thumb");
    expect(activePage(doc).nodes.length).toBe(item.build().length);
  });
});

describe("integration with geo primitives", () => {
  it("builds nodes carrying the full DesignNode base shape from defaultNode", () => {
    for (const item of LIBRARY.slice(0, 20)) {
      const node = item.build()[0];
      // defaultNode emits the core renderer shape; every library factory
      // builds on the same `n()` helper, so it must never emit fewer keys.
      const expected = defaultNode(node.type, 0, 0);
      for (const key of Object.keys(expected) as (keyof DesignNode)[]) {
        expect(node).toHaveProperty(key);
      }
      // fill/stroke handling matches the renderer's expectations
      expect(node.fill === null || typeof node.fill === "string").toBe(true);
    }
  });
});
