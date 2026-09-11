/**
 * DesignBox document model — the serialized design file format.
 *
 * A DesignDoc is a flat list of nodes ordered back-to-front (later = on top),
 * organized into named pages. Coordinates are page-space; rendering applies
 * a view transform (pan + zoom) on top.
 */

export type NodeType =
  | "frame"
  | "rect"
  | "ellipse"
  | "line"
  | "text"
  | "image"
  | "polygon";

export interface DesignNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string | null; // css color
  stroke: string | null;
  strokeWidth: number;
  radius: number; // corner radius
  opacity: number; // 0–1
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  align?: "left" | "center" | "right";
  color?: string;
  points?: number; // polygon sides
  src?: string; // image data URL
  locked?: boolean;
  hidden?: boolean;
}

export interface DesignPage {
  id: string;
  name: string;
  nodes: DesignNode[];
}

export interface DesignDoc {
  pages: DesignPage[];
  activePageId: string;
  background: string;
}

export function uid(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export function emptyDoc(): DesignDoc {
  const page: DesignPage = { id: uid("p"), name: "Page 1", nodes: [] };
  return {
    pages: [page],
    activePageId: page.id,
    background: "#101012",
  };
}

export function activePage(doc: DesignDoc): DesignPage {
  return doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
}

export function defaultNode(type: NodeType, x: number, y: number): DesignNode {
  const base: DesignNode = {
    id: uid(type[0]),
    type,
    name:
      type === "rect"
        ? "Rectangle"
        : type === "ellipse"
          ? "Ellipse"
          : type === "text"
            ? "Text"
            : type === "line"
              ? "Line"
              : type === "polygon"
                ? "Polygon"
                : type === "image"
                  ? "Image"
                  : "Frame",
    x,
    y,
    w: type === "text" ? 200 : 140,
    h: type === "line" ? 0 : type === "text" ? 32 : 100,
    fill: type === "frame" ? "#1c1c22" : "#8b5cf6",
    stroke: null,
    strokeWidth: 0,
    radius: type === "frame" ? 12 : 0,
    opacity: 1,
  };
  if (type === "text") {
    base.fill = null;
    base.color = "#f4f4f5";
    base.text = "The quick brown fox";
    base.fontSize = 16;
    base.fontWeight = 500;
    base.align = "left";
  }
  if (type === "polygon") base.points = 3;
  return base;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function nodeBounds(n: DesignNode): Bounds {
  if (n.type === "line") {
    return {
      x: Math.min(n.x, n.x + n.w),
      y: Math.min(n.y, n.y + n.h),
      w: Math.abs(n.w),
      h: Math.max(Math.abs(n.h), 4),
    };
  }
  return { x: n.x, y: n.y, w: n.w, h: n.h };
}

export function unionBounds(nodes: DesignNode[]): Bounds | null {
  if (nodes.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    const b = nodeBounds(n);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Page-space point → topmost node whose bounds contain it. */
export function hitTest(
  doc: DesignDoc,
  px: number,
  py: number,
): DesignNode | null {
  const page = activePage(doc);
  for (let i = page.nodes.length - 1; i >= 0; i--) {
    const n = page.nodes[i];
    if (n.hidden) continue;
    const b = nodeBounds(n);
    const pad = n.type === "line" ? 6 : 0;
    if (
      px >= b.x - pad &&
      px <= b.x + b.w + pad &&
      py >= b.y - pad &&
      py <= b.y + b.h + pad
    ) {
      return n;
    }
  }
  return null;
}

export interface Transform {
  panX: number;
  panY: number;
  zoom: number;
}

export function pageToScreen(t: Transform, x: number, y: number) {
  return { sx: x * t.zoom + t.panX, sy: y * t.zoom + t.panY };
}

export function screenToPage(t: Transform, sx: number, sy: number) {
  return { x: (sx - t.panX) / t.zoom, y: (sy - t.panY) / t.zoom };
}

/** Fit the page's content into a viewport of the given size. */
export function fitTransform(
  doc: DesignDoc,
  viewportW: number,
  viewportH: number,
): Transform {
  const page = activePage(doc);
  const b = unionBounds(page.nodes) ?? { x: 0, y: 0, w: 800, h: 600 };
  const pad = 80;
  const zoom = Math.min(
    2,
    Math.max(
      0.05,
      Math.min(
        (viewportW - pad * 2) / Math.max(b.w, 1),
        (viewportH - pad * 2) / Math.max(b.h, 1),
      ),
    ),
  );
  return {
    zoom,
    panX: viewportW / 2 - (b.x + b.w / 2) * zoom,
    panY: viewportH / 2 - (b.y + b.h / 2) * zoom,
  };
}
