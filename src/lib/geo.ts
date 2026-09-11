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
  | "arrow"
  | "text"
  | "image"
  | "polygon"
  | "group"
  | "instance";

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
  rotation?: number; // degrees, clockwise
  shadowBlur?: number; // 0 = off
  shadowColor?: string;
  blur?: number; // layer blur, 0 = off
  locked?: boolean;
  hidden?: boolean;
  // Mirror flags (Figma-style flip). Render flips geometry in place.
  flipX?: boolean;
  flipY?: boolean;
  // Groups: child node ids in paint order (back to front).
  children?: string[];
  // Components / instances: every instance points at a component master node.
  componentId?: string;
  // Constraints: how a node follows its frame when the frame resizes.
  constraintH?: "left" | "center" | "right" | "scale";
  constraintV?: "top" | "center" | "bottom" | "scale";
  // Figma-inspired paint extras.
  gradient?: { from: string; to: string; angle: number } | null; // linear fill
  blend?: string; // canvas globalCompositeOperation (multiply, screen, …)
  dash?: number; // dashed stroke length; 0/undefined = solid
  // Auto layout (frames only): children are re-flowed inside the frame.
  layout?: FrameLayout | null;
}

export interface FrameLayout {
  mode: "row" | "column";
  gap: number;
  padding: number;
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
  return (
    doc.pages.find((p) => p.id === doc.activePageId) ??
    doc.pages[0] ?? { id: "empty", name: "Page 1", nodes: [] }
  );
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
              : type === "arrow"
                ? "Arrow"
                : type === "polygon"
                  ? "Polygon"
                  : type === "image"
                    ? "Image"
                    : type === "group"
                      ? "Group"
                      : "Frame",
    x,
    y,
    w: type === "text" ? 200 : 140,
    h: type === "line" || type === "arrow" ? 0 : type === "text" ? 32 : 100,
    fill: type === "frame" ? "#1c1c22" : "#8b5cf6",
    stroke: type === "arrow" ? "#a1a1aa" : null,
    strokeWidth: type === "arrow" ? 2 : 0,
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
  if (n.type === "line" || n.type === "arrow") {
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

/** Rotate a page-space point into a node's local (unrotated) space. */
function pointInLocalSpace(n: DesignNode, px: number, py: number) {
  const rot = ((n.rotation ?? 0) * Math.PI) / 180;
  if (!rot) return { x: px, y: py };
  const b = nodeBounds(n);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
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
    // Groups are containers: hit-test their children instead.
    if (n.type === "group") continue;
    const p = pointInLocalSpace(n, px, py);
    const b = nodeBounds(n);
    const pad = n.type === "line" || n.type === "arrow" ? 6 : 0;
    if (
      p.x >= b.x - pad &&
      p.x <= b.x + b.w + pad &&
      p.y >= b.y - pad &&
      p.y <= b.y + b.h + pad
    ) {
      return n;
    }
  }
  return null;
}

/** The group containing the given node, if any. */
export function groupOf(page: DesignPage, nodeId: string): DesignNode | null {
  return (
    page.nodes.find(
      (n) => n.type === "group" && (n.children ?? []).includes(nodeId),
    ) ?? null
  );
}

/** Union bounds of a set of nodes (empty → null). */
export function boundsOfNodes(nodes: DesignNode[]): Bounds | null {
  return unionBounds(nodes);
}

/**
 * Snap candidates for the active page: node edges and centers, page origin.
 * Used by the editor for smart guides.
 */
export interface SnapAxis {
  value: number; // page-space coordinate
  kind: "edge" | "center";
  nodeId: string;
}

export function snapTargets(page: DesignPage, excludeIds: string[]) {
  const xs: SnapAxis[] = [{ value: 0, kind: "edge", nodeId: "" }];
  const ys: SnapAxis[] = [{ value: 0, kind: "edge", nodeId: "" }];
  for (const n of page.nodes) {
    if (excludeIds.includes(n.id) || n.hidden || n.type === "group") continue;
    const b = nodeBounds(n);
    xs.push({ value: b.x, kind: "edge", nodeId: n.id });
    xs.push({ value: b.x + b.w, kind: "edge", nodeId: n.id });
    xs.push({ value: b.x + b.w / 2, kind: "center", nodeId: n.id });
    ys.push({ value: b.y, kind: "edge", nodeId: n.id });
    ys.push({ value: b.y + b.h, kind: "edge", nodeId: n.id });
    ys.push({ value: b.y + b.h / 2, kind: "center", nodeId: n.id });
  }
  return { xs, ys };
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

/**
 * Re-flow children of every frame that has auto layout enabled. Children are
 * the nodes whose center sits inside the frame; they are sorted along the
 * layout axis and stacked from the frame's padded origin with an even gap.
 * Dragging a child along the axis re-sorts it — a live, drag-to-reorder feel.
 */
export function applyAutoLayouts(doc: DesignDoc): DesignDoc {
  let changed = false;
  const pages = doc.pages.map((p) => {
    const frames = p.nodes.filter((n) => n.type === "frame" && n.layout);
    if (frames.length === 0) return p;
    let nodes = p.nodes;
    for (const f of frames) {
      const lay = f.layout!;
      const pad = Math.max(0, lay.padding || 0);
      const gap = Math.max(0, lay.gap || 0);
      const kids = nodes
        .filter(
          (n) =>
            n.id !== f.id &&
            !n.locked &&
            !n.hidden &&
            n.type !== "group" &&
            n.x + n.w / 2 > f.x &&
            n.x + n.w / 2 < f.x + f.w &&
            n.y + n.h / 2 > f.y &&
            n.y + n.h / 2 < f.y + f.h,
        )
        .sort((a, b) => (lay.mode === "row" ? a.x - b.x : a.y - b.y));
      if (kids.length === 0) continue;
      let cursor = (lay.mode === "row" ? f.x : f.y) + pad;
      const moved = new Map<string, { x?: number; y?: number }>();
      for (const k of kids) {
        if (lay.mode === "row") {
          const y = f.y + (f.h - k.h) / 2;
          if (Math.abs(k.x - cursor) > 0.5 || Math.abs(k.y - y) > 0.5)
            moved.set(k.id, { x: cursor, y });
          cursor += k.w + gap;
        } else {
          const x = f.x + (f.w - k.w) / 2;
          if (Math.abs(k.x - x) > 0.5 || Math.abs(k.y - cursor) > 0.5)
            moved.set(k.id, { x, y: cursor });
          cursor += k.h + gap;
        }
      }
      if (moved.size > 0) {
        changed = true;
        nodes = nodes.map((n) =>
          moved.has(n.id) ? { ...n, ...moved.get(n.id) } : n,
        );
      }
    }
    return nodes === p.nodes ? p : { ...p, nodes };
  });
  return changed ? { ...doc, pages } : doc;
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
