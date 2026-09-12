// AI design ops — adapted from OpenPencil's AI tool architecture
// (upstream/src/app/ai/tools), reimplemented for Node's zustand store.
// The model returns JSON "ops"; this module validates and applies them to
// the canvas in one undoable step.

import type { DesignNode, NodeType } from "./geo";
import { uid, defaultNode } from "./geo";
import { useEditor } from "./store";

export interface AiOp {
  op: "create" | "update" | "delete";
  id?: string;
  type?: string;
  name?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: string;
  rotation?: number;
  points?: number;
  hidden?: boolean;
}

export interface AiPlan {
  ops: AiOp[];
  say: string;
}

export interface AppliedOps {
  created: number;
  updated: number;
  deleted: number;
}

const TYPES = new Set<NodeType>([
  "frame",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "text",
  "polygon",
]);

const FIELDS = new Set([
  "name",
  "x",
  "y",
  "w",
  "h",
  "fill",
  "stroke",
  "strokeWidth",
  "radius",
  "opacity",
  "text",
  "fontSize",
  "fontWeight",
  "color",
  "align",
  "rotation",
  "points",
  "hidden",
]);

export function sanitizeColor(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return s;
  if (/^rgba?\(/.test(s)) return s;
  if (/^hsl\(/.test(s)) return s;
  return null;
}

export function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(v: unknown): number {
  return Math.min(1, Math.max(0, num(v, 1)));
}

function toAlign(v: unknown): "left" | "center" | "right" | undefined {
  return v === "left" || v === "center" || v === "right" ? v : undefined;
}

/** Validate one op against the whitelist; returns null if unusable. */
export function validateOp(raw: unknown): AiOp | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const op = o.op;
  if (op !== "create" && op !== "update" && op !== "delete") return null;
  const out: AiOp = { op };
  if (typeof o.id === "string") out.id = o.id;
  if (op !== "delete") {
    for (const key of FIELDS) {
      if (o[key] !== undefined && o[key] !== null) {
        (out as unknown as Record<string, unknown>)[key] = o[key];
      }
    }
  }
  return out;
}

/** Parse raw model output (string or object) into an AiPlan. */
export function parsePlan(raw: string | object): AiPlan | null {
  let obj: unknown;
  if (typeof raw === "string") {
    // Tolerate markdown fences around the JSON.
    const stripped = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "");
    try {
      obj = JSON.parse(stripped);
    } catch {
      return null;
    }
  } else {
    obj = raw;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const opsRaw = Array.isArray(o.ops) ? o.ops : [];
  const ops = opsRaw.map(validateOp).filter((x): x is AiOp => x !== null);
  return { ops, say: typeof o.say === "string" ? o.say : "" };
}

export function opToNode(op: AiOp, i: number): DesignNode | null {
  const type = (TYPES.has(op.type as NodeType) ? op.type : "rect") as NodeType;
  const n = defaultNode(type, num(op.x, 40), num(op.y, 40));
  n.id = uid(type);
  n.name = typeof op.name === "string" && op.name ? op.name : `${type} ${i + 1}`;
  n.fill = sanitizeColor(op.fill) ?? "#8b5cf6";
  n.stroke = sanitizeColor(op.stroke);
  n.opacity = clamp01(op.opacity);
  n.strokeWidth = num(op.strokeWidth, 1);
  if (type === "line" || type === "arrow") {
    n.w = num(op.w, 120);
    n.h = 0;
  } else {
    n.w = num(op.w, 160);
    n.h = num(op.h, type === "text" ? 24 : 120);
    n.radius = Math.max(0, num(op.radius, 0));
  }
  if (type === "text") {
    n.text = typeof op.text === "string" ? op.text : "Text";
    n.fontSize = Math.max(6, num(op.fontSize, 16));
    n.fontWeight = Math.max(100, num(op.fontWeight, 400));
    n.color = sanitizeColor(op.color) ?? "#ffffff";
    const align = toAlign(op.align);
    if (align) n.align = align;
  }
  if (type === "polygon") {
    n.points = Math.min(24, Math.max(3, Math.round(num(op.points, 6))));
  }
  if (op.hidden === true) n.hidden = true;
  if (op.rotation) n.rotation = num(op.rotation, 0);
  return n;
}

/** Build a node patch (for update ops) from whitelisted fields. */
export function opToPatch(op: AiOp): Partial<DesignNode> {
  const patch: Record<string, unknown> = {};
  if (op.name !== undefined) patch.name = String(op.name);
  if (op.x !== undefined) patch.x = num(op.x, 0);
  if (op.y !== undefined) patch.y = num(op.y, 0);
  if (op.w !== undefined) patch.w = Math.max(1, num(op.w, 1));
  if (op.h !== undefined) patch.h = Math.max(0, num(op.h, 1));
  if (op.fill !== undefined) patch.fill = sanitizeColor(op.fill);
  if (op.stroke !== undefined) patch.stroke = sanitizeColor(op.stroke);
  if (op.strokeWidth !== undefined) patch.strokeWidth = Math.max(0, num(op.strokeWidth, 1));
  if (op.radius !== undefined) patch.radius = Math.max(0, num(op.radius, 0));
  if (op.opacity !== undefined) patch.opacity = clamp01(op.opacity);
  if (op.text !== undefined) patch.text = String(op.text);
  if (op.fontSize !== undefined) patch.fontSize = Math.max(6, num(op.fontSize, 16));
  if (op.fontWeight !== undefined) patch.fontWeight = Math.max(100, num(op.fontWeight, 400));
  if (op.color !== undefined) patch.color = sanitizeColor(op.color);
  if (op.align !== undefined) patch.align = toAlign(op.align);
  if (op.rotation !== undefined) patch.rotation = num(op.rotation, 0);
  if (op.points !== undefined)
    patch.points = Math.min(24, Math.max(3, Math.round(num(op.points, 6))));
  if (op.hidden !== undefined) patch.hidden = op.hidden === true;
  return patch;
}

/**
 * Apply a plan to the canvas: creates/updates/deletes in one undoable step
 * (single history push, matching the library-insert pattern).
 */
export function applyPlan(plan: AiPlan): AppliedOps {
  const store = useEditor.getState();
  const created: DesignNode[] = [];
  const updates: { id: string; patch: Partial<DesignNode> }[] = [];
  const deletes: string[] = [];
  let i = 0;

  for (const op of plan.ops) {
    if (op.op === "create") {
      const node = opToNode(op, i++);
      if (node) created.push(node);
    } else if (op.op === "update" && op.id) {
      updates.push({ id: op.id, patch: opToPatch(op) });
    } else if (op.op === "delete" && op.id) {
      deletes.push(op.id);
    }
  }

  if (created.length === 0 && updates.length === 0 && deletes.length === 0) {
    return { created: 0, updated: 0, deleted: 0 };
  }

  const preDoc = store.doc;
  const basePastLen = store.past.length;

  for (const node of created) store.addNode(node);
  if (updates.length > 0) {
    const ids = updates.map((u) => u.id);
    const merged: Partial<DesignNode> = Object.assign(
      {},
      ...updates.map((u) => u.patch),
    );
    store.updateNodesLive(ids, merged);
  }
  if (deletes.length > 0) store.deleteNodes(deletes);

  // Collapse the multi-action sequence into a single undo step.
  const after = useEditor.getState();
  useEditor.setState({
    past: [...after.past.slice(0, basePastLen), preDoc],
    future: [],
    dirty: true,
  });

  return {
    created: created.length,
    updated: updates.length,
    deleted: deletes.length,
  };
}
