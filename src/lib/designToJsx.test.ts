import { describe, expect, it } from "vitest";
import { defaultNode, type DesignDoc, type DesignNode } from "./geo";
import { docToJsx, pascal } from "./designToJsx";

function docWith(nodes: DesignNode[]): DesignDoc {
  return {
    pages: [{ id: "p1", name: "Page 1", nodes }],
    activePageId: "p1",
    background: "#101012",
  };
}

describe("pascal", () => {
  it("converts arbitrary names to valid identifiers", () => {
    expect(pascal("login card")).toBe("LoginCard");
    expect(pascal("hero-section_v2")).toBe("HeroSectionV2");
    expect(pascal("123 frame")).toBe("Frame");
    expect(pascal("")).toBe("Node");
  });
});

describe("docToJsx (tailwind format)", () => {
  it("emits one component per top-level node", () => {
    const a = defaultNode("rect", 0, 0);
    a.name = "Card";
    const b = defaultNode("text", 0, 0);
    b.name = "Title";
    const { code, componentCount } = docToJsx(docWith([a, b]));
    expect(componentCount).toBe(2);
    expect(code).toContain("export function Card()");
    expect(code).toContain("export function Title()");
  });

  it("maps fills, radii, and size to tailwind arbitrary classes", () => {
    const a = defaultNode("rect", 0, 0);
    a.fill = "#8b5cf6";
    a.radius = 12;
    a.w = 200;
    a.h = 80;
    const { code } = docToJsx(docWith([a]));
    expect(code).toContain("bg-[#8b5cf6]");
    expect(code).toContain("rounded-[12px]");
    expect(code).toContain("w-[200px]");
    expect(code).toContain("h-[80px]");
  });

  it("maps text content, size, and weight", () => {
    const t = defaultNode("text", 0, 0);
    t.text = "Hello <world>";
    t.fontSize = 24;
    t.fontWeight = 700;
    const { code } = docToJsx(docWith([t]));
    expect(code).toContain("text-[24px]");
    expect(code).toContain("font-[700]");
    // text content is JSON-escaped, so < and > stay literal
    expect(code).toContain("Hello <world>");
  });

  it("maps gradients to from-/to- classes", () => {
    const a = defaultNode("rect", 0, 0);
    a.gradient = { from: "#ff0000", to: "#0000ff", angle: 90 };
    const { code } = docToJsx(docWith([a]));
    expect(code).toContain("bg-gradient-to-r");
    expect(code).toContain("from-[#ff0000]");
    expect(code).toContain("to-[#0000ff]");
  });

  it("deduplicates component names", () => {
    const a = defaultNode("rect", 0, 0);
    a.name = "Same";
    const b = defaultNode("rect", 10, 10);
    b.name = "Same";
    const { code } = docToJsx(docWith([a, b]));
    expect(code).toContain("export function Same()");
    expect(code).toContain("export function Same2()");
  });

  it("returns empty for an empty page", () => {
    const { code, componentCount } = docToJsx(docWith([]));
    expect(componentCount).toBe(0);
    expect(code).toBe("");
  });
});

describe("docToJsx (inline format)", () => {
  it("emits style objects with px values", () => {
    const a = defaultNode("rect", 0, 0);
    a.fill = "#123456";
    a.w = 100;
    a.h = 50;
    a.radius = 8;
    const { code } = docToJsx(docWith([a]), { format: "inline" });
    expect(code).toContain('background: "#123456"');
    expect(code).toContain('width: "100px"');
    expect(code).toContain('borderRadius: "8px"');
  });
});
