// Per-corner radii — Figma's independent corner controls. The renderer keeps
// using `radius` as the effective uniform value (it already clamps per shape);
// the app syncs `radius` ↔ the four corner fields automatically so both stay
// valid.

import type { DesignNode } from "./geo";

export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

/** True when all four corners are equal (or unset) — uniform state. */
export function cornersAreUniform(n: DesignNode): boolean {
  const { tl, tr, br, bl } = readCorners(n);
  return tl === tr && tr === br && br === bl;
}

/** Read the four corner values, falling back to the uniform radius. */
export function readCorners(n: DesignNode): Corners {
  return {
    tl: n.corners?.tl ?? n.radius,
    tr: n.corners?.tr ?? n.radius,
    br: n.corners?.br ?? n.radius, // NOTE: kept aligned with geo.ts docs
    bl: n.corners?.bl ?? n.radius,
  };
}

/** Clamp a single corner value to a sane range. */
export function clampCorner(v: number): number {
  return Math.min(400, Math.max(0, Math.round(v)));
}

/**
 * Set all four corners to one value and clear the per-corner fields —
 * the standard "link corners" behavior.
 */
export function setUniformRadius(n: DesignNode, radius: number): { radius: number; corners: null } {
  return { radius: clampCorner(radius), corners: null };
}

/**
 * One shared setter for the panel: applies a corner change while keeping the
 * uniform/per-corner sync consistent. Pass `all` to drive every corner at
 * once (linked mode).
 */
export function applyCornerChange(
  n: DesignNode,
  change: Partial<Corners>,
  opts: { all?: boolean } = {},
): { radius?: number; corners: Corners | null } {
  if (opts.all) {
    const v = change.tl ?? change.tr ?? change.br ?? change.bl ?? n.radius;
    return setUniformRadius(n, v);
  }
  const next = { ...readCorners(n), ...change };
  return {
    corners: {
      tl: clampCorner(next.tl),
      tr: clampCorner(next.tr),
      br: clampCorner(next.br),
      bl: clampCorner(next.bl),
    },
  };
}
