import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useEditor, type Tool } from "@/lib/store";
import {
  activePage,
  defaultNode,
  fitTransform,
  hitTest,
  nodeBounds,
  pageToScreen,
  screenToPage,
  snapTargets,
  unionBounds,
  type Bounds,
  type DesignDoc,
  type DesignNode,
} from "@/lib/geo";
import {
  DEFAULT_FRAME_PRESETS,
  type FramePreset,
} from "@/lib/framePresets";
import { renderDoc, BLEND_MODES, type SnapGuide } from "@/lib/render";
import { exportCss, exportNodePng, exportPng, downloadJson } from "@/lib/export";
import { docToJsx } from "@/lib/designToJsx";
import { analyzeTokens, formatTokensReport } from "@/lib/designTokens";
import { ScanSearch } from "lucide-react";
import { loadFileLocal, saveFileLocal } from "@/lib/localStore";
import { LibraryPanel } from "@/components/LibraryPanel";
import { AiPanel } from "@/components/AiPanel";
import { LintPanel } from "@/components/LintPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Code2,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Boxes,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  Circle,
  Clipboard,
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Frame,
  Globe,
  History,
  Image as ImageIcon,
  Layers,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
  Minus,
  MousePointer2,
  Move,
  MoveVertical,
  Paintbrush,
  Pentagon,
  Plus,
  Redo2,
  Ruler,
  Scan,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  User as UserIcon,
} from "lucide-react";
import {
  Command as CommandIcon,
  Combine,
  Diff,
  Frame as FrameIcon,
  Grid3x3,
  Palette,
  SquareDashed,
  SquareStack,
  Rows3,
  Columns3,
  WrapText,
} from "lucide-react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
} from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

/* ---------- Small helpers ---------- */

const NODE_ICONS: Record<DesignNode["type"], typeof Square> = {
  frame: Frame,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  arrow: ArrowUpRight,
  text: Type,
  image: ImageIcon,
  polygon: Pentagon,
  group: Boxes,
  instance: Sparkles,
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

const SWATCHES = [
  "#8b5cf6",
  "#22d3ee",
  "#34d399",
  "#facc15",
  "#f472b6",
  "#fb923c",
  "#f87171",
  "#a3e635",
  "#ffffff",
  "#a1a1aa",
  "#1c1c22",
  "#000000",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

/* ---------- Docking panels: resizable, collapsible, persisted ---------- */

const PANEL_SIZES_KEY = "node.editor.dock.v1";

function readDockState(): { left: boolean; right: boolean } {
  try {
    const raw = localStorage.getItem(PANEL_SIZES_KEY);
    const m = raw ? JSON.parse(raw) : {};
    return { left: m.leftOpen !== false, right: m.rightOpen !== false };
  } catch {
    return { left: true, right: true };
  }
}

function dockDefaultSize(side: "left" | "right"): number {
  try {
    const raw = localStorage.getItem(PANEL_SIZES_KEY);
    const m = raw ? JSON.parse(raw) : {};
    const v = side === "left" ? m.leftSize : m.rightSize;
    if (typeof v === "number" && v >= 12 && v <= 42) return v;
  } catch {
    /* storage unavailable */
  }
  return side === "left" ? 17 : 21;
}

/** Slim draggable divider between dock groups. */
function DockHandle() {
  const [dragging, setDragging] = useState(false);
  return (
    <PanelResizeHandle
      className={cn(
        "group relative z-10 w-px shrink-0 bg-border/60 outline-none transition-colors",
        "hover:bg-violet-500/60 data-[resize-handle-state=drag]:bg-violet-500",
        dragging && "bg-violet-500",
      )}
      onDragging={setDragging}
    >
      {/* Expanded invisible hit area for easier grabbing */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </PanelResizeHandle>
  );
}

/** A docked side panel: chrome header + scrollable body, resizable via Panel. */
function DockPanel({
  side,
  title,
  icon,
  onCollapse,
  children,
}: {
  side: "left" | "right";
  title: string;
  icon: React.ReactNode;
  onCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <Panel
      id={`dock-${side}`}
      order={side === "left" ? 1 : 3}
      defaultSize={dockDefaultSize(side)}
      minSize={12}
      maxSize={42}
      className="min-h-0"
    >
      <section
        className={cn(
          "flex h-full min-h-0 flex-col bg-card/40",
          side === "left"
            ? "border-r border-border/60"
            : "border-l border-border/60",
        )}
      >
        <header className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 bg-card/70 pl-3 pr-1.5">
          {icon}
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </span>
          <span className="ml-auto" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={onCollapse}
              >
                {side === "left" ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelRightClose className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={side === "left" ? "right" : "left"}>
              Hide {title.toLowerCase()} panel
            </TooltipContent>
          </Tooltip>
        </header>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </section>
    </Panel>
  );
}

/** Vertical stub shown where a panel was collapsed — click to restore. */
function CollapsedDockRail({
  side,
  title,
  icon,
  onExpand,
}: {
  side: "left" | "right";
  title: string;
  icon: React.ReactNode;
  onExpand: () => void;
}) {
  return (
    <div
      className={cn(
        "flex w-9 shrink-0 flex-col items-center gap-2 bg-card/40 py-2",
        side === "left"
          ? "border-r border-border/60"
          : "border-l border-border/60",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onExpand}
          >
            {side === "left" ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side === "left" ? "right" : "left"}>
          Show {title.toLowerCase()} panel
        </TooltipContent>
      </Tooltip>
      <span className="text-muted-foreground">{icon}</span>
      <button
        className="flex flex-1 items-start justify-center pt-3"
        onClick={onExpand}
        title={`Show ${title.toLowerCase()} panel`}
      >
        <span className="[writing-mode:vertical-rl] text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </span>
      </button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(Math.round(value * 100) / 100);
  return (
    <label className="flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2 focus-within:border-violet-400/50">
      <span className="w-6 shrink-0 text-center text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        className="input-numeric w-full bg-transparent text-xs outline-none"
        value={shown}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}

type Gesture =
  | { kind: "pan"; startX: number; startY: number; panX: number; panY: number }
  | {
      kind: "move";
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      ids: string[];
      pushed: boolean;
    }
  | {
      kind: "resize";
      handle: string;
      id: string;
      start: Bounds;
      startX: number;
      startY: number;
      pushed: boolean;
      /** Shift held: keep the original aspect ratio. */
      keepAspect: boolean;
    }
  | { kind: "draw"; originX: number; originY: number; type: DesignNode["type"] }
  | {
      kind: "marquee";
      originX: number;
      originY: number;
      additive: boolean;
      baseIds: string[];
    }
  | {
      kind: "rotate";
      id: string;
      centerX: number;
      centerY: number;
      startAngle: number;
      startRotation: number;
      pushed: boolean;
    }
  | {
      /** Scale tool (K): proportionally scale selection from its top-left. */
      kind: "scale";
      start: Bounds;
      startX: number;
      startY: number;
      ids: string[];
      pushed: boolean;
    };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

/* ---------- Figma-style alignment / distribute / flip bar ---------- */

function AlignBar() {
  const selectedIds = useEditor((s) => s.selectedIds);
  if (selectedIds.length < 2) return null;
  return (
    <div className="fixed left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/60 bg-card/90 px-2 py-1 shadow-lg backdrop-blur">
      {(
        [
          { m: "left", icon: AlignStartVertical, label: "Align left" },
          { m: "hcenter", icon: AlignCenterVertical, label: "Align horizontal centers" },
          { m: "right", icon: AlignEndVertical, label: "Align right" },
          { m: "top", icon: AlignStartHorizontal, label: "Align top" },
          { m: "vcenter", icon: AlignCenterHorizontal, label: "Align vertical centers" },
          { m: "bottom", icon: AlignEndHorizontal, label: "Align bottom" },
        ] as const
      ).map(({ m, icon: Icon, label }) => (
        <Tooltip key={m}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7"
              onClick={() => useEditor.getState().alignNodes(selectedIds, m)}
            >
              <Icon className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
      <span className="mx-0.5 h-4 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            disabled={selectedIds.length < 3}
            onClick={() => useEditor.getState().distributeNodes(selectedIds, "h")}
          >
            <AlignHorizontalDistributeCenter className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Distribute horizontally</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            disabled={selectedIds.length < 3}
            onClick={() => useEditor.getState().distributeNodes(selectedIds, "v")}
          >
            <AlignVerticalDistributeCenter className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Distribute vertically</TooltipContent>
      </Tooltip>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => useEditor.getState().flipNodes(selectedIds, "h")}
          >
            <FlipHorizontal2 className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Flip horizontal</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => useEditor.getState().flipNodes(selectedIds, "v")}
          >
            <FlipVertical2 className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Flip vertical</TooltipContent>
      </Tooltip>
    </div>
  );
}

/* ---------- Frame presets: stamp exact device sizes ---------- */

function FramePresetBar({ onPick }: { onPick: (p: FramePreset) => void }) {
  const tool = useEditor((s) => s.tool);
  if (tool !== "frame") return null;
  return (
    <div className="fixed left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 shadow-lg backdrop-blur">
      <span className="mr-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        Frames
      </span>
      {DEFAULT_FRAME_PRESETS.map((p) => (
        <button
          key={p.id}
          title={`${p.w} × ${p.h}`}
          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-violet-500/25 hover:text-violet-200"
          onClick={() => onPick(p)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Right-click canvas context menu ---------- */

function CanvasContextMenu({
  menu,
  onClose,
}: {
  menu: { sx: number; sy: number; page: { x: number; y: number } };
  onClose: () => void;
}) {
  const selectedIds = useEditor((s) => s.selectedIds);
  const items: {
    label: string;
    hint?: string;
    disabled?: boolean;
    run: () => void;
  }[] = [
    {
      label: "Copy",
      hint: "⌘C",
      disabled: selectedIds.length === 0,
      run: () => useEditor.getState().copyNodes(selectedIds),
    },
    {
      label: "Paste here",
      hint: "⌘V",
      run: () => useEditor.getState().pasteNodes(menu.page),
    },
    {
      label: "Duplicate",
      hint: "⌘D",
      disabled: selectedIds.length === 0,
      run: () => useEditor.getState().duplicateNodes(selectedIds),
    },
    {
      label: "Bring forward",
      hint: "]",
      disabled: selectedIds.length === 0,
      run: () =>
        selectedIds.forEach((id) => useEditor.getState().reorder(id, "forward")),
    },
    {
      label: "Send backward",
      hint: "[",
      disabled: selectedIds.length === 0,
      run: () =>
        selectedIds.forEach((id) => useEditor.getState().reorder(id, "backward")),
    },
    {
      label: "Delete",
      hint: "⌫",
      disabled: selectedIds.length === 0,
      run: () => useEditor.getState().deleteNodes(selectedIds),
    },
  ];
  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onPointerDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-40 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl"
        style={{ left: menu.sx, top: menu.sy }}
      >
        {items.map((it) => (
          <button
            key={it.label}
            disabled={it.disabled}
            onClick={() => {
              it.run();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            <span>{it.label}</span>
            {it.hint && (
              <span className="text-[10px] text-muted-foreground">{it.hint}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- Figma-style command palette (⌘K) ---------- */
// Rendered at the end of the Editor page; ⌘K toggles it.

function CommandPalette({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actions: {
    exportPng: () => void;
    exportCss: () => void;
    exportJson: () => void;
    saveVersion: () => void;
    present: () => void;
    share: () => void;
    library: () => void;
    lint: () => void;
  };
}) {
  const selectedIds = useEditor((s) => s.selectedIds);
  const run = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };
  const s = () => useEditor.getState();
  const tools: { t: Tool; icon: typeof Square; label: string; key: string }[] = [
    { t: "select", icon: MousePointer2, label: "Move", key: "V" },
    { t: "hand", icon: Move, label: "Hand", key: "H" },
    { t: "frame", icon: Frame, label: "Frame", key: "F" },
    { t: "rect", icon: Square, label: "Rectangle", key: "R" },
    { t: "ellipse", icon: Circle, label: "Ellipse", key: "O" },
    { t: "line", icon: Minus, label: "Line", key: "L" },
    { t: "arrow", icon: ArrowUpRight, label: "Arrow", key: "A" },
    { t: "polygon", icon: Pentagon, label: "Polygon", key: "P" },
    { t: "text", icon: Type, label: "Text", key: "T" },
    { t: "image", icon: ImageIcon, label: "Image", key: "I" },
    { t: "comment", icon: MessageCircle, label: "Comment", key: "C" },
  ];
  const canBoolean = selectedIds.length >= 2;
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Node commands"
      description="Search tools, edits, views, and file actions"
    >
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandGroup heading="Tools">
          {tools.map(({ t, icon: Icon, label, key }) => (
            <CommandItem key={t} onSelect={() => run(() => s().setTool(t))}>
              <Icon className="size-4" />
              {label}
              <CommandShortcut>{key}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Edit">
          <CommandItem onSelect={() => run(() => s().undo())}>
            <Undo2 className="size-4" /> Undo
            <CommandShortcut>⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => s().redo())}>
            <Redo2 className="size-4" /> Redo
            <CommandShortcut>⇧⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length === 0}
            onSelect={() => run(() => s().duplicateNodes(selectedIds))}
          >
            <Copy className="size-4" /> Duplicate
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length === 0}
            onSelect={() => run(() => s().deleteNodes(selectedIds))}
          >
            <Trash2 className="size-4" /> Delete selection
            <CommandShortcut>⌫</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Arrange">
          <CommandItem
            disabled={selectedIds.length < 2}
            onSelect={() => run(() => s().booleanNodes(selectedIds, "union"))}
          >
            <Combine className="size-4" /> Boolean union
          </CommandItem>
          <CommandItem
            disabled={!canBoolean}
            onSelect={() => run(() => s().booleanNodes(selectedIds, "subtract"))}
          >
            <Diff className="size-4" /> Boolean subtract
          </CommandItem>
          <CommandItem
            disabled={!canBoolean}
            onSelect={() =>
              run(() => s().booleanNodes(selectedIds, "intersect"))
            }
          >
            <SquareStack className="size-4" /> Boolean intersect
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length < 2}
            onSelect={() => run(() => s().groupNodes(selectedIds))}
          >
            <Boxes className="size-4" /> Group
            <CommandShortcut>⌘G</CommandShortcut>
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length === 0}
            onSelect={() =>
              run(() => selectedIds.forEach((id) => s().reorder(id, "front")))
            }
          >
            <ArrowUp className="size-4" /> Bring to front
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length === 0}
            onSelect={() =>
              run(() => selectedIds.forEach((id) => s().reorder(id, "back")))
            }
          >
            <ArrowDown className="size-4" /> Send to back
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length < 2}
            onSelect={() =>
              run(() => s().alignNodes(selectedIds, "hcenter"))
            }
          >
            <AlignCenterVertical className="size-4" /> Align horizontal centers
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length < 2}
            onSelect={() => s().distributeNodes(selectedIds, "h")}
          >
            <AlignHorizontalDistributeCenter className="size-4" /> Distribute
            horizontally
          </CommandItem>
          <CommandItem
            disabled={selectedIds.length === 0}
            onSelect={() => run(() => s().flipNodes(selectedIds, "h"))}
          >
            <FlipHorizontal2 className="size-4" /> Flip horizontal
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="View">
          <CommandItem
            onSelect={() =>
              run(() => {
                const st = s();
                st.setViewport(1, st.panX, st.panY);
              })
            }
          >
            <Scan className="size-4" /> Zoom to 100%
            <CommandShortcut>0</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                // Mirror the ⇧1 shortcut: fit selection or whole page.
                const st = s();
                if (st.selectedIds.length > 0) {
                  const page = activePage(st.doc);
                  const nodes = page.nodes.filter((n) =>
                    st.selectedIds.includes(n.id),
                  );
                  const b = unionBounds(nodes);
                  const el = document.querySelector("canvas");
                  if (b && el) {
                    const pad = 80;
                    const z = Math.min(
                      8,
                      Math.max(
                        0.05,
                        Math.min(
                          (el.clientWidth - pad * 2) / Math.max(b.w, 1),
                          (el.clientHeight - pad * 2) / Math.max(b.h, 1),
                        ),
                      ),
                    );
                    st.setViewport(
                      z,
                      el.clientWidth / 2 - (b.x + b.w / 2) * z,
                      el.clientHeight / 2 - (b.y + b.h / 2) * z,
                    );
                    return;
                  }
                }
              })
            }
          >
            <Scan className="size-4" /> Zoom to selection
            <CommandShortcut>⇧1</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="File">
          <CommandItem onSelect={() => run(actions.saveVersion)}>
            <History className="size-4" /> Save version
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(actions.present)}>
            <Eye className="size-4" /> Present
          </CommandItem>
          <CommandItem onSelect={() => run(actions.library)}>
            <SquareStack className="size-4" /> Library: premade assets…
          </CommandItem>
          <CommandItem onSelect={() => run(actions.lint)}>
            <ScanSearch className="size-4" /> Design lint: find issues…
          </CommandItem>
          <CommandItem onSelect={() => run(actions.share)}>
            <Share2 className="size-4" /> Share…
          </CommandItem>
          <CommandItem onSelect={() => run(actions.exportPng)}>
            <Download className="size-4" /> Export PNG @2x
          </CommandItem>
          <CommandItem onSelect={() => run(actions.exportCss)}>
            <Download className="size-4" /> Export CSS
          </CommandItem>
          <CommandItem onSelect={() => run(actions.exportJson)}>
            <Download className="size-4" /> Export Node JSON
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/* ---------- Canvas rulers ---------- */

function Rulers({
  zoom,
  panX,
  panY,
}: {
  zoom: number;
  panX: number;
  panY: number;
}) {
  const topRef = useRef<HTMLCanvasElement | null>(null);
  const leftRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const draw = (canvas: HTMLCanvasElement | null, horizontal: boolean) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(18,18,22,0.92)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "9px ui-sans-serif, system-ui, sans-serif";
      ctx.lineWidth = 1;
      const step = 100; // page units between major ticks
      const origin = horizontal ? panX : panY;
      const span = horizontal ? w : h;
      const start = Math.floor(-origin / zoom / step) * step;
      const end = start + span / zoom + step;
      for (let v = start; v <= end; v += step) {
        const p = v * zoom + origin;
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(p + 0.5, h - 8);
          ctx.lineTo(p + 0.5, h);
          ctx.fillText(String(v), p + 3, h - 11);
        } else {
          ctx.moveTo(w - 8, p + 0.5);
          ctx.lineTo(w, p + 0.5);
          ctx.save();
          ctx.translate(3, p - 3);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(v), 0, 0);
          ctx.restore();
        }
        ctx.stroke();
      }
    };
    draw(topRef.current, true);
    draw(leftRef.current, false);
  }, [zoom, panX, panY]);
  return (
    <>
      <canvas
        ref={topRef}
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-5 w-full"
      />
      <canvas
        ref={leftRef}
        className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-5"
      />
    </>
  );
}

/* ---------- Editor page ---------- */

export default function Editor() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const fileRow = useQuery(api.files.get, { id: fileId as Id<"files"> });
  const comments = useQuery(api.comments.list, {
    fileId: fileId as Id<"files">,
  });
  const versions = useQuery(api.files.listVersions, {
    fileId: fileId as Id<"files">,
  });
  const presence = useQuery(api.presence.list, {
    fileId: fileId as Id<"files">,
  });

  const updateDoc = useMutation(api.files.updateDoc);
  const renameFile = useMutation(api.files.rename);
  const snapshotVersionRaw = useMutation(api.files.snapshot);
  const restoreVersion = useMutation(api.files.restoreVersion);
  const addComment = useMutation(api.comments.add);
  const resolveComment = useMutation(api.comments.resolve);
  const removeComment = useMutation(api.comments.remove);
  const heartbeat = useMutation(api.presence.heartbeat);
  const leavePresence = useMutation(api.presence.leave);
  const publishFile = useMutation(api.files.publish);
  const unpublishFile = useMutation(api.files.unpublish);

  const doc = useEditor((s) => s.doc);
  const tool = useEditor((s) => s.tool);
  const selectedIds = useEditor((s) => s.selectedIds);
  const hoverId = useEditor((s) => s.hoverId);
  const zoom = useEditor((s) => s.zoom);
  const panX = useEditor((s) => s.panX);
  const panY = useEditor((s) => s.panY);
  const dirty = useEditor((s) => s.dirty);
  const fittedFor = useEditor((s) => s.fittedFor);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);

  const store = useEditor;

  /**
   * Every manual "save version" entry point (⌘S, command palette, version
   * history) flows through here. `files.snapshot` snapshots the server-side
   * `file.doc`, which lags the live doc by up to the autosave debounce — so
   * push the current in-memory doc to the cloud FIRST, then snapshot, to
   * ensure the captured version includes edits made since the last autosave.
   */
  const snapshotVersion = useCallback(
    async (opts: Parameters<typeof snapshotVersionRaw>[0]) => {
      await updateDoc({ id: fileId as Id<"files">, doc: store.getState().doc }).catch(
        () => undefined,
      );
      return snapshotVersionRaw(opts);
    },
    [fileId, snapshotVersionRaw, store, updateDoc],
  );

  const [name, setName] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [lintOpen, setLintOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [publishTags, setPublishTags] = useState("");
  const [showRulers, setShowRulers] = useState(false);
  const [leftTab, setLeftTab] = useState<"layers" | "assets">("layers");
  const [dock, setDock] = useState(readDockState);

  const toggleDock = useCallback((side: "left" | "right") => {
    setDock((d) => {
      const next = { ...d, [side]: !d[side] };
      try {
        const raw = localStorage.getItem(PANEL_SIZES_KEY);
        const m = raw ? JSON.parse(raw) : {};
        m[`${side}Open`] = next[side];
        localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(m));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const handleGroupLayout = useCallback(
    (sizes: number[]) => {
      try {
        const raw = localStorage.getItem(PANEL_SIZES_KEY);
        const m = raw ? JSON.parse(raw) : {};
        let i = 0;
        if (dock.left) m.leftSize = sizes[i++];
        i += 1; // center canvas panel
        if (dock.right) m.rightSize = sizes[i++];
        localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(m));
      } catch {
        /* storage unavailable */
      }
    },
    [dock.left, dock.right],
  );
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [outlineMode, setOutlineMode] = useState(false);
  const [marquee, setMarquee] = useState<Bounds | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageTargetRef = useRef<{ x: number; y: number } | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastCursorSentRef = useRef<number>(0);
  /** Space held → temporary hand/pan mode (Figma convention). */
  const spaceRef = useRef(false);
  /** Screen-space position for context menus and paste-at-cursor. */
  const [contextMenu, setContextMenu] = useState<{
    sx: number;
    sy: number;
    page: { x: number; y: number };
  } | null>(null);

  const [previewNode, setPreviewNode] = useState<DesignNode | null>(null);
  const [editingText, setEditingText] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [draftComment, setDraftComment] = useState<{
    x: number;
    y: number;
    body: string;
  } | null>(null);

  /* ----- Load doc: device-first boot, then newest-wins cloud reconcile ----- */
  const loadedIdRef = useRef<string | null>(null);
  const cloudHandledRef = useRef<string | null>(null);
  const localSavedAtRef = useRef<number | null>(null);
  const cloudUpdatedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!fileId || loadedIdRef.current === fileId) return;
    loadedIdRef.current = fileId ?? null;
    let alive = true;
    // 1) Boot instantly from the copy stored on this device (works offline).
    loadFileLocal(fileId)
      .then((local) => {
        if (!alive || !local) return;
        localSavedAtRef.current = local.savedAt;
        if (store.getState().dirty) return; // never clobber in-flight edits
        // Skip if the cloud copy (already applied) was newer than this.
        if (
          cloudUpdatedAtRef.current !== null &&
          cloudUpdatedAtRef.current > local.savedAt + 500
        )
          return;
        const d = local.doc as DesignDoc | undefined;
        const valid =
          d &&
          typeof d === "object" &&
          Array.isArray(d.pages) &&
          d.pages.length > 0;
        if (!valid) return;
        store.getState().setDoc(d as DesignDoc, { resetHistory: true });
        store.getState().markSaved();
        setName(local.name || name);
        // Cloud row already arrived and was older — push the device copy up.
        if (cloudUpdatedAtRef.current !== null) {
          updateDoc({ id: fileId as Id<"files">, doc: d as DesignDoc }).catch(
            () => undefined,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, store]);

  // 2) When the cloud row arrives, apply it only if newer than the device copy.
  useEffect(() => {
    if (!fileRow || cloudHandledRef.current === fileId) return;
    cloudHandledRef.current = fileId ?? null;
    cloudUpdatedAtRef.current = fileRow.updatedAt;
    if (store.getState().dirty) return;
    const remote = fileRow.doc as DesignDoc | undefined;
    const valid =
      remote &&
      typeof remote === "object" &&
      Array.isArray(remote.pages) &&
      remote.pages.length > 0;
    if (!valid) return;
    if (
      localSavedAtRef.current !== null &&
      fileRow.updatedAt <= localSavedAtRef.current + 500
    ) {
      // Device copy is as new or newer — keep it and sync it upward.
      updateDoc({
        id: fileId as Id<"files">,
        doc: store.getState().doc,
      }).catch(() => undefined);
      return;
    }
    store.getState().setDoc(remote as DesignDoc, { resetHistory: true });
    setName(fileRow.name);
  }, [fileRow, fileId, store, updateDoc]);

  /* ----- Fit view once per loaded file ----- */
  useEffect(() => {
    if (!wrapRef.current) return;
    if (fittedFor === fileId) return;
    const el = wrapRef.current;
    const t = fitTransform(doc, el.clientWidth, el.clientHeight);
    store.setState({ fittedFor: fileId ?? null });
    store.getState().setViewport(t.zoom, t.panX, t.panY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, fileId, fittedFor]);

  /* ----- Save: local-first (device IndexedDB), then cloud sync ----- */
  useEffect(() => {
    if (!dirty || !fileId) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      // 1) Always write to the user's device first - instant, offline-safe.
      saveFileLocal(fileId, name, doc)
        .catch(() => undefined) // private-mode/quota failures must not block the cloud sync
        .finally(() => {
          if (cancelled) return;
          // 2) Then sync to the cloud so collaborators stay in sync (best effort).
          if (fileRow) {
            updateDoc({ id: fileId as Id<"files">, doc })
              .then(() => store.getState().markSaved())
              .catch(() => undefined);
          } else {
            // No cloud row (offline or missing) - the device copy IS the save.
            store.getState().markSaved();
          }
        });
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [doc, dirty, fileRow, fileId, name, updateDoc, store]);

  /* ----- Multiplayer doc sync: adopt remote updates we haven't seen ----- */
  const lastPushedVersionRef = useRef<number>(0);
  const adoptRemote = useRef(true);
  useEffect(() => {
    if (!fileRow) return;
    // Skip while we're mid-gesture or have unsaved local work in flight.
    if (gestureRef.current || dirty) {
      adoptRemote.current = false;
      return;
    }
    adoptRemote.current = true;
    const remote = fileRow.doc as DesignDoc | undefined;
    if (!remote || !Array.isArray(remote.pages) || remote.pages.length === 0) return;
    const local = store.getState().doc;
    const sameVersion = fileRow.version === lastPushedVersionRef.current;
    if (sameVersion) return;
    lastPushedVersionRef.current = fileRow.version;
    // Only replace if structurally different (cheap guard) to avoid clobbering
    // local in-flight updates that already round-tripped.
    if (JSON.stringify(remote) !== JSON.stringify(local)) {
      store.getState().adoptDoc(remote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileRow?.version, fileRow?.doc, dirty, gestureRef, store]);

  /* ----- Presence heartbeat (interval + throttled on movement) ----- */
  const sendPresence = useCallback(
    (x: number, y: number, selection: string[]) =>
      heartbeat({
        fileId: fileId as Id<"files">,
        x,
        y,
        selection,
      }),
    [heartbeat, fileId],
  );

  useEffect(() => {
    if (!fileRow) return;
    const handle = setInterval(() => {
      sendPresence(mouseRef.current.x, mouseRef.current.y, store.getState().selectedIds);
    }, 3000);
    return () => clearInterval(handle);
  }, [fileRow, sendPresence, store]);

  useEffect(() => {
    return () => {
      if (fileId) leavePresence({ fileId: fileId as Id<"files"> });
    };
  }, [fileId, leavePresence]);

  /* ----- Canvas rendering ----- */
  const remoteSelection = useMemo(() => {
    const ids: string[] = [];
    for (const p of presence ?? []) {
      if (p.userId === user?._id) continue;
      ids.push(...p.selection);
    }
    return ids;
  }, [presence, user]);

  /* ----- Space-key pan tracking ----- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        spaceRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const state = store.getState();
    const other = (presence ?? []).find((p) => p.userId !== user?._id);
    renderDoc(ctx, state.doc, { zoom: state.zoom, panX: state.panX, panY: state.panY }, w, h, dpr, {
      showChrome: !presenting,
      selection: state.selectedIds,
      remoteSelection,
      hoverId: state.hoverId,
      drawPreview: previewNode,
      selectionColor: other?.color ?? "#8b5cf6",
      snapGuides,
      outlineMode,
      marquee,
    });
  }, [presence, user, presenting, previewNode, remoteSelection, snapGuides, outlineMode, marquee, store]);

  useEffect(() => {
    render();
  });
  useEffect(() => {
    const onResize = () => render();
    window.addEventListener("resize", onResize);
    // Dock panels resize the canvas without a window resize — keep it crisp.
    let ro: ResizeObserver | null = null;
    if (wrapRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(wrapRef.current);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [render]);

  /* ----- Coordinate helpers ----- */
  const toPage = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return screenToPage(
      { zoom, panX, panY },
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  };
  const toScreen = (x: number, y: number) =>
    pageToScreen({ zoom, panX, panY }, x, y);

  /* ----- Resize-handle hit test (screen space) ----- */
  const hitHandle = (e: React.PointerEvent): string | null => {
    if (selectedIds.length !== 1) return null;
    const node = activePage(doc).nodes.find((n) => n.id === selectedIds[0]);
    if (!node || node.locked) return null;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // Rotate handle: a circle 24px above the node's top-center, following
    // the node's rotation so it stays attached while spinning.
    {
      const b = nodeBounds(node);
      const rot = ((node.rotation ?? 0) * Math.PI) / 180;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const offX = (b.h / 2) * Math.sin(rot) * zoom * 1.6;
      const offY = -(b.h / 2) * Math.cos(rot) * zoom * 1.6;
      const hx = cx * zoom + panX + offX;
      const hy = cy * zoom + panY + offY;
      if (Math.abs(sx - hx) <= 8 && Math.abs(sy - hy) <= 8) return "rotate";
    }
    const b = nodeBounds(node);
    const xs = [b.x, b.x + b.w / 2, b.x + b.w];
    const ys = [b.y, b.y + b.h / 2, b.y + b.h];
    const pts: Record<string, [number, number]> = {
      nw: [xs[0], ys[0]],
      n: [xs[1], ys[0]],
      ne: [xs[2], ys[0]],
      e: [xs[2], ys[1]],
      se: [xs[2], ys[2]],
      s: [xs[1], ys[2]],
      sw: [xs[0], ys[2]],
      w: [xs[0], ys[1]],
    };
    for (const hKey of HANDLES) {
      const [hx, hy] = pts[hKey];
      const scr = toScreen(hx, hy);
      if (Math.abs(scr.sx - sx) <= 6 && Math.abs(scr.sy - sy) <= 6) return hKey;
    }
    return null;
  };

  /* ----- Pointer interactions ----- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (presenting) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const page = toPage(e);
    const state = store.getState();

    if (tool === "hand" || e.button === 1 || spaceRef.current) {
      gestureRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        panX,
        panY,
      };
      return;
    }

    if (tool === "comment") {
      setDraftComment({ x: page.x, y: page.y, body: "" });
      return;
    }

    // Resize / rotate handles take priority when exactly one node is selected.
    if (tool === "select" && selectedIds.length === 1) {
      const handle = hitHandle(e);
      if (handle === "rotate") {
        const node = activePage(doc).nodes.find(
          (n) => n.id === selectedIds[0],
        )!;
        const b = nodeBounds(node);
        gestureRef.current = {
          kind: "rotate",
          id: node.id,
          centerX: b.x + b.w / 2,
          centerY: b.y + b.h / 2,
          startAngle: Math.atan2(
            page.y - (b.y + b.h / 2),
            page.x - (b.x + b.w / 2),
          ),
          startRotation: node.rotation ?? 0,
          pushed: false,
        };
        return;
      }
      if (handle) {
        const node = activePage(doc).nodes.find(
          (n) => n.id === selectedIds[0],
        )!;
        gestureRef.current = {
          kind: "resize",
          handle,
          id: node.id,
          start: nodeBounds(node),
          startX: page.x,
          startY: page.y,
          pushed: false,
          keepAspect: e.shiftKey,
        };
        return;
      }
    }

    if (tool === "scale") {
      const hit = hitTest(state.doc, page.x, page.y);
      const ids = hit && !hit.locked ? [hit.id] : selectedIds;
      if (ids.length > 0) {
        const nodes = activePage(state.doc).nodes.filter((n) =>
          ids.includes(n.id),
        );
        const b = unionBounds(nodes);
        if (b) {
          gestureRef.current = {
            kind: "scale",
            start: b,
            startX: page.x,
            startY: page.y,
            ids,
            pushed: false,
          };
          return;
        }
      }
      // Nothing to scale — fall back to select behavior.
      state.setTool("select");
    }

    if (tool === "select") {
      const hit = hitTest(state.doc, page.x, page.y);
      if (hit && !hit.locked) {
        let ids = selectedIds.includes(hit.id)
          ? selectedIds
          : e.shiftKey
            ? [...selectedIds, hit.id]
            : [hit.id];
        // Alt-drag duplicates the selection and drags the copies (Figma-style).
        if (e.altKey) {
          state.duplicateNodes(ids);
          ids = store.getState().selectedIds;
        }
        state.select(ids);
        gestureRef.current = {
          kind: "move",
          startX: page.x,
          startY: page.y,
          lastX: page.x,
          lastY: page.y,
          ids,
          pushed: false,
        };
      } else if (!hit) {
        // Left-drag on empty canvas rubber-band selects (marquee).
        state.select([]);
        gestureRef.current = {
          kind: "marquee",
          originX: page.x,
          originY: page.y,
          additive: e.shiftKey,
          baseIds: e.shiftKey ? [...selectedIds] : [],
        };
      }
      return;
    }

    if (["frame", "rect", "ellipse", "line", "polygon", "arrow"].includes(tool)) {
      gestureRef.current = {
        kind: "draw",
        originX: page.x,
        originY: page.y,
        type: tool as DesignNode["type"],
      };
      setPreviewNode(defaultNode(tool as DesignNode["type"], page.x, page.y));
      return;
    }

    if (tool === "text") {
      const node = defaultNode("text", page.x, page.y);
      node.text = "";
      node.h = (node.fontSize ?? 16) * 1.4;
      state.addNode(node);
      setEditingText({ id: node.id, value: "" });
      return;
    }

    if (tool === "image") {
      imageTargetRef.current = { x: page.x, y: page.y };
      fileInputRef.current?.click();
      return;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const page = toPage(e);
    mouseRef.current = page;
    const g = gestureRef.current;

    if (!g) {
      if (!presenting && tool === "select") {
        const hit = hitTest(store.getState().doc, page.x, page.y);
        if ((hit?.id ?? null) !== hoverId)
          store.getState().setHover(hit?.id ?? null);
      }
      return;
    }

    const state = store.getState();

    // Throttled live cursor broadcast (alongside the 3s heartbeat).
    const now = Date.now();
    if (now - lastCursorSentRef.current > 120) {
      lastCursorSentRef.current = now;
      sendPresence(page.x, page.y, state.selectedIds);
    }

    if (g.kind === "pan") {
      state.setViewport(
        zoom,
        g.panX + (e.clientX - g.startX),
        g.panY + (e.clientY - g.startY),
      );
      return;
    }

    if (g.kind === "move") {
      const dx = page.x - g.lastX;
      const dy = page.y - g.lastY;
      if (!g.pushed) {
        state.pushHistory();
        g.pushed = true;
      }
      // Shift constrains dragging to a single axis (Figma behavior).
      const totalDx = page.x - g.startX;
      const totalDy = page.y - g.startY;
      const constrain = e.shiftKey;
      const effectiveDx = constrain && Math.abs(totalDy) > Math.abs(totalDx) ? 0 : dx;
      const effectiveDy = constrain && Math.abs(totalDx) >= Math.abs(totalDy) ? 0 : dy;
      g.lastX = page.x;
      g.lastY = page.y;
      state.moveNodesLive(g.ids, effectiveDx, effectiveDy);
      // Smart snapping against other nodes' edges/centers.
      const pageData = activePage(state.doc);
      const moving = pageData.nodes.filter((n) => g.ids.includes(n.id));
      const mb = unionBounds(moving);
      if (mb) {
        const targets = snapTargets(pageData, g.ids);
        const THRESH = 6 / zoom; // 6 screen px in page units
        let bestX: { delta: number; guide: SnapGuide } | null = null;
        let bestY: { delta: number; guide: SnapGuide } | null = null;
        for (const cand of targets.xs) {
          for (const [mv, kind] of [
            [mb.x, "edge"],
            [mb.x + mb.w, "edge"],
            [mb.x + mb.w / 2, "center"],
          ] as const) {
            const d = cand.value - mv;
            if (Math.abs(d) < THRESH && (!bestX || Math.abs(d) < Math.abs(bestX.delta)))
              bestX = { delta: d, guide: { axis: "x", value: cand.value, kind } };
          }
        }
        for (const cand of targets.ys) {
          for (const [mv, kind] of [
            [mb.y, "edge"],
            [mb.y + mb.h, "edge"],
            [mb.y + mb.h / 2, "center"],
          ] as const) {
            const d = cand.value - mv;
            if (Math.abs(d) < THRESH && (!bestY || Math.abs(d) < Math.abs(bestY.delta)))
              bestY = { delta: d, guide: { axis: "y", value: cand.value, kind } };
          }
        }
        if (bestX) state.moveNodesLive(g.ids, bestX.delta, 0);
        if (bestY) state.moveNodesLive(g.ids, 0, bestY.delta);
        setSnapGuides(
          [bestX?.guide, bestY?.guide].filter(Boolean) as SnapGuide[],
        );
      }
      return;
    }

    if (g.kind === "resize") {
      if (!g.pushed) {
        state.pushHistory();
        g.pushed = true;
      }
      const b = g.start;
      const dx = page.x - g.startX;
      const dy = page.y - g.startY;
      let { x, y, w, h } = b;
      if (g.handle.includes("e")) w = Math.max(2, b.w + dx);
      if (g.handle.includes("s")) h = Math.max(2, b.h + dy);
      if (g.handle.includes("w")) {
        w = Math.max(2, b.w - dx);
        x = b.x + (b.w - w);
      }
      if (g.handle.includes("n")) {
        h = Math.max(2, b.h - dy);
        y = b.y + (b.h - h);
      }
      // Shift keeps the original aspect ratio (Figma behavior).
      if (g.keepAspect && b.w > 0 && b.h > 0) {
        const ratio = b.w / b.h;
        if (g.handle === "e" || g.handle === "w") {
          h = Math.max(2, w / ratio);
          y = b.y + (b.h - h) / 2;
        } else if (g.handle === "n" || g.handle === "s") {
          w = Math.max(2, h * ratio);
          x = b.x + (b.w - w) / 2;
        } else {
          if (w / ratio > h) h = Math.max(2, w / ratio);
          else w = Math.max(2, h * ratio);
          if (g.handle.includes("w")) x = b.x + (b.w - w);
          if (g.handle.includes("n")) y = b.y + (b.h - h);
        }
      }
      state.updateNodesLive([g.id], { x, y, w, h });
      return;
    }

    if (g.kind === "marquee") {
      const rect: Bounds = {
        x: Math.min(g.originX, page.x),
        y: Math.min(g.originY, page.y),
        w: Math.abs(page.x - g.originX),
        h: Math.abs(page.y - g.originY),
      };
      setMarquee(rect);
      const hits = activePage(state.doc).nodes
        .filter(
          (n) =>
            !n.hidden &&
            !n.locked &&
            n.type !== "group" &&
            n.x < rect.x + rect.w &&
            n.x + n.w > rect.x &&
            n.y < rect.y + rect.h &&
            n.y + n.h > rect.y,
        )
        .map((n) => n.id);
      const ids = g.additive
        ? [...new Set([...g.baseIds, ...hits])]
        : hits;
      state.select(ids);
      return;
    }

    if (g.kind === "rotate") {
      if (!g.pushed) {
        state.pushHistory();
        g.pushed = true;
      }
      const angle = Math.atan2(page.y - g.centerY, page.x - g.centerX);
      let delta =
        ((angle - g.startAngle) * 180) / Math.PI + g.startRotation;
      if (e.shiftKey) delta = Math.round(delta / 15) * 15; // 15° snapping
      delta = ((delta % 360) + 360) % 360;
      state.updateNodesLive([g.id], { rotation: Math.round(delta * 10) / 10 });
      return;
    }

    if (g.kind === "scale") {
      if (!g.pushed) {
        state.pushHistory();
        g.pushed = true;
      }
      const kx =
        Math.abs(g.start.w) < 1e-3
          ? 1
          : Math.max(0.05, (g.start.w + (page.x - g.startX)) / g.start.w);
      const ky =
        Math.abs(g.start.h) < 1e-3
          ? 1
          : Math.max(0.05, (g.start.h + (page.y - g.startY)) / g.start.h);
      const k = e.shiftKey ? Math.min(kx, ky) : Math.hypot(kx, ky) / Math.SQRT2;
      const pageData = activePage(state.doc);
      for (const id of g.ids) {
        const n = pageData.nodes.find((x) => x.id === id);
        if (!n) continue;
        state.updateNodesLive([id], {
          x: g.start.x + (n.x - g.start.x) * k,
          y: g.start.y + (n.y - g.start.y) * k,
          w: Math.max(2, n.w * k),
          h:
            n.type === "line" || n.type === "arrow"
              ? n.h
              : Math.max(2, n.h * k),
          fontSize:
            n.fontSize !== undefined ? Math.max(4, Math.round(n.fontSize * k)) : undefined,
        });
      }
      return;
    }

    if (g.kind === "draw") {
      const w = page.x - g.originX;
      const h = page.y - g.originY;
      const isLine = g.type === "line";
      setPreviewNode({
        ...(previewNode ?? defaultNode(g.type, g.originX, g.originY)),
        x: isLine ? g.originX : Math.min(g.originX, page.x),
        y: isLine ? g.originY : Math.min(g.originY, page.y),
        w: isLine ? w : Math.abs(w),
        h: isLine ? h : Math.abs(h),
      });
    }
  };

  const onPointerUp = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    setSnapGuides([]);
    setMarquee(null);
    if (g?.kind === "draw" && previewNode) {
      const tooSmall = Math.abs(previewNode.w) < 4 && Math.abs(previewNode.h) < 4;
      if (!tooSmall) store.getState().addNode(previewNode);
      setPreviewNode(null);
    }
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const page = toPage(e);
    const hit = hitTest(store.getState().doc, page.x, page.y);
    if (hit && hit.type === "text") {
      store.getState().select([hit.id]);
      setEditingText({ id: hit.id, value: hit.text ?? "" });
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.exp(-e.deltaY * 0.01);
      const newZoom = Math.min(8, Math.max(0.05, zoom * factor));
      const px = sx - ((sx - panX) * newZoom) / zoom;
      const py = sy - ((sy - panY) * newZoom) / zoom;
      store.getState().setViewport(newZoom, px, py);
    } else {
      store.getState().setViewport(zoom, panX - e.deltaX, panY - e.deltaY);
    }
  };

  /* ----- Keyboard shortcuts ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      const state = store.getState();
      const mod = e.metaKey || e.ctrlKey;

      // Figma-style paint style clipboard (⌥⌘C / ⌥⌘V)
      if (mod && e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (state.selectedIds.length > 0)
          state.copyStyle(state.selectedIds[0]);
        return;
      }
      if (mod && e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        state.pasteStyle(state.selectedIds);
        return;
      }

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        state.duplicateNodes(state.selectedIds);
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        state.select(activePage(state.doc).nodes.map((n) => n.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveFileLocal(fileId ?? "", name, store.getState().doc).catch(() => undefined);
        snapshotVersion({ id: fileId as Id<"files">, label: "Manual save" });
        return;
      }
      // Command palette (⌘K)
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      // Boolean operations (⌘⇧U / ⌘⇧S-ish Figma habits: ⌘⇧U union)
      if (mod && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        state.booleanNodes(state.selectedIds, "union");
        return;
      }
      // Figma-style clipboard: ⌘C / ⌘X / ⌘V
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        state.copyNodes(state.selectedIds);
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        state.cutNodes(state.selectedIds);
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const at =
          mouseRef.current.x || mouseRef.current.y
            ? { x: mouseRef.current.x, y: mouseRef.current.y }
            : undefined;
        state.pasteNodes(at);
        return;
      }
      // Layer order: [ / ] send backward / bring forward (Figma convention)
      if (e.key === "[") {
        for (const id of state.selectedIds)
          state.reorder(id, "backward");
        return;
      }
      if (e.key === "]") {
        for (const id of state.selectedIds) state.reorder(id, "forward");
        return;
      }
      // Hide / lock the selection (⌘⇧H / ⌘⇧L)
      if (mod && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const page = activePage(state.doc);
        const anyVisible = page.nodes.some(
          (n) => state.selectedIds.includes(n.id) && !n.hidden,
        );
        state.updateNodesLive(
          state.selectedIds,
          { hidden: anyVisible },
        );
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const page = activePage(state.doc);
        const anyUnlocked = page.nodes.some(
          (n) => state.selectedIds.includes(n.id) && !n.locked,
        );
        state.updateNodesLive(state.selectedIds, { locked: anyUnlocked });
        return;
      }
      // Outline mode toggle (⌘⇧O)
      if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOutlineMode((v) => !v);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedIds.length > 0) {
          e.preventDefault();
          state.deleteNodes(state.selectedIds);
        }
        return;
      }
      if (e.key === "Escape") {
        // Figma behavior: Escape walks the selection up to the parent group
        // before clearing it entirely.
        const page = activePage(state.doc);
        const parentIds: string[] = [];
        for (const id of state.selectedIds) {
          const g = page.nodes.find(
            (n) => n.type === "group" && (n.children ?? []).includes(id),
          );
          if (g) parentIds.push(g.id);
        }
        if (parentIds.length > 0) {
          state.select(parentIds);
          return;
        }
        state.setTool("select");
        state.select([]);
        setPresenting(false);
        setDraftComment(null);
        setContextMenu(null);
        setRenamingPage(null);
        return;
      }
      // Zoom to selection (Shift+1): fit the current selection.
      if (e.shiftKey && e.key === "!") {
        const el = wrapRef.current;
        if (el && state.selectedIds.length > 0) {
          const nodes = activePage(state.doc).nodes.filter((n) =>
            state.selectedIds.includes(n.id),
          );
          const b = unionBounds(nodes);
          if (b) {
            const pad = 80;
            const z = Math.min(
              8,
              Math.max(
                0.05,
                Math.min(
                  (el.clientWidth - pad * 2) / Math.max(b.w, 1),
                  (el.clientHeight - pad * 2) / Math.max(b.h, 1),
                ),
              ),
            );
            state.setViewport(
              z,
              el.clientWidth / 2 - (b.x + b.w / 2) * z,
              el.clientHeight / 2 - (b.y + b.h / 2) * z,
            );
          }
          return;
        }
        const el2 = wrapRef.current;
        if (el2) {
          const t = fitTransform(state.doc, el2.clientWidth, el2.clientHeight);
          state.setViewport(t.zoom, t.panX, t.panY);
        }
      }
      // Figma-style opacity shortcuts: type 0–9 to set selection opacity.
      if (
        !mod &&
        !e.shiftKey &&
        /^[0-9]$/.test(e.key) &&
        state.selectedIds.length > 0
      ) {
        e.preventDefault();
        const digits = e.key === "0" ? "00" : e.key;
        state.pushHistory();
        state.updateNodesLive(state.selectedIds, {
          opacity: Math.min(100, parseInt(digits, 10)) / 100,
        });
        return;
      }

      const key = e.key.toLowerCase();
      const toolMap: Record<string, Tool> = {
        v: "select",
        h: "hand",
        f: "frame",
        r: "rect",
        o: "ellipse",
        l: "line",
        a: "arrow",
        p: "polygon",
        t: "text",
        i: "image",
        c: "comment",
        k: "scale",
      };
      if (toolMap[key]) state.setTool(toolMap[key]);
      if (key === "0") state.setViewport(1, state.panX, state.panY);
      // Group / ungroup (⌘G / ⇧⌘G)
      if (mod && key === "g") {
        e.preventDefault();
        if (e.shiftKey) state.ungroupNodes(state.selectedIds);
        else state.groupNodes(state.selectedIds);
        return;
      }
      if (
        ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key) &&
        state.selectedIds.length > 0
      ) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -d : key === "arrowright" ? d : 0;
        const dy = key === "arrowup" ? -d : key === "arrowdown" ? d : 0;
        state.moveNodesLive(state.selectedIds, dx, dy);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fileId, snapshotVersion, store]);

  /* ----- Derived ----- */
  const pageData = activePage(doc);
  const selectedNode = useMemo(
    () =>
      selectedIds.length === 1
        ? pageData.nodes.find((n) => n.id === selectedIds[0]) ?? null
        : null,
    [pageData, selectedIds],
  );

  const commitText = () => {
    if (!editingText) return;
    const node = pageData.nodes.find((n) => n.id === editingText.id);
    if (node) {
      if (editingText.value.trim() === "") {
        store.getState().deleteNodes([node.id]);
      } else {
        store.getState().pushHistory();
        store.getState().updateNodesLive([node.id], { text: editingText.value });
      }
    }
    setEditingText(null);
    store.getState().setTool("select");
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = imageTargetRef.current ?? { x: 80, y: 80 };
    imageTargetRef.current = null;
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const node = defaultNode("image", target.x, target.y);
      node.src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 480 / img.width);
        node.w = Math.round(img.width * scale);
        node.h = Math.round(img.height * scale);
        store.getState().addNode(node);
      };
      img.src = node.src;
    };
    reader.readAsDataURL(file);
  };

  const updateSelected = (patch: Partial<DesignNode>) =>
    store.getState().updateNodesLive(selectedIds, patch);

  const shareUrl = useMemo(
    () => `${window.location.origin}/design/${fileId}`,
    [fileId],
  );

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const paletteActions = {
    exportPng: () => exportPng(doc, fileRow?.name ?? "design"),
    exportCss: () => exportCss(doc, fileRow?.name ?? "design"),
    exportJson: () => downloadJson(doc, fileRow?.name ?? "design"),
    saveVersion: () =>
      snapshotVersion({ id: fileId as Id<"files">, label: "Manual save" }),
    present: () => setPresenting(true),
    share: () => setShareOpen(true),
    library: () => setLibraryOpen(true),
    lint: () => setLintOpen(true),
  };

  const fitView = () => {
    const el = wrapRef.current;
    if (!el) return;
    const t = fitTransform(store.getState().doc, el.clientWidth, el.clientHeight);
    store.getState().setViewport(t.zoom, t.panX, t.panY);
  };

  /* ----- Present mode (all hooks above; safe early return) ----- */
  if (presenting) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0b0e]">
        <PresentCanvas doc={doc} />
        <p className="absolute left-6 top-6 text-xs text-muted-foreground">
          {fileRow?.name} — {pageData.name}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 gap-2 rounded-full bg-card/90 px-4 shadow-lg backdrop-blur"
          onClick={() => setPresenting(false)}
        >
          Exit preview (Esc)
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        {/* ===== Top bar ===== */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-card/70 px-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              leavePresence({ fileId: fileId as Id<"files"> });
              navigate("/dashboard");
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (fileRow && name.trim() && name !== fileRow.name)
                renameFile({ id: fileId as Id<"files">, name });
            }}
            className="h-8 w-52 border-transparent bg-transparent px-2 text-sm font-medium hover:border-border/70"
          />
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                dirty ? "animate-pulse bg-amber-400" : "bg-emerald-400",
              )}
            />
            {dirty ? "Saving to this device…" : "Saved on this device"}
          </span>

          <div className="mx-2 flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canUndo}
                  onClick={() => store.getState().undo()}
                >
                  <Undo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (⌘Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canRedo}
                  onClick={() => store.getState().redo()}
                >
                  <Redo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (⇧⌘Z)</TooltipContent>
            </Tooltip>
          </div>

          {/* Collaborators */}
          <div className="flex items-center -space-x-1.5">
            {(presence ?? []).slice(0, 4).map((p) => (
              <Tooltip key={p.userId}>
                <TooltipTrigger asChild>
                  <span
                    className="flex size-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {p.name}
                  {p.userId === user?._id ? " (you)" : ""}
                </TooltipContent>
              </Tooltip>
            ))}
            {(presence?.length ?? 0) > 4 && (
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold">
                +{(presence?.length ?? 0) - 4}
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Ruler toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showRulers ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => setShowRulers((r) => !r)}
                >
                  <Ruler className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show rulers</TooltipContent>
            </Tooltip>

            {/* Account menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white">
                    {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    leavePresence({ fileId: fileId as Id<"files"> });
                    navigate("/dashboard");
                  }}
                >
                  <Layers className="mr-2 size-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={async () => {
                    leavePresence({ fileId: fileId as Id<"files"> });
                    await signOut();
                    navigate("/");
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={historyOpen} onOpenChange={setHistoryOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                >
                  <History className="size-4" />
                  <span className="hidden md:inline">History</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Version history</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="thin-scroll max-h-72 overflow-y-auto">
                  {(versions ?? []).map((v) => (
                    <DropdownMenuItem
                      key={v._id}
                      className="cursor-pointer"
                      onClick={() => {
                        restoreVersion({ versionId: v._id });
                        setHistoryOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{v.label}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          v{v.version} · {timeAgo(v.createdAt)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {(versions ?? []).length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      Versions appear here as the file is edited and saved.
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    snapshotVersion({
                      id: fileId as Id<"files">,
                      label: "Manual save",
                    });
                    setHistoryOpen(false);
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Save version now (⌘S)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setLibraryOpen(true)}
            >
              <SquareStack className="size-4" />
              <span className="hidden md:inline">Library</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setExportOpen(true)}
            >
              <Download className="size-4" />
              <span className="hidden md:inline">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setPresenting(true)}
            >
              <Eye className="size-4" />
              <span className="hidden md:inline">Present</span>
            </Button>

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

        {/* ===== Body ===== */}
        <div className="flex min-h-0 flex-1">
          {/* Tool rail */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-card/40 py-3">
            {(
              [
                { t: "select", icon: MousePointer2, label: "Move (V)" },
                { t: "hand", icon: Move, label: "Hand (H)" },
                { t: "frame", icon: Frame, label: "Frame (F)" },
                { t: "rect", icon: Square, label: "Rectangle (R)" },
                { t: "ellipse", icon: Circle, label: "Ellipse (O)" },
                { t: "line", icon: Minus, label: "Line (L)" },
                { t: "arrow", icon: ArrowUpRight, label: "Arrow (A)" },
                { t: "polygon", icon: Pentagon, label: "Polygon (P)" },
                { t: "text", icon: Type, label: "Text (T)" },
                { t: "image", icon: ImageIcon, label: "Image (I)" },
                { t: "comment", icon: MessageCircle, label: "Comment (C)" },
              ] as { t: Tool; icon: typeof Square; label: string }[]
            ).map(({ t, icon: Icon, label }) => (
              <Tooltip key={t}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-colors",
                      tool === t
                        ? "bg-violet-500/20 text-violet-300"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    onClick={() => store.getState().setTool(t)}
                  >
                    <Icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {!dock.left && (
            <CollapsedDockRail
              side="left"
              title={leftTab === "assets" ? "Assets" : "Layers"}
              icon={
                <Layers className="size-3.5 shrink-0 text-muted-foreground" />
              }
              onExpand={() => toggleDock("left")}
            />
          )}

          {/* Docked workspace - resizable & collapsible panels */}
          <PanelGroup
            direction="horizontal"
            className="min-h-0 min-w-0 flex-1"
            onLayout={handleGroupLayout}
          >
            {dock.left && (
              <DockPanel
                side="left"
                title={leftTab === "assets" ? "Assets" : "Layers"}
                icon={
                  <Layers className="size-3.5 shrink-0 text-muted-foreground" />
                }
                onCollapse={() => toggleDock("left")}
              >
            {/* Panel tabs */}
            <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2">
              <button
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  leftTab === "layers"
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setLeftTab("layers")}
              >
                Layers
              </button>
              <button
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  leftTab === "assets"
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setLeftTab("assets")}
              >
                Assets
              </button>
            </div>

            {leftTab === "assets" ? (
              /* ---- Assets tab: component library ---- */
              <div className="p-3">
                <SectionLabel>Components</SectionLabel>
                {(() => {
                  const masters = doc.pages.flatMap((p) =>
                    p.nodes.filter(
                      (n) => n.componentId && n.componentId === n.id,
                    ),
                  );
                  if (masters.length === 0)
                    return (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Select one or more layers and press ⌘⇧K (or use the
                        layer menu) to save them as a reusable component. They
                        appear here for one-click reuse across pages.
                      </p>
                    );
                  return (
                    <div className="mt-2 space-y-1">
                      {masters.map((m) => (
                        <button
                          key={m.id}
                          className="flex w-full items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2 py-2 text-left text-xs transition-colors hover:border-violet-400/50"
                          onClick={() =>
                            store
                              .getState()
                              .insertComponent(m.componentId!, m.x + 24, m.y + 24)
                          }
                        >
                          <Sparkles className="size-3.5 shrink-0 text-violet-400" />
                          <span className="flex-1 truncate">
                            {m.name.replace(" — master", "")}
                          </span>
                          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                      <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                        Click a component to stamp an instance on the canvas.
                        Instances stay linked for future restyling.
                      </p>
                    </div>
                 );
                })()}
              </div>
            ) : (
              <>
            <div className="p-3">
              <SectionLabel>Pages</SectionLabel>
              <div className="mt-2 space-y-0.5">
                {doc.pages.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                      p.id === doc.activePageId
                        ? "bg-violet-500/15 text-violet-200"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                    onClick={() => store.getState().setPage(p.id)}
                  >
                    <Layers className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {doc.pages.length > 1 && (
                      <button
                        className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          store.getState().deletePage(p.id);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => store.getState().addPage()}
                >
                  <Plus className="size-3.5" />
                  New page
                </button>
              </div>
            </div>

            <div className="border-t border-border/60 p-3">
              <SectionLabel>Layers</SectionLabel>
              <div className="mt-2 space-y-0.5">
                {pageData.nodes.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    Empty page — pick a tool and drag on the canvas.
                  </p>
                )}
                {[...pageData.nodes].reverse().map((n) => {
                  const Icon = NODE_ICONS[n.type] ?? Square;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                        selectedIds.includes(n.id)
                          ? "bg-violet-500/15 text-violet-200"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                      onClick={(e) =>
                        store
                          .getState()
                          .select(
                            e.shiftKey ? [...selectedIds, n.id] : [n.id],
                          )
                      }
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span
                        className={cn(
                          "flex-1 truncate",
                          n.hidden && "line-through opacity-50",
                        )}
                      >
                        {n.type === "text" && n.text
                          ? n.text.slice(0, 20)
                          : n.name}
                      </span>
                      <button
                        className={cn(
                          "transition-opacity hover:text-foreground",
                          n.hidden
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          store
                            .getState()
                            .updateNodesLive([n.id], { hidden: !n.hidden });
                        }}
                      >
                        {n.hidden ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                      </button>
                      <button
                        className={cn(
                          "transition-opacity hover:text-foreground",
                          n.locked
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          store
                            .getState()
                            .updateNodesLive([n.id], { locked: !n.locked });
                        }}
                      >
                        {n.locked ? <Lock className="size-3" /> : <span className="block size-3" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Selection actions: group / component / ungroup */}
              {selectedIds.length > 0 && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedIds.length >= 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => store.getState().groupNodes(selectedIds)}
                      >
                        <Boxes className="mr-1 size-3.5" /> Group
                      </Button>
                    )}
                    {selectedIds.length === 1 &&
                      selectedNode?.type === "group" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            store.getState().ungroupNodes(selectedIds)
                          }
                        >
                          <Boxes className="mr-1 size-3.5" /> Ungroup
                        </Button>
                      )}
                    {selectedIds.length === 1 &&
                      selectedNode &&
                      !selectedNode.componentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            store.getState().createComponent(selectedIds)
                          }
                        >
                          <Sparkles className="mr-1 size-3.5" /> Component
                        </Button>
                      )}
                  </div>
                </div>
              )}
            </div>
          </>
            )}
              </DockPanel>
            )}

            {dock.left && <DockHandle />}

            {/* Canvas */}
            <Panel id="dock-center" order={2} minSize={30} className="min-w-0">
              <div
                ref={wrapRef}
                data-canvas-center
                className="relative h-full w-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (!file?.type.startsWith("image/")) return;
              const rect = canvasRef.current!.getBoundingClientRect();
              imageTargetRef.current = screenToPage(
                { zoom, panX, panY },
                e.clientX - rect.left,
                e.clientY - rect.top,
              );
              const reader = new FileReader();
              reader.onload = () => {
                const target = imageTargetRef.current ?? { x: 80, y: 80 };
                const node = defaultNode("image", target.x, target.y);
                node.src = String(reader.result);
                const img = new Image();
                img.onload = () => {
                  const scale = Math.min(1, 480 / img.width);
                  node.w = Math.round(img.width * scale);
                  node.h = Math.round(img.height * scale);
                  store.getState().addNode(node);
                };
                img.src = node.src;
              };
              reader.readAsDataURL(file);
            }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none select-none"
              style={{
                cursor:
                  spaceRef.current || tool === "hand"
                    ? "grab"
                    : [
                          "frame",
                          "rect",
                          "ellipse",
                          "line",
                          "polygon",
                          "text",
                          "image",
                          "comment",
                        ].includes(tool)
                      ? "crosshair"
                      : "default",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={() => store.getState().setHover(null)}
              onDoubleClick={onDoubleClick}
              onWheel={onWheel}
            />

            {/* Text editor overlay */}
            {editingText &&
              (() => {
                const node = pageData.nodes.find(
                  (n) => n.id === editingText.id,
                );
                if (!node) return null;
                const s = toScreen(node.x, node.y);
                return (
                  <textarea
                    autoFocus
                    className="absolute resize-none rounded border border-violet-400 bg-background/90 p-0 text-foreground outline-none"
                    style={{
                      left: s.sx,
                      top: s.sy,
                      width: Math.max(node.w * zoom, 120),
                      fontSize: (node.fontSize ?? 16) * zoom,
                      fontWeight: node.fontWeight ?? 500,
                      lineHeight: 1.35,
                      color: node.color ?? "#f4f4f5",
                    }}
                    value={editingText.value}
                    onChange={(e) =>
                      setEditingText({ id: editingText.id, value: e.target.value })
                    }
                    onBlur={commitText}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") commitText();
                    }}
                  />
                );
              })()}

            {/* Remote cursors */}
            {(presence ?? [])
              .filter((p) => p.userId !== user?._id)
              .map((p) => {
                const s = toScreen(p.x, p.y);
                return (
                  <div
                    key={p.userId}
                    className="pointer-events-none absolute z-10 flex items-center gap-1 transition-all duration-200"
                    style={{ left: s.sx, top: s.sy }}
                  >
                    <MousePointer2
                      className="size-4 fill-current"
                      style={{ color: p.color }}
                    />
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: p.color, color: "#0b0b0e" }}
                    >
                      {p.name}
                    </span>
                  </div>
                );
              })}

            {/* Comment pins */}
            {(comments ?? []).map((c) => {
              const s = toScreen(c.x, c.y);
              return (
                <div
                  key={c._id}
                  className="absolute z-10"
                  style={{ left: s.sx, top: s.sy }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rounded-bl-none border-2 border-background shadow-md transition-transform hover:scale-110",
                          c.resolved ? "bg-emerald-500" : "bg-amber-400",
                        )}
                      >
                        <MessageCircle className="size-3 text-black" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-semibold">{c.authorName}</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                          {c.body}
                        </p>
                        <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                          {timeAgo(c.createdAt)}
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => resolveComment({ id: c._id })}
                      >
                        {c.resolved ? "Mark unresolved" : "Mark resolved"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => removeComment({ id: c._id })}
                      >
                        Delete comment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}

            {/* New comment composer */}
            {draftComment && (
              <div
                className="absolute z-20 w-64 rounded-lg border border-border bg-popover p-3 shadow-xl"
                style={{
                  left: toScreen(draftComment.x, draftComment.y).sx + 8,
                  top: toScreen(draftComment.x, draftComment.y).sy + 8,
                }}
              >
                <Textarea
                  autoFocus
                  rows={3}
                  placeholder="Share feedback…"
                  value={draftComment.body}
                  onChange={(e) =>
                    setDraftComment({ ...draftComment, body: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      if (draftComment.body.trim()) {
                        addComment({
                          fileId: fileId as Id<"files">,
                          x: draftComment.x,
                          y: draftComment.y,
                          body: draftComment.body,
                        });
                      }
                      setDraftComment(null);
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    ⌘↵ to post
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDraftComment(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!draftComment.body.trim()}
                      className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                      onClick={() => {
                        addComment({
                          fileId: fileId as Id<"files">,
                          x: draftComment.x,
                          y: draftComment.y,
                          body: draftComment.body,
                        });
                        setDraftComment(null);
                        store.getState().setTool("select");
                      }}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Zoom pill */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/60 bg-card/90 px-2 py-1 shadow-lg backdrop-blur">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() =>
                  store
                    .getState()
                    .setViewport(Math.max(0.05, zoom - 0.1), panX, panY)
                }
              >
                <Minus className="size-3.5" />
              </Button>
              <button
                className="w-12 text-center text-xs tabular-nums"
                onClick={() => store.getState().setViewport(1, panX, panY)}
                title="Reset to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() =>
                  store
                    .getState()
                    .setViewport(Math.min(8, zoom + 0.1), panX, panY)
                }
              >
                <Plus className="size-3.5" />
              </Button>
              <span className="mx-0.5 h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={fitView}
                title="Zoom to fit"
              >
                <MoveVertical className="size-3.5" />
              </Button>
            </div>
              </div>
            </Panel>

            {dock.right && <DockHandle />}

            {dock.right && (
              <DockPanel
                side="right"
                title="Inspector"
                icon={
                  <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
                }
                onCollapse={() => toggleDock("right")}
              >
                <div className="space-y-5 p-4">
              {selectedNode ? (
                <>
                  <div>
                    <SectionLabel>Layer</SectionLabel>
                    <Input
                      className="mt-2 h-8 text-xs"
                      value={selectedNode.name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                    />
                  </div>

                  <div>
                    <SectionLabel>Position & size</SectionLabel>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <NumField
                        label="X"
                        value={selectedNode.x}
                        onChange={(v) => updateSelected({ x: v })}
                      />
                      <NumField
                        label="Y"
                        value={selectedNode.y}
                        onChange={(v) => updateSelected({ y: v })}
                      />
                      <NumField
                        label="W"
                        value={selectedNode.w}
                        onChange={(v) => updateSelected({ w: Math.max(1, v) })}
                      />
                      <NumField
                        label="H"
                        value={selectedNode.h}
                        onChange={(v) =>
                          updateSelected({
                            h:
                              selectedNode.type === "line" ||
                              selectedNode.type === "arrow"
                                ? v
                                : Math.max(1, v),
                          })
                        }
                      />
                      <NumField
                        label="R"
                        value={selectedNode.rotation ?? 0}
                        onChange={(v) => updateSelected({ rotation: v })}
                      />
                      <NumField
                        label="⌒"
                        value={selectedNode.radius}
                        onChange={(v) =>
                          updateSelected({ radius: Math.max(0, v) })
                        }
                      />
                    </div>
                  </div>

                  {/* Constraints: how this layer follows its frame when resized */}
                  {selectedNode.type !== "frame" && (
                    <div>
                      <SectionLabel>Constraints</SectionLabel>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        How this layer follows its frame when the frame is
                        resized.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <select
                          className="h-8 flex-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs"
                          value={selectedNode.constraintH ?? "left"}
                          onChange={(e) =>
                            updateSelected({
                              constraintH: e.target
                                .value as DesignNode["constraintH"],
                            })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                          <option value="scale">Scale</option>
                        </select>
                        <select
                          className="h-8 flex-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs"
                          value={selectedNode.constraintV ?? "top"}
                          onChange={(e) =>
                            updateSelected({
                              constraintV: e.target
                                .value as DesignNode["constraintV"],
                            })
                          }
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                          <option value="scale">Scale</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <SectionLabel>Appearance</SectionLabel>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center justify-between text-xs text-muted-foreground">
                        Opacity
                        <span className="tabular-nums">
                          {Math.round(selectedNode.opacity * 100)}%
                        </span>
                      </label>
                      <Slider
                        value={[selectedNode.opacity * 100]}
                        onValueChange={([v]) =>
                          updateSelected({ opacity: v / 100 })
                        }
                      />
                      <div className="grid grid-cols-6 gap-1">
                        {SWATCHES.map((c) => (
                          <button
                            key={c}
                            className={cn(
                              "size-5 rounded border border-border/70 transition-transform hover:scale-110",
                              (selectedNode.type === "text"
                                ? selectedNode.color
                                : selectedNode.fill) === c &&
                                "ring-2 ring-violet-400",
                            )}
                            style={{ backgroundColor: c }}
                            title={c}
                            onClick={() =>
                              updateSelected(
                                selectedNode.type === "text"
                                  ? { color: c }
                                  : { fill: c },
                              )
                            }
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <NumField
                          label="SW"
                          value={selectedNode.strokeWidth}
                          min={0}
                          onChange={(v) =>
                            updateSelected({ strokeWidth: Math.max(0, v) })
                          }
                        />
                        <div className="flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2">
                          <input
                            type="color"
                            className="size-4 cursor-pointer bg-transparent"
                            value={selectedNode.stroke ?? "#ffffff"}
                            onChange={(e) =>
                              updateSelected({ stroke: e.target.value })
                            }
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Stroke
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <NumField
                          label="Sh"
                          value={selectedNode.shadowBlur ?? 0}
                          min={0}
                          max={80}
                          onChange={(v) =>
                            updateSelected({ shadowBlur: Math.max(0, v) })
                          }
                        />
                        <div className="flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2">
                          <input
                            type="color"
                            className="size-4 cursor-pointer bg-transparent"
                            value={selectedNode.shadowColor ?? "#000000"}
                            onChange={(e) =>
                              updateSelected({ shadowColor: e.target.value })
                            }
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Shadow
                          </span>
                        </div>
                      </div>

                      {/* Gradient fill (Figma-style linear gradient paint) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          className={cn(
                            "flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/70 px-2 text-[10px] font-semibold uppercase text-muted-foreground transition-colors",
                            selectedNode.gradient
                              ? "border-violet-400/60 bg-violet-500/10 text-foreground"
                              : "hover:text-foreground",
                          )}
                          title="Toggle gradient fill"
                          onClick={() =>
                            updateSelected({
                              gradient: selectedNode.gradient
                                ? null
                                : {
                                    from: selectedNode.fill ?? "#8b5cf6",
                                    to: "#22d3ee",
                                    angle: 90,
                                  },
                            })
                          }
                        >
                          <Palette className="size-3.5" />
                          Grad
                        </button>
                        {selectedNode.gradient && (
                          <>
                            <input
                              type="color"
                              className="size-6 cursor-pointer rounded border border-border/70 bg-transparent"
                              value={selectedNode.gradient.from}
                              title="Gradient start"
                              onChange={(e) => {
                                const g = selectedNode.gradient;
                                if (g)
                                  updateSelected({
                                    gradient: { ...g, from: e.target.value },
                                  });
                              }}
                            />
                            <input
                              type="color"
                              className="size-6 cursor-pointer rounded border border-border/70 bg-transparent"
                              value={selectedNode.gradient.to}
                              title="Gradient end"
                              onChange={(e) => {
                                const g = selectedNode.gradient;
                                if (g)
                                  updateSelected({
                                    gradient: { ...g, to: e.target.value },
                                  });
                              }}
                            />
                            <NumField
                              label="∠"
                              value={selectedNode.gradient.angle}
                              min={0}
                              max={360}
                              onChange={(v) => {
                                const g = selectedNode.gradient;
                                if (g)
                                  updateSelected({
                                    gradient: { ...g, angle: v },
                                  });
                              }}
                            />
                          </>
                        )}
                      </div>

                      {/* Blend mode (canvas composite operations) */}
                      <select
                        className="h-8 w-full rounded-md border border-border/70 bg-background/60 px-2 text-xs capitalize"
                        value={selectedNode.blend ?? "normal"}
                        onChange={(e) => updateSelected({ blend: e.target.value })}
                      >
                        {BLEND_MODES.map((b) => (
                          <option key={b} value={b}>
                            {b === "normal" ? "Normal" : b.replace(/-/g, " ")}
                          </option>
                        ))}
                      </select>

                      {/* Dashed stroke + layer blur */}
                      <div className="grid grid-cols-2 gap-2">
                        <NumField
                          label="Da"
                          value={selectedNode.dash ?? 0}
                          min={0}
                          step={2}
                          onChange={(v) => updateSelected({ dash: Math.max(0, v) })}
                        />
                        <NumField
                          label="Bl"
                          value={selectedNode.blur ?? 0}
                          min={0}
                          max={40}
                          onChange={(v) => updateSelected({ blur: Math.max(0, v) })}
                        />
                      </div>

                      {/* Mirror the selection (Figma flip) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => store.getState().flipNodes(selectedIds, "h")}
                        >
                          <FlipHorizontal2 className="mr-1 size-3.5" /> Flip H
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => store.getState().flipNodes(selectedIds, "v")}
                        >
                          <FlipVertical2 className="mr-1 size-3.5" /> Flip V
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Copy / paste paint + text style (Option-Cmd-C / Option-Cmd-V) */}
                  <div>
                    <SectionLabel>Style</SectionLabel>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => store.getState().copyStyle(selectedNode.id)}
                      >
                        <Clipboard className="mr-1 size-3.5" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => store.getState().pasteStyle(selectedIds)}
                      >
                        <ClipboardPaste className="mr-1 size-3.5" /> Paste
                      </Button>
                    </div>
                  </div>

                  {/* Auto layout: frames re-flow their children (Figma-style) */}
                  {selectedNode.type === "frame" && (
                    <div>
                      <SectionLabel>Auto layout</SectionLabel>
                      {selectedNode.layout ? (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              variant={
                                selectedNode.layout.mode === "row"
                                  ? "secondary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const l = selectedNode.layout;
                                if (l)
                                  store
                                    .getState()
                                    .setFrameLayout(selectedNode.id, {
                                      ...l,
                                      mode: "row",
                                    });
                              }}
                            >
                              <Rows3 className="mr-1 size-3.5" /> Row
                            </Button>
                            <Button
                              variant={
                                selectedNode.layout.mode === "column"
                                  ? "secondary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const l = selectedNode.layout;
                                if (l)
                                  store
                                    .getState()
                                    .setFrameLayout(selectedNode.id, {
                                      ...l,
                                      mode: "column",
                                    });
                              }}
                            >
                              <Columns3 className="mr-1 size-3.5" /> Column
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <NumField
                              label="Gap"
                              value={selectedNode.layout.gap}
                              min={0}
                              onChange={(v) => {
                                const l = selectedNode.layout;
                                if (l)
                                  store
                                    .getState()
                                    .setFrameLayout(selectedNode.id, {
                                      ...l,
                                      gap: Math.max(0, v),
                                    });
                              }}
                            />
                            <NumField
                              label="Pad"
                              value={selectedNode.layout.padding}
                              min={0}
                              onChange={(v) => {
                                const l = selectedNode.layout;
                                if (l)
                                  store
                                    .getState()
                                    .setFrameLayout(selectedNode.id, {
                                      ...l,
                                      padding: Math.max(0, v),
                                    });
                              }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              store.getState().setFrameLayout(selectedNode.id, null)
                            }
                          >
                            Remove auto layout
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() =>
                            store.getState().setFrameLayout(selectedNode.id, {
                              mode: "row",
                              gap: 12,
                              padding: 16,
                            })
                          }
                        >
                          <Grid3x3 className="mr-1.5 size-3.5" /> Add auto layout
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Component badges: instance detach + master indicator */}
                  {selectedNode.type === "instance" &&
                    selectedNode.componentId && (
                      <div>
                        <SectionLabel>Component</SectionLabel>
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-violet-400/40 bg-violet-500/10 p-2 text-[11px] text-violet-200">
                          <Sparkles className="size-3.5 shrink-0" />
                          <span className="flex-1">
                            Instance of a component
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() =>
                            store.getState().detachInstance([selectedNode.id])
                          }
                        >
                          <SquareDashed className="mr-1.5 size-3.5" />
                          Detach instance
                        </Button>
                      </div>
                    )}
                  {selectedNode.type !== "instance" &&
                    selectedNode.componentId === selectedNode.id && (
                      <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                        <Sparkles className="size-3.5 shrink-0" />
                        <span className="flex-1">
                          Component master — this shape defines the reusable
                          component
                        </span>
                      </div>
                    )}

                  {selectedNode.type === "text" && (
                    <div>
                      <SectionLabel>Typography</SectionLabel>
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <NumField
                            label="Sz"
                            value={selectedNode.fontSize ?? 16}
                            min={4}
                            onChange={(v) =>
                              updateSelected({ fontSize: Math.max(4, v) })
                            }
                          />
                          <NumField
                            label="W"
                            value={selectedNode.fontWeight ?? 500}
                            min={100}
                            max={900}
                            step={100}
                            onChange={(v) =>
                              updateSelected({ fontWeight: v })
                            }
                          />
                        </div>
                        <div className="flex gap-1">
                          {(["left", "center", "right"] as const).map((a) => (
                            <button
                              key={a}
                              className={cn(
                                "flex h-8 flex-1 items-center justify-center rounded-md border border-border/70 text-xs capitalize transition-colors",
                                selectedNode.align === a
                                  ? "border-violet-400/60 bg-violet-500/10 text-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() => updateSelected({ align: a })}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "polygon" && (
                    <div>
                      <SectionLabel>Polygon</SectionLabel>
                      <NumField
                        label="Sides"
                        value={selectedNode.points ?? 3}
                        min={3}
                        max={12}
                        onChange={(v) =>
                          updateSelected({ points: Math.round(v) })
                        }
                      />
                    </div>
                  )}

                  <div>
                    <SectionLabel>Arrange & actions</SectionLabel>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          store.getState().reorder(selectedNode.id, "front")
                        }
                      >
                        <ArrowUp className="mr-1 size-3.5" /> Front
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          store.getState().reorder(selectedNode.id, "back")
                        }
                      >
                        <ArrowDown className="mr-1 size-3.5" /> Back
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          store.getState().duplicateNodes([selectedNode.id])
                        }
                      >
                        <Copy className="mr-1 size-3.5" /> Duplicate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          store.getState().deleteNodes([selectedNode.id])
                        }
                      >
                        <Trash2 className="mr-1 size-3.5" /> Delete
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1.5 w-full"
                      onClick={() => exportNodePng(doc, selectedNode)}
                    >
                      <Download className="mr-1.5 size-3.5" />
                      Export layer PNG @2x
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <SectionLabel>Document</SectionLabel>
                    <div className="mt-2 flex h-8 items-center justify-between gap-1.5 rounded-md border border-border/70 bg-background/60 px-2 text-xs text-muted-foreground">
                      <span>Canvas background</span>
                      <input
                        type="color"
                        className="size-4 cursor-pointer bg-transparent"
                        value={doc.background}
                        onChange={(e) =>
                          store.setState({
                            doc: { ...doc, background: e.target.value },
                          })
                        }
                      />
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Select a layer to edit its properties. Everything is saved
                      and shared live with collaborators.
                    </p>
                  </div>
                  <div>
                    <SectionLabel>Publish status</SectionLabel>
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-border/70 bg-background/60 p-2.5 text-xs">
                      <Globe
                        className={cn(
                          "size-4",
                          fileRow?.published
                            ? "text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      />
                      <span className="flex-1 text-muted-foreground">
                        {fileRow?.published
                          ? "Visible in the Explore catalog"
                          : "Private to your workspace"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() =>
                        fileRow?.published
                          ? unpublishFile({ id: fileId as Id<"files"> })
                          : setShareOpen(true)
                      }
                    >
                      {fileRow?.published ? "Unpublish" : "Publish settings"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
              </DockPanel>
            )}
          </PanelGroup>

          {!dock.right && (
            <CollapsedDockRail
              side="right"
              title="Inspector"
              icon={
                <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
              }
              onExpand={() => toggleDock("right")}
            />
          )}
        </div>
      </div>

      {/* Hidden file input for image import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />

      {/* Export dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export assets</DialogTitle>
            <DialogDescription>
              Hand off production-ready assets to developers, or take the file
              with you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              variant="outline"
              onClick={() => {
                exportPng(doc, fileRow?.name ?? "design");
                setExportOpen(false);
              }}
            >
              <Download className="mr-2 size-4" /> PNG @2x — current page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                exportCss(doc, fileRow?.name ?? "design");
                setExportOpen(false);
              }}
            >
              <Square className="mr-2 size-4" /> CSS for current page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                downloadJson(doc, fileRow?.name ?? "design");
                setExportOpen(false);
              }}
            >
              <Frame className="mr-2 size-4" /> Node document (.json)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const { code } = docToJsx(doc, { format: "tailwind" });
                const blob = new Blob([code], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${fileRow?.name ?? "design"}.tsx`;
                a.click();
                URL.revokeObjectURL(url);
                setExportOpen(false);
              }}
            >
              <Code2 className="mr-2 size-4" /> React + Tailwind (JSX)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const report = formatTokensReport(analyzeTokens(doc));
                const blob = new Blob([report], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${fileRow?.name ?? "design"}-tokens.txt`;
                a.click();
                URL.revokeObjectURL(url);
                setExportOpen(false);
              }}
            >
              <Palette className="mr-2 size-4" /> Design tokens report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset library */}
      <LibraryPanel open={libraryOpen} onOpenChange={setLibraryOpen} />

      {/* AI assistant (Cmd+J) */}
      <AiPanel open={aiOpen} onOpenChange={setAiOpen} />
      <LintPanel open={lintOpen} onOpenChange={setLintOpen} />

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share “{fileRow?.name}”</DialogTitle>
            <DialogDescription>
              Anyone with this link can open the file and design with you in
              real time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="flex-1 text-xs" />
            <Button variant="outline" size="icon" onClick={copyShare}>
              <Link2 className="size-4" />
            </Button>
          </div>
          {shareCopied && (
            <p className="text-xs text-emerald-400">
              Link copied to clipboard.
            </p>
          )}
          <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col">
            <Input
              placeholder="Tags, comma separated (e.g. mobile, checkout)"
              value={publishTags}
              onChange={(e) => setPublishTags(e.target.value)}
              className="text-xs"
            />
            <Button
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              onClick={() => {
                if (fileRow?.published) {
                  unpublishFile({ id: fileId as Id<"files"> });
                } else {
                  publishFile({
                    id: fileId as Id<"files">,
                    description: undefined,
                    tags: publishTags
                      .split(",")
                      .map((t) => t.trim().toLowerCase())
                      .filter(Boolean)
                      .slice(0, 5),
                  });
                }
              }}
            >
              <Globe className="mr-2 size-4" />
              {fileRow?.published
                ? "Unpublish from Explore"
                : "Publish to Explore"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Publishing adds this design to the public Explore catalog with
              its tags.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

/* ---------- Present-mode canvas: refits content, no chrome ---------- */
function PresentCanvas({ doc }: { doc: DesignDoc }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const t = fitTransform(doc, w, h);
      renderDoc(ctx, doc, t, w, h, dpr, {});
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [doc]);
  return <canvas ref={ref} className="h-full w-full" />;
}
