// Find & Replace across the active page: searches layer names and text-node
// content, returns matches for navigation, and applies replacements as one
// undoable step (single history push, like AI ops).

import { activePage, type DesignDoc, type DesignNode } from "./geo";
import { useEditor } from "./store";

export interface FindMatch {
  nodeId: string;
  kind: "name" | "text";
  /** Field value before replacement (for display). */
  before: string;
}

export interface FindState {
  query: string;
  matches: FindMatch[];
  index: number;
}

/** Collect matches for a query across the active page. Case-insensitive. */
export function findMatches(doc: DesignDoc, query: string): FindMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const nodes = activePage(doc).nodes;
  const out: FindMatch[] = [];
  for (const n of nodes) {
    if (n.name?.toLowerCase().includes(q)) {
      out.push({ nodeId: n.id, kind: "name", before: n.name });
    }
    if (
      n.type === "text" &&
      n.text &&
      n.text.toLowerCase().includes(q)
    ) {
      out.push({ nodeId: n.id, kind: "text", before: n.text });
      continue; // one match entry per node even if both fields hit
    }
  }
  return out;
}

function applyToField(
  value: string,
  query: string,
  replacement: string,
  caseSensitive: boolean,
): string {
  if (caseSensitive) {
    return value.split(query).join(replacement);
  }
  // Case-insensitive: build a regex from the escaped query.
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(escaped, "gi"), replacement);
}

/**
 * Replace across the active page. Returns the number of nodes changed.
 * Applied as ONE undoable step (single history push).
 */
export function replaceAll(
  query: string,
  replacement: string,
  caseSensitive = false,
): number {
  const q = query.trim();
  if (!q) return 0;
  const s = useEditor.getState();
  const nodes = activePage(s.doc).nodes;
  const updates: { id: string; patch: Partial<DesignNode> }[] = [];

  for (const n of nodes) {
    const patch: Partial<DesignNode> = {};
    if (n.name && n.name.toLowerCase().includes(q.toLowerCase())) {
      const next = applyToField(n.name, q, replacement, caseSensitive);
      if (next !== n.name) patch.name = next;
    }
    if (
      n.type === "text" &&
      n.text &&
      n.text.toLowerCase().includes(q.toLowerCase())
    ) {
      const next = applyToField(n.text, q, replacement, caseSensitive);
      if (next !== n.text) patch.text = next;
    }
    if (Object.keys(patch).length > 0) updates.push({ id: n.id, patch });
  }

  if (updates.length === 0) return 0;

  const preDoc = s.doc;
  const basePastLen = s.past.length;
  for (const u of updates) s.updateNodesLive([u.id], u.patch);

  // Collapse into a single undo step (same pattern as AI ops).
  const after = useEditor.getState();
  useEditor.setState({
    past: [...after.past.slice(0, basePastLen), preDoc],
    future: [],
    dirty: true,
  });
  return updates.length;
}

/** Jump to a match: select + frame the node in the viewport. */
export function gotoMatch(nodeId: string) {
  const s = useEditor.getState();
  s.select([nodeId]);
  // Viewport framing needs the live canvas element; without a DOM (tests,
  // SSR) selecting is the best available action.
  if (typeof document === "undefined") return;
  const viewportEl = document.querySelector("[data-canvas-center]");
  const vp = viewportEl?.getBoundingClientRect();
  if (!vp) return;
  const node = activePage(s.doc).nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const zoom = s.zoom;
  const targetPanX = vp.width / 2 - (node.x + node.w / 2) * zoom;
  const targetPanY = vp.height / 2 - (node.y + node.h / 2) * zoom;
  s.setViewport(zoom, targetPanX, targetPanY);
}
