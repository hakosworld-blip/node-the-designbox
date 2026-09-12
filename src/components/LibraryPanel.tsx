import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/lib/store";
import {
  LIBRARY_CATEGORIES,
  libraryThumbDoc,
  searchLibrary,
  type LibraryFilter,
  type LibraryItem,
} from "@/lib/library";
import { screenToPage, type DesignDoc } from "@/lib/geo";
import { renderThumb } from "@/lib/render";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search } from "lucide-react";

/* Thumbnail canvas: renders the item's build() output via renderThumb. */
function ItemThumb({ item }: { item: LibraryItem }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    let doc: DesignDoc | null = null;
    try {
      doc = libraryThumbDoc(item);
    } catch {
      doc = null;
    }
    renderThumb(ctx, doc, w * dpr, h * dpr);
  }, [item]);
  return <canvas ref={ref} className="h-16 w-full rounded-md bg-surface-canvas" />;
}

interface LibraryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryPanel({ open, onOpenChange }: LibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<LibraryFilter>("All");
  const zoom = useEditor((s) => s.zoom);
  const panX = useEditor((s) => s.panX);
  const panY = useEditor((s) => s.panY);

  const results = useMemo(() => searchLibrary(query, cat), [query, cat]);

  const insert = useCallback(
    (item: LibraryItem) => {
      const store = useEditor.getState();
      const vp = { zoom, panX, panY };
      // Drop point: viewport center (or slightly up-left so big items stay visible).
      const el = document.querySelector<HTMLElement>("[data-canvas-center]");
      const cw = el?.clientWidth ?? window.innerWidth / 2;
      const ch = el?.clientHeight ?? window.innerHeight / 2;
      const pt = screenToPage(vp, cw / 2, ch / 2);

      const nodes = item.build();
      const minX = Math.min(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxX = Math.max(...nodes.map((n) => n.x + n.w));
      const maxY = Math.max(...nodes.map((n) => n.y + n.h));
      const dx = Math.round(pt.x - (minX + maxX) / 2);
      const dy = Math.round(pt.y - (minY + maxY) / 2);
      for (const nd of nodes) {
        nd.x += dx;
        nd.y += dy;
      }

      // Insert all pieces, then group them — and collapse the resulting
      // history entries so a single Undo removes the whole import.
      const preDoc = store.doc;
      const basePastLen = store.past.length;
      for (const nd of nodes) store.addNode(nd);
      if (nodes.length > 1) {
        store.groupNodes(nodes.map((nd) => nd.id));
      }
      const after = useEditor.getState();
      useEditor.setState({
        past: [...after.past.slice(0, basePastLen), preDoc],
        future: [],
        dirty: true,
      });
      onOpenChange(false);
    },
    [zoom, panX, panY, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-full max-w-full flex-col gap-0 rounded-none border-0 sm:h-[80vh] sm:max-w-3xl sm:rounded-lg sm:border">
        <DialogHeader>
          <DialogTitle>Library</DialogTitle>
          <DialogDescription>
            Premade backgrounds, icons, shapes, UI elements, and text styles —
            click any item to drop it onto the canvas.
          </DialogDescription>
        </DialogHeader>

        {/* Search + category filter */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the library…"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {LIBRARY_CATEGORIES.map((c) => (
              <button
                key={c}
                className={
                  "rounded-md px-2.5 py-1 text-xs transition-colors " +
                  (cat === c
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
            <span className="ml-auto self-center text-xs text-muted-foreground">
              {results.length} item{results.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Results grid */}
        <div className="thin-scroll -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No library items match “{query}”.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {results.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      className="group rounded-lg border border-border/60 bg-card/60 p-1.5 text-left transition-colors hover:border-violet-500/60 hover:bg-card"
                      onClick={() => insert(item)}
                    >
                      <ItemThumb item={item} />
                      <p className="mt-1.5 truncate text-[11px] font-medium">
                        {item.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.category}
                      </p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{item.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Imported items arrive grouped — ungroup anytime to edit pieces.
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
