// Prototyping animations — Figma's "Prototype" present mode. Pure logic:
// easings, transform interpolation, and a DOM-free transition runner so the
// whole engine is testable in node.

import { activePage, type DesignDoc, type DesignNode, type Transform } from "./geo";

// ---------- Easings ----------

export type EasingId =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "ease-in-back"
  | "ease-out-back"
  | "ease-in-out-back"
  | "gentle"
  | "bouncy"
  | "custom-bezier"
  | "custom-bouncy";

export interface EasingDef {
  id: EasingId;
  label: string;
  bezier: [number, number, number, number];
}

export const EASINGS: EasingDef[] = [
  { id: "linear", label: "Linear", bezier: [0, 0, 1, 1] },
  { id: "ease-in", label: "Ease in", bezier: [0.42, 0, 1, 1] },
  { id: "ease-out", label: "Ease out", bezier: [0, 0, 0.58, 1] },
  { id: "ease-in-out", label: "Ease in-out", bezier: [0.42, 0, 0.58, 1] },
  { id: "ease-in-back", label: "Ease in back", bezier: [0.6, -0.28, 0.735, 0.045] },
  { id: "ease-out-back", label: "Ease out back", bezier: [0.175, 0.885, 0.32, 1.275] },
  { id: "ease-in-out-back", label: "Ease in-out back", bezier: [0.68, -0.55, 0.265, 1.55] },
  { id: "gentle", label: "Gentle", bezier: [0.25, 0.1, 0.25, 1] },
  { id: "bouncy", label: "Bouncy", bezier: [0.34, 1.56, 0.64, 1] },
  { id: "custom-bezier", label: "Custom", bezier: [0.3, 0, 0.7, 1] },
  { id: "custom-bouncy", label: "Custom bouncy", bezier: [0.28, 1.7, 0.5, 1.05] },
];

/** Sample the unit-cubic bezier easing curve at time t. */
export function bezierAt(p: [number, number, number, number], t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const [x1, y1, x2, y2] = p;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(u) - t;
    if (Math.abs(x) < 1e-5) return sampleY(u);
    const d = slopeX(u);
    if (Math.abs(d) < 1e-6) break;
    u -= x / d;
  }
  let lo = 0;
  let hi = 1;
  u = t;
  for (let i = 0; i < 20; i++) {
    const x = sampleX(u);
    if (Math.abs(x - t) < 1e-5) break;
    if (x < t) lo = u;
    else hi = u;
    u = (lo + hi) / 2;
  }
  return sampleY(u);
}

export function easeFn(id: EasingId) {
  const def = EASINGS.find((e) => e.id === id) ?? EASINGS[0];
  return (t: number) => bezierAt(def.bezier, t);
}

// ---------- Interactions ----------

export type TriggerId = "tap" | "hover" | "press" | "drag" | "after-delay";

export type TransitionId =
  | "instant"
  | "dissolve"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "move-in"
  | "move-out"
  | "smart-animate";

export interface Interaction {
  /** Node whose frame is the hotspot (usually a top-level frame). */
  fromId: string;
  trigger: TriggerId;
  /** Destination page id, or null for a node anchor on the same page. */
  toPageId: string | null;
  /** Destination node id (frame anchor) — used when toPageId is null. */
  toNodeId?: string;
  transition: TransitionId;
  easing: EasingId;
  /** Milliseconds; 0 = instant. */
  duration: number;
}

export interface AnimSpec {
  transition: TransitionId;
  easing: EasingId;
  duration: number;
}

export interface ProtoAction {
  type: "navigate" | "back";
  pageId?: string;
  nodeId?: string;
  anim?: AnimSpec;
}

/** Where a hotspot's tap leads, if anywhere. */
export function findInteraction(
  doc: DesignDoc,
  nodeId: string,
  trigger: TriggerId = "tap",
): Interaction | null {
  const page = activePage(doc);
  const node = page.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const ix = (node.interactions ?? []).find((i) => i.trigger === trigger);
  if (ix) {
    return {
      fromId: nodeId,
      trigger,
      toPageId: ix.toPageId ?? null,
      toNodeId: ix.toNodeId,
      transition: (ix.transition as TransitionId) ?? "instant",
      easing: (ix.easing as EasingId) ?? "ease-out",
      duration: ix.duration ?? 300,
    };
  }
  // Fallback: page-level default navigation to the next page.
  const idx = doc.pages.findIndex((p) => p.id === page.id);
  const next = doc.pages[idx + 1];
  if (next) {
    return {
      fromId: nodeId,
      trigger,
      toPageId: next.id,
      toNodeId: undefined,
      transition: "dissolve",
      easing: "ease-out",
      duration: 300,
    };
  }
  return null;
}


const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex2rgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const rgb2hex = (rgb: [number, number, number]) =>
  "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

/** Blend two CSS hex colors (opaque); falls back to b at t>=0.5. */
export function lerpColor(a: string, b: string, t: number): string {
  const ca = hex2rgb(a);
  const cb = hex2rgb(b);
  if (!ca || !cb) return t >= 0.5 ? b : a;
  return rgb2hex([
    lerp(ca[0], cb[0], t),
    lerp(ca[1], cb[1], t),
    lerp(ca[2], cb[2], t),
  ]);
}

export type InterpolatedNode = FrameSnapshotNode;

/**
 * Interpolate two frame snapshots into frame `t` of the transition.
 * - Nodes matched by id first (smart-animate), then by name.
 * - Nodes only in `to` fade/enter; nodes only in `from` fade/exit.
 * - Mismatched types animate as crossfade to keep the whitelist simple.
 */
export function interpolateFrames(
  from: FrameSnapshot,
  to: FrameSnapshot,
  t: number,
): InterpolatedNode[] {
  const out: InterpolatedNode[] = [];
  const usedTo = new Set<string>();

  const findTarget = (n: FrameSnapshotNode): FrameSnapshotNode | undefined => {
    if (to.nodes.has(n.id)) return to.nodes.get(n.id);
    const byName = to.order.map((id) => to.nodes.get(id)!).find((m) => m.name === n.name && !usedTo.has(m.id));
    return byName;
  };

  // Nodes present in both: match by id or name, else exit-fade.
  for (const id of from.order) {
    const a = from.nodes.get(id)!;
    const b = findTarget(a);
    if (!b) {
      out.push({ ...a, opacity: a.opacity * (1 - t) });
      continue;
    }
    usedTo.add(b.id);
    if (a.type !== b.type) {
      out.push(t < 0.5 ? { ...a, opacity: a.opacity * (1 - t * 2) } : { ...b, opacity: b.opacity * ((t - 0.5) * 2) });
      continue;
    }
    out.push({
      ...b,
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      w: lerp(a.w, b.w, t),
      h: lerp(a.h, b.h, t),
      opacity: lerp(a.opacity, b.opacity, t),
      radius: lerp(a.radius, b.radius, t),
      fill: a.fill && b.fill && a.fill !== b.fill ? lerpColor(a.fill, b.fill, t) : b.fill ?? a.fill,
      stroke: b.stroke ?? a.stroke,
      color: b.color ?? a.color,
      text: b.text ?? a.text,
      fontSize: b.fontSize ?? a.fontSize,
    });
  }

  // Nodes only in `to`: enter-fade.
  for (const id of to.order) {
    if (usedTo.has(id)) continue;
    const b = to.nodes.get(id)!;
    out.push({ ...b, opacity: b.opacity * t });
  }
  return out;
}

// ---------- Transition runner (DOM-free) ----------

export interface TransitionFrame {
  /** Rendered nodes for this frame (interpolated). */
  nodes: InterpolatedNode[];
  /** Canvas-space translation applied when painting the frame. */
  dx: number;
  dy: number;
}

export type TransitionRunnerState = "running" | "done";

/**
 * Drives a transition between two page snapshots without touching the DOM:
 * call `tick(dtMs)` until state === "done". Pure enough to unit-test.
 */
export class TransitionRunner {
  readonly from: FrameSnapshot;
  readonly to: FrameSnapshot;
  readonly transition: TransitionId;
  readonly easing: EasingId;
  readonly duration: number;
  private elapsed = 0;
  state: TransitionRunnerState = "running";

  constructor(
    from: FrameSnapshot,
    to: FrameSnapshot,
    spec: AnimSpec,
    /** Bounds of from/to content, for slide offsets. */
    bounds: { fromW: number; toW: number },
  ) {
    this.from = from;
    this.to = to;
    this.transition = spec.transition;
    this.easing = spec.easing;
    this.duration = Math.max(0, spec.duration);
    this.bounds = bounds;
  }

  private bounds: { fromW: number; toW: number };

  tick(dtMs: number): TransitionFrame {
    if (this.state === "done" || this.duration <= 0) {
      this.state = "done";
      return { nodes: snapshotToNodes(this.to), dx: 0, dy: 0 };
    }
    this.elapsed += dtMs;
    if (this.elapsed >= this.duration) {
      this.state = "done";
      return { nodes: snapshotToNodes(this.to), dx: 0, dy: 0 };
    }
    const raw = this.elapsed / this.duration;
    const t = bezierAt(
      (EASINGS.find((e) => e.id === this.easing) ?? EASINGS[0]).bezier,
      raw,
    );
    return this.frameAt(t);
  }

  /** Pure: interpolated frame at progress t (0–1) for the chosen transition. */
  frameAt(t: number): TransitionFrame {
    switch (this.transition) {
      case "instant":
        return { nodes: snapshotToNodes(this.to), dx: 0, dy: 0 };
      case "slide-left":
        return { nodes: snapshotToNodes(this.to), dx: (1 - t) * this.bounds.toW, dy: 0 };
      case "slide-right":
        return { nodes: snapshotToNodes(this.to), dx: -(1 - t) * this.bounds.toW, dy: 0 };
      case "slide-up":
        return { nodes: snapshotToNodes(this.to), dx: 0, dy: (1 - t) * 400 };
      case "slide-down":
        return { nodes: snapshotToNodes(this.to), dx: 0, dy: -(1 - t) * 400 };
      case "move-in":
        return { nodes: interpolateFrames(this.from, this.to, t), dx: (1 - t) * 120, dy: 0 };
      case "move-out":
        return { nodes: interpolateFrames(this.from, this.to, t), dx: -t * 120, dy: 0 };
      case "dissolve":
      case "smart-animate":
      default:
        return { nodes: interpolateFrames(this.from, this.to, t), dx: 0, dy: 0 };
    }
  }
}

/** Convert an interpolated frame back to renderable node shapes. */
export function snapshotToNodes(snap: FrameSnapshot): DesignNode[] {
  const out: DesignNode[] = [];
  for (const id of snap.order) {
    const n = snap.nodes.get(id);
    if (n) out.push(snapshotNodeToDesignNode(n));
  }
  return out;
}

export function snapshotNodeToDesignNode(n: FrameSnapshotNode): DesignNode {
  return {
    id: n.id,
    type: n.type,
    name: n.name,
    x: n.x,
    y: n.y,
    w: n.w,
    h: n.h,
    fill: n.fill,
    stroke: n.stroke,
    strokeWidth: 0,
    radius: n.radius,
    opacity: n.opacity,
    color: n.color ?? undefined,
    text: n.text ?? undefined,
    fontSize: n.fontSize ?? undefined,
  };
}

export interface ProtoRoute {
  pageId: string;
  anim: AnimSpec;
}

/** Resolve the next route for a hotspot click, if any. */
export function resolveNavigation(doc: DesignDoc, nodeId: string): ProtoRoute | null {
  const ix = findInteraction(doc, nodeId, "tap");
  if (!ix) return null;
  const pageId = ix.toPageId ?? doc.pages.find((p) => p.id !== activePage(doc).id)?.id ?? doc.pages[0].id;
  return { pageId, anim: { transition: ix.transition, easing: ix.easing, duration: ix.duration } };
}

// ---------- Snapshot & interpolation ----------

export interface FrameSnapshot {
  nodes: Map<string, FrameSnapshotNode>;
  order: string[];
}

export interface FrameSnapshotNode {
  id: string;
  name: string;
  type: DesignNode["type"];
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  radius: number;
  fill: string | null;
  stroke: string | null;
  strokeWidth?: number;
  color?: string;
  text?: string;
  fontSize?: number;
}

/** Capture a paint-order snapshot of the top-level nodes of a page. */
export function snapshotPage(doc: DesignDoc, pageId: string): FrameSnapshot {
  const page = doc.pages.find((p) => p.id === pageId) ?? doc.pages[0];
  const nodes = new Map<string, FrameSnapshotNode>();
  const order: string[] = [];
  for (const n of page.nodes) {
    order.push(n.id);
    nodes.set(n.id, {
      id: n.id,
      name: n.name,
      type: n.type,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      opacity: n.opacity,
      radius: n.radius,
      fill: n.fill,
      stroke: n.stroke,
      color: n.color,
      text: n.text,
      fontSize: n.fontSize,
    });
  }
  return { nodes, order };
}
