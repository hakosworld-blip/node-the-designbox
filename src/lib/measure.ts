// Measure mode — redlines between two selected nodes (gap + edge distances),
// like Figma's Alt-hover measure. Pure geometry so it is fully testable.

import { nodeBounds, type Bounds, type DesignNode } from "./geo";

export interface AxisGap {
  /** Gap along the x axis: 0 if the ranges overlap. */
  dx: number;
  /** Gap along the y axis: 0 if the ranges overlap. */
  dy: number;
}

/** Edge-to-edge gap between two rects on each axis (0 when overlapping). */
export function axisGaps(a: Bounds, b: Bounds): AxisGap {
  const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return { dx: Math.round(gapX * 100) / 100, dy: Math.round(gapY * 100) / 100 };
}

export interface MeasureResult {
  a: Bounds;
  b: Bounds;
  /** Edge-to-edge gaps per axis (0 when overlapping on that axis). */
  gaps: AxisGap;
  /** Center-to-center distances (always positive). */
  centerDx: number;
  centerDy: number;
  /** True when one node's bounds fully contain the other's. */
  nested: boolean;
}

/** Full measurement between two nodes. */
export function measureNodes(a: DesignNode, b: DesignNode): MeasureResult {
  const ba = nodeBounds(a);
  const bb = nodeBounds(b);
  const nested =
    ba.x <= bb.x &&
    ba.y <= bb.y &&
    ba.x + ba.w >= bb.x + bb.w &&
    ba.y + ba.h >= bb.y + bb.h;
  const cax = ba.x + ba.w / 2;
  const cay = ba.y + ba.h / 2;
  const cbx = bb.x + bb.w / 2;
  const cby = bb.y + bb.h / 2;
  return {
    a: ba,
    b: bb,
    gaps: axisGaps(ba, bb),
    centerDx: Math.round(Math.abs(cbx - cax) * 100) / 100,
    centerDy: Math.round(Math.abs(cby - cay) * 100) / 100,
    nested,
  };
}

/** Human-readable summary used by the measure HUD. */
export function measureSummary(m: MeasureResult): string {
  const parts: string[] = [];
  if (m.nested) {
    parts.push("nested");
  } else {
    if (m.gaps.dx > 0) parts.push(`gap ${m.gaps.dx}`);
    if (m.gaps.dy > 0) parts.push(`gap ${m.gaps.dy}`);
    if (m.gaps.dx === 0 && m.gaps.dy === 0) parts.push("overlapping");
  }
  parts.push(`Δx ${m.centerDx}`, `Δy ${m.centerDy}`);
  return parts.join(" · ");
}
