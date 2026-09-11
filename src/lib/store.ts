/**
 * Editor state: the working DesignDoc, selection, tools, and undo/redo
 * history. The doc is the source of truth while editing; the Editor page
 * persists it to Convex and adopts remote multiplayer changes.
 *
 * History model: interactive gestures (drag, resize, typing) call
 * pushHistory() once at gesture start, then use the *Live variants so a
 * whole gesture becomes a single undo step.
 */
import { create } from "zustand";
import {
  activePage,
  type DesignDoc,
  type DesignNode,
} from "./geo";

export type Tool =
  | "select"
  | "hand"
  | "frame"
  | "rect"
  | "ellipse"
  | "line"
  | "polygon"
  | "text"
  | "image"
  | "comment";

interface EditorState {
  doc: DesignDoc;
  selectedIds: string[];
  tool: Tool;
  hoverId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  past: DesignDoc[];
  future: DesignDoc[];
  dirty: boolean;
  /** Last viewport we auto-fitted from (avoids repeated fit jumps). */
  fittedFor: string | null;

  setDoc: (doc: DesignDoc, opts?: { resetHistory?: boolean }) => void;
  /** Replace the doc (e.g. remote multiplayer update) keeping selection/history. */
  adoptDoc: (doc: DesignDoc) => void;
  setTool: (tool: Tool) => void;
  setHover: (id: string | null) => void;
  select: (ids: string[]) => void;
  pushHistory: () => void;
  addNode: (node: DesignNode) => void;
  updateNodesLive: (ids: string[], patch: Partial<DesignNode>) => void;
  moveNodesLive: (ids: string[], dx: number, dy: number) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => void;
  reorder: (id: string, dir: "front" | "back" | "forward" | "backward") => void;
  addPage: () => void;
  setPage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  deletePage: (pageId: string) => void;
  setViewport: (zoom: number, panX: number, panY: number) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

function cloneDoc(doc: DesignDoc): DesignDoc {
  return JSON.parse(JSON.stringify(doc)) as DesignDoc;
}

function mapNodes(
  doc: DesignDoc,
  fn: (nodes: DesignNode[]) => DesignNode[],
): DesignDoc {
  const page = activePage(doc);
  return {
    ...doc,
    pages: doc.pages.map((p) =>
      p.id === page.id ? { ...p, nodes: fn(p.nodes) } : p,
    ),
  };
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: { pages: [], activePageId: "", background: "#101012" },
  selectedIds: [],
  tool: "select",
  hoverId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  past: [],
  future: [],
  dirty: false,
  fittedFor: null,

  setDoc: (doc, opts) =>
    set({
      doc,
      past: opts?.resetHistory ? [] : get().past,
      future: opts?.resetHistory ? [] : get().future,
      dirty: opts?.resetHistory ? false : get().dirty,
      selectedIds: [],
      fittedFor: null,
    }),

  adoptDoc: (doc) => set({ doc }),

  setTool: (tool) => set({ tool, hoverId: null }),
  setHover: (id) => set({ hoverId: id }),

  select: (ids) => set({ selectedIds: ids }),

  pushHistory: () => {
    const { doc, past } = get();
    set({ past: [...past, cloneDoc(doc)], future: [], dirty: true });
  },

  addNode: (node) => {
    const { doc, past } = get();
    set({
      doc: mapNodes(doc, (nodes) => [...nodes, node]),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: [node.id],
      tool: "select",
    });
  },

  updateNodesLive: (ids, patch) => {
    const { doc } = get();
    set({
      doc: mapNodes(doc, (nodes) =>
        nodes.map((n) => (ids.includes(n.id) ? { ...n, ...patch } : n)),
      ),
      dirty: true,
    });
  },

  moveNodesLive: (ids, dx, dy) => {
    const { doc } = get();
    set({
      doc: mapNodes(doc, (nodes) =>
        nodes.map((n) =>
          ids.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n,
        ),
      ),
      dirty: true,
    });
  },

  deleteNodes: (ids) => {
    const { doc, past, selectedIds } = get();
    set({
      doc: mapNodes(doc, (nodes) => nodes.filter((n) => !ids.includes(n.id))),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: selectedIds.filter((id) => !ids.includes(id)),
    });
  },

  duplicateNodes: (ids) => {
    const { doc, past } = get();
    const page = activePage(doc);
    const copies: DesignNode[] = [];
    for (const n of page.nodes) {
      if (!ids.includes(n.id)) continue;
      copies.push({
        ...JSON.parse(JSON.stringify(n)),
        id: `${n.type[0]}_${Math.random().toString(36).slice(2, 9)}`,
        name: `${n.name} copy`,
        x: n.x + 16,
        y: n.y + 16,
      });
    }
    if (copies.length === 0) return;
    set({
      doc: mapNodes(doc, (nodes) => [...nodes, ...copies]),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: copies.map((c) => c.id),
    });
  },

  reorder: (id, dir) => {
    const { doc, past } = get();
    set({
      doc: mapNodes(doc, (nodes) => {
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx === -1) return nodes;
        const node = nodes[idx];
        const rest = nodes.filter((_, i) => i !== idx);
        if (dir === "front") return [...rest, node];
        if (dir === "back") return [node, ...rest];
        if (dir === "forward") {
          rest.splice(Math.min(idx, rest.length), 0, node);
          return rest;
        }
        rest.splice(Math.max(0, idx - 1), 0, node);
        return rest;
      }),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
    });
  },

  addPage: () => {
    const { doc, past } = get();
    const id = `p_${Math.random().toString(36).slice(2, 9)}`;
    set({
      doc: {
        ...doc,
        pages: [
          ...doc.pages,
          { id, name: `Page ${doc.pages.length + 1}`, nodes: [] },
        ],
        activePageId: id,
      },
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: [],
    });
  },

  setPage: (pageId) =>
    set({ doc: { ...get().doc, activePageId: pageId }, selectedIds: [] }),

  renamePage: (pageId, name) => {
    const { doc } = get();
    set({
      doc: {
        ...doc,
        pages: doc.pages.map((p) => (p.id === pageId ? { ...p, name } : p)),
      },
      dirty: true,
    });
  },

  deletePage: (pageId) => {
    const { doc, past } = get();
    if (doc.pages.length <= 1) return;
    const pages = doc.pages.filter((p) => p.id !== pageId);
    set({
      doc: {
        ...doc,
        pages,
        activePageId:
          doc.activePageId === pageId ? pages[0].id : doc.activePageId,
      },
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: [],
    });
  },

  setViewport: (zoom, panX, panY) => set({ zoom, panX, panY }),

  undo: () => {
    const { past, future, doc } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [cloneDoc(doc), ...future],
      dirty: true,
      selectedIds: [],
    });
  },

  redo: () => {
    const { past, future, doc } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      doc: next,
      past: [...past, cloneDoc(doc)],
      future: future.slice(1),
      dirty: true,
      selectedIds: [],
    });
  },

  markSaved: () => set({ dirty: false }),
}));
