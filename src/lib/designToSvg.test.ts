import { describe, expect, it } from "vitest";
import { defaultNode, type DesignDoc, type DesignNode } from "./geo";
import { docToSvg, nodeToSvg, nodesToSvgBody } from "./designToSvg";

function docWith(nodes: DesignNode[]): DesignDoc {
  return {
    pages: [{ id: "p1", name: "Page 1", nodes }],
    activePageId: "p1",
    background: "#ffffff",
  };
}

describe("nodesToSvgBody", () => {
  it("renders a rect with fill, stroke, and radius", () => {
    const r = defaultNode("rect", 10, 20);
    r.w = 100;
    r.h = 50;
    r.fill = "#ff0000";
    r.stroke = "#000000";
    r.radius = 8;
    const svg = nodesToSvgBody([r]);
    expect(svg).toContain('<rect x="10" y="20" width="100" height="50" rx="8"');
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('stroke="#000000"');
  });

  it("renders text with font properties and alignment", () => {
    const t = defaultNode("text", 0, 0);
    t.w = 200;
    t.h = 24;
    t.text = "Hello";
    t.fontSize = 24;
    t.fontWeight = 700;
    t.align = "center";
    const svg = nodesToSvgBody([t]);
    expect(svg).toContain('font-size="24"');
    expect(svg).toContain('font-weight="700"');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain(">Hello</text>");
  });

  it("escapes XML-special characters in text", () => {
    const t = defaultNode("text", 0, 0);
    t.text = 'a < b & "c"';
    const svg = nodesToSvgBody([t]);
    expect(svg).toContain("a &lt; b &amp; &quot;c&quot;");
    expect(svg).not.toContain("< b &");
  });

  it("skips hidden nodes and containers", () => {
    const g = defaultNode("group", 0, 0);
    const hidden = defaultNode("rect", 0, 0);
    hidden.hidden = true;
    const svg = nodesToSvgBody([g, hidden]);
    expect(svg).toBe("");
  });

  it("renders a polygon with the right number of points", () => {
    const p = defaultNode("polygon", 0, 0);
    p.w = 100;
    p.h = 100;
    p.points = 5;
    const svg = nodesToSvgBody([p]);
    const count = (svg.match(/[\d.-]+,[\d.-]+/g) ?? []).length;
    expect(count).toBe(5);
  });
});

describe("docToSvg", () => {
  it("produces a standalone document sized to content", () => {
    const r = defaultNode("rect", 40, 60);
    r.w = 120;
    r.h = 80;
    const svg = docToSvg(docWith([r]));
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('viewBox="38 58');
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("includes gradient defs and references them", () => {
    const r = defaultNode("rect", 0, 0);
    r.gradient = { from: "#000000", to: "#ffffff", angle: 90 };
    const svg = docToSvg(docWith([r]));
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain(`url(#grad-${r.id})`);
  });

  it("falls back to a default viewBox for an empty page", () => {
    const svg = docToSvg(docWith([]));
    expect(svg).toContain('viewBox="-2 -2 804 604"');
  });
});

describe("nodeToSvg", () => {
  it("exports a single node tightly cropped", () => {
    const r = defaultNode("rect", 100, 100);
    r.w = 50;
    r.h = 50;
    const svg = nodeToSvg(r);
    expect(svg).toContain('viewBox="98 98 54 54"');
  });
});
