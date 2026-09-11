import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  fitTransform,
  hitTest,
  screenToPage,
  defaultNode,
  type DesignDoc,
  type DesignNode,
  type NodeType,
} from "@/lib/geo";
import { renderDoc } from "@/lib/render";
import { useEditor, type Tool } from "@/lib/store";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Circle,
  Clipboard,
  MessageCircle as CommentIcon,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Hand,
  History,
  Image as ImageIcon,
  Layers,
  Lock,
  Minus,
  MousePointer2,
  Pentagon,
  Plus,
  Redo2,
  Save,
  Share2,
  Slash,
  Square,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";

interface PresenceUser {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  selection: string[];
}

interface CommentRow {
  _id: string;
  authorName: string;
  body: string;
  x: number;
  y: number;
  resolved: boolean;
  createdAt: number;
}

interface FileRow {
  _id: string;
  name: string;
  doc: DesignDoc | null;
  version: number;
  ownerId: string;
  published: boolean;
}

const NODE_ICONS: Record<NodeType, typeof Square> = {
  frame: Frame,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  text: Type,
  image: ImageIcon,
  polygon: Triangle,
};

function ShapeIcon({ type }: { type: NodeType }) {
  const Icon = NODE_ICONS[type] ?? Square;
  return <Icon className="size-3.5 shrink-0" />;
}

function sanitizeDoc(raw: unknown): DesignDoc {
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as DesignDoc).pages) &&
    (raw as DesignDoc).pages.length > 0
  ) {
    return raw as DesignDoc;
  }
  return { pages: [], activePageId: "", background: "#101012" };
}

export default function Editor() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const file = useQuery(api.files.get, {
    id: fileId as Id<"files">,
  }) as FileRow | undefined;

  const presence = useQuery(api.presence.list, {
    fileId: fileId as Id<"files">,
  }) as PresenceUser[] | undefined;

  const comments = useQuery(api.comments.list, {
    fileId: fileId as Id<"files">,
  }) as CommentRow[] | undefined;

  const versions = useQuery(api.files.listVersions, {
    fileId: fileId as Id<"files">,
  }) as
    | { _id: string; version: number; label: string; createdAt: number }[]
    | undefined;

  const updateDoc = useMutation(api.files.updateDoc);
  const renameFile = useMutation(api.files.rename);
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);
  const addComment = useMutation(api.comments.add);
  const resolveComment = useMutation(api.comments.resolve);
  const removeComment = useMutation(api.comments.remove);
  const restoreVersion = useMutation(api.files.restoreVersion);
  const publishFile = useMutation(api.files.publish);
  const unpublishFile = useMutation(api.files.unpublish);

  const editor = useEditor();
  const {
    doc,
    selectedIds,
    tool,
    hoverId,
    zoom,
    panX,
    panY,
    dirty,
    setDoc,
    adoptDoc,
    setTool,
    setHover,
    select,
    pushHistory,
    addNode,
    updateNodesLive,
    moveNodesLive,
    deleteNodes,
    duplicateNodes,
    reorder,
    addPage,
    setPage,
    renamePage,
    deletePage,
    setViewport,
    undo,
    redo,
    markSaved,
  } = editor;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewW, setViewW] = useState(1200);
  const [viewH, setViewH] = useState(800);
  const [saving, setSaving] = useState<"saved" | "saving" | "dirty">("saved");
  const [dragging, setDragging] = useState<null | {
    kind: "move" | "resize" | "pan" | "draw" | "marquee";
    startPageX: number;
    startPageY: number;
    lastPageX: number;
    lastPageY: number;
    handle?: string;
    orig?: Record<string, DesignNode>;
  }>(null);
  const [pendingComment, setPendingComment] = useState<null | {
    x: number;
    y: number;
    body: string;
  }>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // ---- Load doc into store once the file arrives ----
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!file || loadedRef.current) return;
    const clean = sanitizeDoc(file.doc);
    if (clean.pages.length > 0) {
      setDoc(clean, { resetHistory: true });
      const r = wrapRef.current?.getBoundingClientRect();
      const t = fitTransform(
        clean,
        r?.width ?? 1200,
        r?.height ?? 800,
      );
      setViewport(t.zoom, t.panX, t.panY);
    } else {
      setDoc({ pages: [{ id: "p1", name: "Page 1", nodes: [] }], activePageId: "p1", background: "#101012" }, { resetHistory: true });
    }
    loadedRef.current = true;
  }, [file, setDoc, setViewport]);

  // ---- Adopt remote doc changes from Convex (multiplayer sync) ----
  const remoteDocRef = useRef<number>(0);
  useEffect(() => {
    if (!file?.doc) return;
    const clean = sanitizeDoc(file.doc);
    remoteDocRef.current = file.version;
    if (!dragging) adoptDoc(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.version]);

  // ---- Persist local edits to Convex (throttled autosave) ----
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedDocRef = useRef<string>("");
  useEffect(() => {
    if (!file || !dirty) return;
    setSaving("saving");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const serialized = JSON.stringify(doc);
      if (serialized === lastSavedDocRef.current) return;
      lastSavedDocRef.current = serialized;
      try {
        await updateDoc({ id: file._id as Id<"files">, doc });
        markSaved();
        setSaving("saved");
      } catch {
        setSaving("dirty");
      }
    }, 600);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, dirty, file?._id]);

  // ---- Presence heartbeat ----
  useEffect(() => {
    if (!fileId) return;
    const send = () => {
      void heartbeat({
        fileId: fileId as Id<"files">,
        x: lastMouse.current.x,
        y: lastMouse.current.y,
        selection: selectedIds,
      });
    };
    send();
    const id = window.setInterval(send, 5000);
    return () => {
      window.clearInterval(id);
      void leave({ fileId: fileId as Id<"files"> });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, selectedIds]);

  const lastMouse = useRef({ x: 0, y: 0 });

  // ---- Canvas sizing ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setViewW(e.contentRect.width);
        setViewH(e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Render loop ----
  const remoteSelection = useMemo(() => {
    const me = user?._id;
    const ids: string[] = [];
    const colors: string[] = [];
    for (const p of presence ?? []) {
      if (p.userId === me) continue;
      ids.push(...p.selection);
      colors.push(p.color);
    }
    return { ids: [...new Set(ids)], colors };
  }, [presence, user?._id]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || doc.pages.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    const preview =
      dragging?.kind === "draw"
        ? {
            ...(lastDrawNodeRef.current ?? {}),
          }
        : null;
    renderDoc(
      ctx,
      doc,
      { zoom, panX, panY },
      viewW,
      viewH,
      dpr,
      {
        showChrome: tool === "select",
        selection: selectedIds,
        remoteSelection: remoteSelection.ids,
        selectionColor: remoteSelection.colors[0],
        hoverId,
        drawPreview: preview as DesignNode | null,
      },
    );
  }, [
    doc,
    zoom,
    panX,
    panY,
    viewW,
    viewH,
    tool,
    selectedIds,
    remoteSelection,
    hoverId,
    dragging,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const lastDrawNodeRef = useRef<DesignNode | null>(null);

  // ---- Pointer interactions ----
  const toPage = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return screenToPage(
      { zoom, panX, panY },
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  };

  const resizeHandles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

  const handleUnderCursor = (
    px: number,
    py: number,
  ): string | null => {
    if (selectedIds.length !== 1) return null;
    const page = doc.pages.find((p) => p.id === doc.activePageId);
    const n = page?.nodes.find((x) => x.id === selectedIds[0]);
    if (!n) return null;
    const tol = 6 / zoom;
    const x0 = n.x,
      y0 = n.y,
      x1 = n.x + n.w,
      y1 = n.y + n.h;
    for (const h of resizeHandles) {
      const hx = h.includes("w") ? x0 : h.includes("e") ? x1 : (x0 + x1) / 2;
      const hy = h.includes("n") ? y0 : h.includes("s") ? y1 : (y0 + y1) / 2;
      if (Math.abs(px - hx) <= tol && Math.abs(py - hy) <= tol) return h;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    const { x: px, y: py } = toPage(e);

    if (tool === "hand" || e.button === 1 || (e.button === 0 && e.shiftKey && tool === "select" && e.altKey)) {
      setDragging({ kind: "pan", startPageX: px, startPageY: py, lastPageX: px, lastPageY: py });
      return;
    }

    if (tool === "comment") {
      setPendingComment({ x: px, y: py, body: "" });
      setTool("select");
      return;
    }

    if (tool !== "select") {
      // Start drawing a shape
      let node: DesignNode;
      if (tool === "image") {
        fileInputRef.current?.click();
        setTool("select");
        return;
      }
      node = defaultNode(tool as NodeType, px, py);
      node.x = px;
      node.y = py;
      node.w = 0;
      node.h = 0;
      lastDrawNodeRef.current = node;
      setDragging({ kind: "draw", startPageX: px, startPageY: py, lastPageX: px, lastPageY: py });
      return;
    }

    // Select tool
    const handle = handleUnderCursor(px, py);
    if (handle && selectedIds.length === 1) {
      const page = doc.pages.find((p) => p.id === doc.activePageId)!;
      const orig: Record<string, DesignNode> = {};
      for (const n of page.nodes) if (n.id === selectedIds[0]) orig[n.id] = { ...n };
      pushHistory();
      setDragging({ kind: "resize", startPageX: px, startPageY: py, lastPageX: px, lastPageY: py, handle, orig });
      return;
    }

    const hit = hitTest(doc, px, py);
    if (hit) {
      if (!selectedIds.includes(hit.id)) {
        select(e.shiftKey ? [...selectedIds, hit.id] : [hit.id]);
      }
      const page = doc.pages.find((p) => p.id === doc.activePageId)!;
      const ids = selectedIds.includes(hit.id)
        ? selectedIds
        : [hit.id];
      const orig: Record<string, DesignNode> = {};
      for (const n of page.nodes) if (ids.includes(n.id)) orig[n.id] = { ...n };
      pushHistory();
      setDragging({ kind: "move", startPageX: px, startPageY: py, lastPageX: px, lastPageY: py, orig });
    } else {
      select([]);
      setDragging({ kind: "marquee", startPageX: px, startPageY: py, lastPageX: px, lastPageY: py });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x: px, y: py } = toPage(e);
    lastMouse.current = { x: px, y: py };

    if (!dragging) {
      if (tool === "select") {
        const hit = hitTest(doc, px, py);
        setHover(hit?.id ?? null);
      }
      return;
    }

    const dx = px - dragging.lastPageX;
    const dy = py - dragging.lastPageY;
    dragging.lastPageX = px;
    dragging.lastPageY = py;

    if (dragging.kind === "pan") {
      setViewport(zoom, panX + dx * zoom, panY + dy * zoom);
    } else if (dragging.kind === "move" && dragging.orig) {
      moveNodesLive(Object.keys(dragging.orig), dx, dy);
    } else if (dragging.kind === "resize" && dragging.handle && dragging.orig) {
      const id = Object.keys(dragging.orig)[0];
      const o = dragging.orig[id];
      const h = dragging.handle;
      const patch: Partial<DesignNode> = {};
      let nx = o.x,
        ny = o.y,
        nw = o.w,
        nh = o.h;
      if (h.includes("e")) nw = o.w + (px - dragging.startPageX);
      if (h.includes("s")) nh = o.h + (py - dragging.startPageY);
      if (h.includes("w")) {
        nw = o.w - (px - dragging.startPageX);
        nx = o.x + (px - dragging.startPageX);
      }
      if (h.includes("n")) {
        nh = o.h - (py - dragging.startPageY);
        ny = o.y + (py - dragging.startPageY);
      }
      patch.x = nx;
      patch.y = ny;
      patch.w = Math.max(nw, 4);
      patch.h = o.type === "line" ? nh : Math.max(nh, 4);
      updateNodesLive([id], patch);
    } else if (dragging.kind === "draw") {
      const start = { x: dragging.startPageX, y: dragging.startPageY };
      const node = lastDrawNodeRef.current;
      if (node) {
        node.x = Math.min(start.x, px);
        node.y = Math.min(start.y, py);
        node.w = Math.abs(px - start.x);
        node.h = node.type === "line" ? py - start.y : Math.abs(py - start.y);
        if (node.type === "line") {
          node.x = start.x;
          node.y = start.y;
          node.w = px - start.x;
        }
        draw();
      }
    }
  };

  const onPointerUp = () => {
    if (!dragging) return;
    if (dragging.kind === "draw" && lastDrawNodeRef.current) {
      const n = lastDrawNodeRef.current;
      if (n.w > 2 || Math.abs(n.h) > 2) {
        addNode(n);
      }
      lastDrawNodeRef.current = null;
    }
    setDragging(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(8, Math.max(0.05, zoom * factor));
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Keep the page point under the cursor fixed
      const pageX = (cx - panX) / zoom;
      const pageY = (cy - panY) / zoom;
      setViewport(newZoom, cx - pageX * newZoom, cy - pageY * newZoom);
    } else {
      setViewport(zoom, panX - e.deltaX, panY - e.deltaY);
    }
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key === "d") {
        e.preventDefault();
        duplicateNodes(selectedIds);
      } else if (mod && e.key === "a") {
        e.preventDefault();
        const page = doc.pages.find((p) => p.id === doc.activePageId);
        select(page?.nodes.map((n) => n.id) ?? []);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteNodes(selectedIds);
        }
      } else if (e.key === "v") setTool("select");
      else if (e.key === "h") setTool("hand");
      else if (e.key === "f") setTool("frame");
      else if (e.key === "r") setTool("rect");
      else if (e.key === "o") setTool("ellipse");
      else if (e.key === "l") setTool("line");
      else if (e.key === "p") setTool("polygon");
      else if (e.key === "t") setTool("text");
      else if (e.key === "c") setTool("comment");
      else if (e.key === "0" && mod) {
        e.preventDefault();
        const t = fitTransform(doc, viewW, viewH);
        setViewport(t.zoom, t.panX, t.panY);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedIds,
    doc,
    viewW,
    viewH,
    setTool,
    select,
    deleteNodes,
    duplicateNodes,
    undo,
    redo,
    setViewport,
  ]);

  // ---- Image insertion ----
  const onImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 400 / Math.max(img.width, img.height));
        const node = defaultNode("image", 100, 100);
        node.src = src;
        node.name = f.name;
        node.w = img.width * scale;
        node.h = img.height * scale;
        addNode(node);
      };
      img.src = src;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  // ---- Export selection (or whole page) as PNG ----
  const exportPng = () => {
    const page = doc.pages.find((p) => p.id === doc.activePageId);
    const nodes = page?.nodes ?? [];
    if (nodes.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 24;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const off = document.createElement("canvas");
    const scale = 2;
    off.width = w * scale;
    off.height = h * scale;
    const ctx = off.getContext("2d")!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderDoc(
      ctx,
      { ...doc, pages: [{ ...page!, nodes }] },
      { zoom: 1, panX: -minX + pad, panY: -minY + pad },
      w,
      h,
      1,
      {},
    );
    const a = document.createElement("a");
    a.href = off.toDataURL("image/png");
    a.download = `${(file?.name ?? "design").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    toast.success("Exported PNG");
  };

  const selectedNodes = useMemo(() => {
    const page = doc.pages.find((p) => p.id === doc.activePageId);
    return (page?.nodes ?? []).filter((n) => selectedIds.includes(n.id));
  }, [doc, selectedIds]);

  const activePageObj = doc.pages.find((p) => p.id === doc.activePageId);

  // ---- Loading state ----
  if (file === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }
  if (file === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">
          This design file doesn't exist or was deleted.
        </p>
        <Button onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
      </div>
    );
  }

  const statusLabel =
    saving === "saving"
      ? "Saving…"
      : dirty
        ? "Unsaved changes"
        : `Saved · v${file.version}`;

  const others = (presence ?? []).filter((p) => p.userId !== user?._id);

  const tools: { key: Tool; icon: typeof MousePointer2; label: string; hint: string }[] = [
    { key: "select", icon: MousePointer2, label: "Select", hint: "V" },
    { key: "hand", icon: Hand, label: "Pan", hint: "H" },
    { key: "frame", icon: Frame, label: "Frame", hint: "F" },
    { key: "rect", icon: Square, label: "Rectangle", hint: "R" },
    { key: "ellipse", icon: Circle, label: "Ellipse", hint: "O" },
    { key: "polygon", icon: Pentagon, label: "Polygon", hint: "P" },
    { key: "line", icon: Slash, label: "Line", hint: "L" },
    { key: "text", icon: Type, label: "Text", hint: "T" },
    { key: "image", icon: ImageIcon, label: "Image", hint: "" },
    { key: "comment", icon: CommentIcon, label: "Comment", hint: "C" },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeftRight className="size-4 rotate-180" />
          </Button>
          {editingName ? (
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (nameDraft.trim() && nameDraft !== file.name) {
                  await renameFile({ id: file._id as Id<"files">, name: nameDraft.trim() });
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="h-7 w-56"
            />
          ) : (
            <button
              className="truncate rounded px-2 py-1 text-sm font-medium hover:bg-accent"
              onClick={() => {
                setNameDraft(file.name);
                setEditingName(true);
              }}
              title="Rename file"
            >
              {file.name}
            </button>
          )}
          <span className="text-xs text-muted-foreground">· {statusLabel}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Undo / redo */}
          <Button variant="ghost" size="icon-sm" onClick={undo} disabled={editor.past.length === 0} title="Undo (⌘Z)">
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={redo} disabled={editor.future.length === 0} title="Redo (⇧⌘Z)">
            <Redo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHistoryOpen(true)}
            title="Version history"
          >
            <History className="size-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Collaborators */}
          <div className="flex items-center -space-x-1.5">
            {others.slice(0, 4).map((p) => (
              <span
                key={p.userId}
                title={p.name}
                className="flex size-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
            {others.length > 4 && (
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-secondary text-[10px] font-semibold">
                +{others.length - 4}
              </span>
            )}
          </div>

          {/* Zoom */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2 text-xs">
                {Math.round(zoom * 100)}%
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[0.25, 0.5, 1, 2].map((z) => (
                <DropdownMenuItem
                  key={z}
                  className="cursor-pointer"
                  onClick={() => {
                    const cx = viewW / 2;
                    const cy = viewH / 2;
                    const pageX = (cx - panX) / zoom;
                    const pageY = (cy - panY) / zoom;
                    setViewport(z, cx - pageX * z, cy - pageY * z);
                  }}
                >
                  {z * 100}%
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  const t = fitTransform(doc, viewW, viewH);
                  setViewport(t.zoom, t.panX, t.panY);
                }}
              >
                Fit to screen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="size-3.5" />
            Share
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel: tools + layers + pages */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border/70">
          <div className="grid grid-cols-5 gap-0.5 border-b border-border/70 p-1.5">
            {tools.map((t) => (
              <button
                key={t.key}
                title={`${t.label}${t.hint ? ` (${t.hint})` : ""}`}
                className={cn(
                  "flex items-center justify-center rounded-md py-1.5 transition-colors",
                  tool === t.key
                    ? "bg-violet-500/20 text-violet-300"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                onClick={() => setTool(t.key)}
              >
                <t.icon className="size-4" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pages
            </span>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={addPage}
              title="Add page"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="thin-scroll max-h-36 overflow-y-auto px-1.5">
            {doc.pages.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center gap-1 rounded px-2 py-1 text-xs",
                  p.id === doc.activePageId
                    ? "bg-violet-500/15 text-violet-200"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <button
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => setPage(p.id)}
                  onDoubleClick={() => {
                    const name = window.prompt("Page name", p.name);
                    if (name?.trim()) renamePage(p.id, name.trim());
                  }}
                >
                  {p.name}
                </button>
                {doc.pages.length > 1 && (
                  <button
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => deletePage(p.id)}
                    title="Delete page"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 pb-1 pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Layers
            </span>
            <span className="text-[10px] text-muted-foreground">
              {activePageObj?.nodes.length ?? 0}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-1.5 pb-2">
            <div className="flex flex-col">
              {[...(activePageObj?.nodes ?? [])].reverse().map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-center gap-1.5 rounded px-2 py-1 text-xs",
                    selectedIds.includes(n.id)
                      ? "bg-violet-500/15 text-violet-200"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  onClick={(e) =>
                    select(
                      e.shiftKey
                        ? selectedIds.includes(n.id)
                          ? selectedIds.filter((i) => i !== n.id)
                          : [...selectedIds, n.id]
                        : [n.id],
                    )
                  }
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <ShapeIcon type={n.type} />
                  <span className="min-w-0 flex-1 truncate">
                    {n.text ?? n.name}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNodesLive([n.id], { hidden: !n.hidden });
                    }}
                    title={n.hidden ? "Show" : "Hide"}
                  >
                    {n.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNodesLive([n.id], { locked: !n.locked });
                    }}
                    title={n.locked ? "Unlock" : "Lock"}
                  >
                    <Lock className={cn("size-3", n.locked && "text-amber-400")} />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedNodes.length === 1 && (
            <div className="flex items-center justify-center gap-0.5 border-t border-border/70 py-1.5">
              <Button variant="ghost" size="icon-sm" title="Bring to front" onClick={() => reorder(selectedIds[0], "front")}>
                <ChevronUp className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Send to back" onClick={() => reorder(selectedIds[0], "back")}>
                <ChevronDown className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Duplicate (⌘D)" onClick={() => duplicateNodes(selectedIds)}>
                <Copy className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => deleteNodes(selectedIds)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </aside>

        {/* Canvas */}
        <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute inset-0 touch-none",
              tool === "hand" ? "cursor-grab" : tool === "select" ? "cursor-default" : "cursor-crosshair",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          />

          {/* Remote cursors */}
          {(presence ?? [])
            .filter((p) => p.userId !== user?._id)
            .map((p) => {
              const sx = p.x * zoom + panX;
              const sy = p.y * zoom + panY;
              if (sx < -40 || sy < -40 || sx > viewW + 40 || sy > viewH + 40) return null;
              return (
                <div
                  key={p.userId}
                  className="pointer-events-none absolute z-10"
                  style={{ left: sx, top: sy }}
                >
                  <MousePointer2
                    className="size-4"
                    style={{ color: p.color, fill: p.color }}
                  />
                  <span
                    className="absolute left-4 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name}
                  </span>
                </div>
              );
            })}

          {/* Canvas comments */}
          {(comments ?? [])
            .filter((c) => !c.resolved)
            .map((c) => (
              <div
                key={c._id}
                className="group absolute z-10"
                style={{ left: c.x * zoom + panX, top: c.y * zoom + panY }}
              >
                <button
                  className="flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rounded-bl-none bg-amber-400 text-[10px] font-bold text-amber-950 shadow-lg"
                  title={`${c.authorName}: ${c.body}`}
                  onClick={() => {
                    if (window.confirm(`Resolve comment by ${c.authorName}?`)) {
                      void resolveComment({ id: c._id as Id<"comments"> });
                    }
                  }}
                >
                  💬
                </button>
              </div>
            ))}

          {/* Zoom widget */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border/70 bg-popover/90 p-1 backdrop-blur">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const cx = viewW / 2;
                const cy = viewH / 2;
                const pageX = (cx - panX) / zoom;
                const pageY = (cy - panY) / zoom;
                const z = Math.max(0.05, zoom * 0.8);
                setViewport(z, cx - pageX * z, cy - pageY * z);
              }}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const cx = viewW / 2;
                const cy = viewH / 2;
                const pageX = (cx - panX) / zoom;
                const pageY = (cy - panY) / zoom;
                const z = Math.min(8, zoom * 1.25);
                setViewport(z, cx - pageX * z, cy - pageY * z);
              }}
            >
              <Plus className="size-3.5" />
            </Button>
            <Separator orientation="vertical" className="mx-0.5 h-4" />
            <Button
              variant="ghost"
              size="icon-sm"
              title="Export PNG"
              onClick={exportPng}
            >
              <Save className="size-3.5" />
            </Button>
          </div>

          {/* Activity indicator */}
          {others.length > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border/70 bg-popover/90 px-3 py-1.5 text-xs backdrop-blur">
              <Users className="size-3.5 text-emerald-400" />
              {others.length} other{others.length > 1 ? "s" : ""} editing
            </div>
          )}
        </div>

        {/* Right panel: properties */}
        <aside className="thin-scroll w-64 shrink-0 overflow-y-auto border-l border-border/70 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {selectedNodes.length === 0
              ? "Page"
              : selectedNodes.length === 1
                ? selectedNodes[0].type
                : `${selectedNodes.length} selected`}
          </p>

          {selectedNodes.length === 0 && (
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-muted-foreground">
                Canvas background
                <input
                  type="color"
                  value={doc.background}
                  onChange={(e) => adoptDoc({ ...doc, background: e.target.value })}
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-input bg-transparent"
                />
              </label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Select a layer to edit its properties, or pick a tool and draw
                on the canvas. Everything autosaves.
              </p>
            </div>
          )}

          {selectedNodes.length === 1 && (
            <div className="mt-3 space-y-4 text-xs">
              {/* Position & size */}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["X", "x"],
                    ["Y", "y"],
                    ["W", "w"],
                    ["H", "h"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="block">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {label}
                    </span>
                    <input
                      type="number"
                      className="input-numeric mt-0.5 h-7 w-full rounded border border-input bg-transparent px-1.5 text-xs"
                      value={Math.round(selectedNodes[0][key])}
                      onChange={(e) =>
                        updateNodesLive([selectedNodes[0].id], {
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>

              {/* Fill / stroke */}
              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground">Fill</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-7 w-9 cursor-pointer rounded border border-input bg-transparent"
                    value={selectedNodes[0].fill ?? "#8b5cf6"}
                    onChange={(e) =>
                      updateNodesLive([selectedNodes[0].id], { fill: e.target.value })
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() =>
                      updateNodesLive([selectedNodes[0].id], { fill: null })
                    }
                  >
                    None
                  </Button>
                </div>
              </label>

              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground">Stroke</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-7 w-9 cursor-pointer rounded border border-input bg-transparent"
                    value={selectedNodes[0].stroke ?? "#ffffff"}
                    onChange={(e) =>
                      updateNodesLive([selectedNodes[0].id], {
                        stroke: e.target.value,
                        strokeWidth: selectedNodes[0].strokeWidth || 1,
                      })
                    }
                  />
                  <input
                    type="number"
                    className="input-numeric h-7 w-16 rounded border border-input bg-transparent px-1.5"
                    value={selectedNodes[0].strokeWidth}
                    min={0}
                    onChange={(e) =>
                      updateNodesLive([selectedNodes[0].id], {
                        strokeWidth: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </label>

              {/* Radius + opacity */}
              {selectedNodes[0].type !== "line" && (
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground">
                    Corner radius · {selectedNodes[0].radius}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selectedNodes[0].radius}
                    onChange={(e) =>
                      updateNodesLive([selectedNodes[0].id], {
                        radius: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full accent-violet-500"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-[10px] uppercase text-muted-foreground">
                  Opacity · {Math.round(selectedNodes[0].opacity * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(selectedNodes[0].opacity * 100)}
                  onChange={(e) =>
                    updateNodesLive([selectedNodes[0].id], {
                      opacity: Number(e.target.value) / 100,
                    })
                  }
                  className="mt-1 w-full accent-violet-500"
                />
              </label>

              {/* Polygon sides */}
              {selectedNodes[0].type === "polygon" && (
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground">
                    Sides · {selectedNodes[0].points ?? 3}
                  </span>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={selectedNodes[0].points ?? 3}
                    onChange={(e) =>
                      updateNodesLive([selectedNodes[0].id], {
                        points: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full accent-violet-500"
                  />
                </label>
              )}

              {/* Text */}
              {selectedNodes[0].type === "text" && (
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[10px] uppercase text-muted-foreground">Content</span>
                    <Textarea
                      className="mt-1 min-h-16 text-xs"
                      value={selectedNodes[0].text ?? ""}
                      onChange={(e) =>
                        updateNodesLive([selectedNodes[0].id], {
                          text: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-[10px] uppercase text-muted-foreground">Size</span>
                      <input
                        type="number"
                        className="input-numeric mt-0.5 h-7 w-full rounded border border-input bg-transparent px-1.5"
                        value={selectedNodes[0].fontSize ?? 16}
                        onChange={(e) =>
                          updateNodesLive([selectedNodes[0].id], {
                            fontSize: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span className="text-[10px] uppercase text-muted-foreground">Weight</span>
                      <select
                        className="mt-0.5 h-7 w-full rounded border border-input bg-transparent px-1"
                        value={selectedNodes[0].fontWeight ?? 500}
                        onChange={(e) =>
                          updateNodesLive([selectedNodes[0].id], {
                            fontWeight: Number(e.target.value),
                          })
                        }
                      >
                        {[400, 500, 600, 700, 800].map((wgt) => (
                          <option key={wgt} value={wgt}>
                            {wgt}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-1">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button
                        key={a}
                        className={cn(
                          "flex-1 rounded border px-1 py-1 capitalize",
                          (selectedNodes[0].align ?? "left") === a
                            ? "border-violet-400 text-violet-300"
                            : "border-border text-muted-foreground",
                        )}
                        onClick={() =>
                          updateNodesLive([selectedNodes[0].id], { align: a })
                        }
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedNodes.length > 1 && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Multiple layers selected. Drag to move them together, or press
              ⌘D to duplicate.
            </p>
          )}
        </aside>
      </div>

      {/* Hidden image input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImagePicked}
      />

      {/* Comment composer */}
      <Dialog
        open={pendingComment !== null}
        onOpenChange={(open) => !open && setPendingComment(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a comment</DialogTitle>
            <DialogDescription>
              Pin feedback to this spot on the canvas for your team.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="Share feedback, ask a question…"
            value={pendingComment?.body ?? ""}
            onChange={(e) =>
              setPendingComment((pc) => (pc ? { ...pc, body: e.target.value } : pc))
            }
          />
          <DialogFooter>
            <Button
              disabled={!pendingComment?.body.trim()}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              onClick={async () => {
                if (!pendingComment?.body.trim() || !fileId) return;
                await addComment({
                  fileId: fileId as Id<"files">,
                  x: pendingComment.x,
                  y: pendingComment.y,
                  body: pendingComment.body.trim(),
                });
                setPendingComment(null);
                toast.success("Comment added");
              }}
            >
              Post comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version history */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              DesignBox snapshots your work automatically. Restore any point in
              time.
            </DialogDescription>
          </DialogHeader>
          <div className="thin-scroll max-h-72 space-y-1 overflow-y-auto">
            {versions === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions yet.</p>
            ) : (
              versions.map((v) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">{v.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      v{v.version} · {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await restoreVersion({
                        versionId: v._id as Id<"docVersions">,
                      });
                      setHistoryOpen(false);
                      toast.success("Version restored");
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share this design</DialogTitle>
            <DialogDescription>
              Anyone with the link can open this file and edit it with you in
              real time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={window.location.href} className="text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied");
              }}
            >
              <Clipboard className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            {file.published ? (
              <Button
                variant="outline"
                onClick={async () => {
                  await unpublishFile({ id: file._id as Id<"files"> });
                  toast.success("Removed from Explore");
                }}
              >
                Unpublish from Explore
              </Button>
            ) : (
              <Button
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                onClick={async () => {
                  await publishFile({
                    id: file._id as Id<"files">,
                    description: undefined,
                    tags: [],
                  });
                  toast.success("Published to Explore");
                }}
              >
                Publish to Explore
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
