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
  nodeBounds,
  uid,
  unionBounds,
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
  | "arrow"
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
  groupNodes: (ids: string[]) => void;
  ungroupNodes: (ids: string[]) => void;
  createComponent: (ids: string[]) => void;
  insertComponent: (componentId: string, x: number, y: number) => void;
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
    const page = activePage(doc);
    const resizingFrames = page.nodes.filter(
      (n) => ids.includes(n.id) && n.type === "frame" && patch.w !== undefined,
    );

    set({
      doc: mapNodes(doc, (nodes) => {
        let next = nodes.map((n) => (ids.includes(n.id) ? { ...n, ...patch } : n));

        // Constraint-follow: children of resized frames shift/scale per their
        // constraintH/constraintV setting (default: left/top).
        if (resizingFrames.length > 0) {
          const before = new Map(
            page.nodes.map((n) => [n.id, n] as const),
          );
          next = next.map((n) => {
            const parent = before.get(n.id);
            if (!parent) return n;
            const frame = resizingFrames.find((f) =>
              // child is “inside” if its center was inside the old frame bounds
              n.id !== f.id &&
              n.x + n.w / 2 > parent.x &&
              n.x + n.w / 2 < parent.x + parent.w &&
              n.y + n.h / 2 > parent.y &&
              n.y + n.h / 2 < parent.y + parent.h,
            );
            if (!frame) return n;
            const oldB = before.get(frame.id);
            const newB = next.find((x) => x.id === frame.id);
            if (!oldB || !newB) return n;
            const dw = newB.w - oldB.w;
            const dh = newB.h - oldB.h;
            const h = n.constraintH ?? "left";
            const v = n.constraintV ?? "top";
            let x = n.x;
            let y = n.y;
            let w = n.w;
            let hh = n.h;
            if (h === "right") x = n.x + dw;
            else if (h === "center") x = n.x + dw / 2;
            else if (h === "scale" && oldB.w > 0) {
              const k = newB.w / oldB.w;
              x = oldB.x + (n.x - oldB.x) * k;
              w = n.w * k;
            }
            if (v === "bottom") y = n.y + dh;
            else if (v === "center") y = n.y + dh / 2;
            else if (v === "scale" && oldB.h > 0) {
              const k = newB.h / oldB.h;
              y = oldB.y + (n.y - oldB.y) * k;
              hh = n.h * k;
            }
            return { ...n, x, y, w, h: hh };
          });
        }
        return next;
      }),
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

  /** Wrap the given nodes in a group; children stay in the flat node list. */
  groupNodes: (ids) => {
    const { doc, past } = get();
    if (ids.length < 2) return;
    const page = activePage(doc);
    const members = page.nodes.filter((n) => ids.includes(n.id));
    if (members.length < 2) return;
    const b = unionBounds(members);
    if (!b) return;
    const group: DesignNode = {
      id: uid("g"),
      type: "group",
      name: "Group",
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      fill: null,
      stroke: null,
      strokeWidth: 0,
      radius: 0,
      opacity: 1,
      children: members.map((m) => m.id),
    };
    set({
      doc: mapNodes(doc, (nodes) => [
        ...nodes.filter((n) => !ids.includes(n.id)),
        group,
      ]),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: [group.id],
    });
  },

  /** Dissolve groups, restoring their children as direct layer entries. */
  ungroupNodes: (ids) => {
    const { doc, past } = get();
    const page = activePage(doc);
    const groups = page.nodes.filter(
      (n) => n.type === "group" && ids.includes(n.id),
    );
    if (groups.length === 0) return;
    set({
      doc: mapNodes(doc, (nodes) => {
        const freed: DesignNode[] = [];
        const kept = nodes.filter((n) => {
          if (n.type === "group" && ids.includes(n.id)) {
            for (const childId of n.children ?? []) {
              const child = nodes.find((c) => c.id === childId);
              if (child) freed.push(child);
            }
            return false;
          }
          return true;
        });
        return [...kept, ...freed];
      }),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: groups.flatMap((g) => g.children ?? []),
    });
  },

  /** Register the selected nodes as a reusable component (kept on canvas as master). */
  createComponent: (ids) => {
    const { doc, past } = get();
    if (ids.length === 0) return;
    const page = activePage(doc);
    const master = page.nodes.find((n) => n.id === ids[0]);
    if (!master) return;
    set({
      doc: mapNodes(doc, (nodes) =>
        nodes.map((n) => (n.id === master.id ? { ...n, name: `${n.name} — master` } : n)),
      ),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
    });
    // The master node itself is the component definition; record it in the
    // components list derived from nodes flagged below.
    useEditor.setState({
      doc: {
        ...get().doc,
        pages: get().doc.pages.map((p) =>
          p.id !== page.id
            ? p
            : {
                ...p,
                nodes: p.nodes.map((n) =>
                  n.id === master.id ? { ...n, componentId: n.id } : n,
                ),
              },
        ),
      },
      dirty: true,
    });
  },

  /** Place a live instance of a component master onto the canvas. */
  insertComponent: (componentId, x, y) => {
    const { doc, past } = get();
    const page = activePage(doc);
    const master = page.nodes.find((n) => n.id === componentId);
    if (!master) return;
    const inst: DesignNode = {
      ...JSON.parse(JSON.stringify(master)),
      id: uid("i"),
      type: "instance",
      name: master.name.replace(" — master", "") + " instance",
      x,
      y,
      componentId,
    };
    set({
      doc: mapNodes(doc, (nodes) => [...nodes, inst]),
      past: [...past, cloneDoc(doc)],
      future: [],
      dirty: true,
      selectedIds: [inst.id],
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
