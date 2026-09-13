// SVG export — serialize a design document (or a single node) to a standalone
// SVG string. Mirrors the canvas renderer's paint order and visual properties.

import { activePage, nodeBounds, type DesignDoc, type DesignNode } from "./geo";

const SCALAR = 2; // export padding around content

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fillOf(n: DesignNode): string {
  if (n.gradient) {
    return "url(#grad-" + n.id + ")";
  }
  return n.fill ?? "none";
}

function strokeAttrs(n: DesignNode): string {
  if (!n.stroke) return "";
  const w = n.strokeWidth ?? 1;
  const dash = n.dash && n.dash > 0 ? ` stroke-dasharray="${n.dash} ${n.dash}"` : "";
  return ` stroke="${n.stroke}" stroke-width="${w}"${dash}`;
}

function commonAttrs(n: DesignNode): string {
  const opacity = n.opacity < 1 ? ` opacity="${n.opacity}"` : "";
  return opacity;
}

function shapeElement(n: DesignNode): string {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  const rot = n.rotation ? ` transform="rotate(${n.rotation} ${cx} ${cy})"` : "";

  switch (n.type) {
    case "rect":
    case "frame":
    case "image": {
      return `<rect x="${n.x}" y="${n.y}" width="${Math.max(n.w, 0)}" height="${Math.max(n.h, 0)}" rx="${n.radius || 0}" fill="${fillOf(n)}"${strokeAttrs(n)}${rot}/>`;
    }
    case "ellipse": {
      return `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(n.w / 2, 0)}" ry="${Math.max(n.h / 2, 0)}" fill="${fillOf(n)}"${strokeAttrs(n)}${rot}/>`;
    }
    case "line": {
      return `<line x1="${n.x}" y1="${n.y}" x2="${n.x + n.w}" y2="${n.y}" stroke="${n.stroke ?? "#000"}" stroke-width="${n.strokeWidth ?? 1}"${n.dash && n.dash > 0 ? ` stroke-dasharray="${n.dash} ${n.dash}"` : ""}/>`;
    }
    case "arrow": {
      const x2 = n.x + n.w;
      const y2 = n.y + (n.h ?? 0);
      const hx = x2 - Math.min(10, Math.abs(n.w) * 0.2);
      return `<line x1="${n.x}" y1="${n.y}" x2="${x2}" y2="${y2}" stroke="${n.stroke ?? "#000"}" stroke-width="${n.strokeWidth ?? 1}"/><polyline points="${hx},${y2 - 4} ${x2},${y2} ${hx},${y2 + 4}" fill="none" stroke="${n.stroke ?? "#000"}" stroke-width="${n.strokeWidth ?? 1}"/>`;
    }
    case "polygon": {
      const sides = Math.max(3, Math.min(24, n.points ?? 6));
      const rx = n.w / 2;
      const ry = n.h / 2;
      const pts: string[] = [];
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        pts.push(`${(cx + rx * Math.cos(a)).toFixed(2)},${(cy + ry * Math.sin(a)).toFixed(2)}`);
      }
      return `<polygon points="${pts.join(" ")}" fill="${fillOf(n)}"${strokeAttrs(n)}${rot}/>`;
    }
    case "text": {
      const weight = n.fontWeight ?? 400;
      const size = n.fontSize ?? 16;
      const anchor =
        n.align === "center" ? "middle" : n.align === "right" ? "end" : "start";
      const tx =
        n.align === "center" ? cx : n.align === "right" ? n.x + n.w : n.x;
      return `<text x="${tx}" y="${n.y + size * 0.9}" font-family="Inter, system-ui, sans-serif" font-size="${size}" font-weight="${weight}" fill="${n.color ?? "#000"}" text-anchor="${anchor}"${rot}>${esc(n.text ?? "")}</text>`;
    }
    default:
      return "";
  }
}

function defsFor(nodes: DesignNode[]): string {
  const grads = nodes.filter((n) => n.gradient);
  if (grads.length === 0) return "";
  const stops = grads
    .map((n) => {
      const a = ((n.gradient!.angle ?? 0) * Math.PI) / 180;
      const x1 = 50 - Math.cos(a) * 50;
      const y1 = 50 - Math.sin(a) * 50;
      const x2 = 50 + Math.cos(a) * 50;
      const y2 = 50 + Math.sin(a) * 50;
      return `<linearGradient id="grad-${n.id}" x1="${x1.toFixed(1)}%" y1="${y1.toFixed(1)}%" x2="${x2.toFixed(1)}%" y2="${y2.toFixed(1)}%"><stop offset="0%" stop-color="${n.gradient!.from}"/><stop offset="100%" stop-color="${n.gradient!.to}"/></linearGradient>`;
    })
    .join("");
  return `<defs>${stops}</defs>`;
}

/** Serialize a list of nodes (paint order preserved) into SVG markup. */
export function nodesToSvgBody(nodes: DesignNode[], indent = "  "): string {
  return nodes
    .filter((n) => !n.hidden && n.type !== "group")
    .map((n) => indent + shapeElement(n))
    .join("\n");
}

/** Full standalone SVG document for a design doc's active page. */
export function docToSvg(doc: DesignDoc): string {
  const page = activePage(doc);
  const nodes = page.nodes;
  const bounds = nodes.length
    ? nodes
        .map(nodeBounds)
        .reduce(
          (acc, b) => ({
            x: Math.min(acc.x, b.x),
            y: Math.min(acc.y, b.y),
            r: Math.max(acc.r, b.x + b.w),
            b: Math.max(acc.b, b.y + b.h),
          }),
          { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity },
        )
    : { x: 0, y: 0, r: 800, b: 600 };
  const pad = SCALAR;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const w = Math.max(bounds.r - bounds.x + pad * 2, 1);
  const h = Math.max(bounds.b - bounds.y + pad * 2, 1);
  const defs = defsFor(nodes);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">`,
    defs,
    nodesToSvgBody(nodes),
    "</svg>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Standalone SVG for a single node, tightly cropped. */
export function nodeToSvg(n: DesignNode): string {
  const b = nodeBounds(n);
  const pad = SCALAR;
  const x = b.x - pad;
  const y = b.y - pad;
  const w = Math.max(b.w + pad * 2, 1);
  const h = Math.max(b.h + pad * 2, 1);
  const defs = defsFor([n]);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">`,
    defs,
    nodesToSvgBody([n]),
    "</svg>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Trigger a browser download of an SVG string. */
export function downloadSvg(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".svg") ? fileName : fileName + ".svg";
  a.click();
  URL.revokeObjectURL(url);
}
