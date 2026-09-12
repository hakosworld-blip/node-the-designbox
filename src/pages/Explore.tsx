import { useMemo, useRef, useEffect, useState } from "react";

import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NodeMarkTile } from "@/components/NodeLogo";
import type { DesignDoc } from "@/lib/geo";
import { renderThumb } from "@/lib/thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Compass, GitFork, Search, Sparkles, User as UserIcon } from "lucide-react";

const DOT_GRID = {
  backgroundImage:
    "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
} as const;

/** Canvas thumbnail of a published design doc. */
function DocThumb({ doc, name }: { doc: DesignDoc | undefined; name: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 320 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    renderThumb(ctx, doc ?? null, 320, 200);
  }, [doc]);
  if (!doc)
    return (
      <div
        className="flex h-[200px] items-center justify-center rounded-md bg-[#1c1c22] text-3xl font-bold text-muted-foreground"
        style={DOT_GRID}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  return (
    <canvas
      ref={ref}
      style={{ width: 320, height: 200 }}
      className="h-[200px] w-full rounded-md"
    />
  );
}

function timeAgo(ts: number | undefined) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Explore() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const published = useQuery(api.catalog.listPublished);
  const remixFile = useMutation(api.files.duplicate);

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const items = useMemo(() => published ?? [], [published]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of items)
      for (const t of f.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((f) => {
      if (activeTag && !(f.tags ?? []).includes(activeTag)) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        (f.authorName ?? "").toLowerCase().includes(q) ||
        (f.tags ?? []).some((t) => t.includes(q))
      );
    });
  }, [items, search, activeTag]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <button className="flex items-center gap-2.5" onClick={() => navigate("/")}>
            <NodeMarkTile className="size-7 rounded-[7px]" />
            <span className="text-sm font-bold uppercase tracking-[0.22em]">
              Node
            </span>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground/80 hover:bg-white/5 hover:text-white"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </Button>
            <Button
              size="sm"
              className="bg-violet-500 text-white hover:bg-violet-400"
              onClick={() =>
                navigate(isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard")
              }
            >
              Start designing
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10">
        {/* Hero */}
        <div className="flex flex-col items-start gap-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            <Sparkles className="size-3.5" />
            Community catalog
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Explore community designs
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Browse UI kits, app screens, and interface assets published by other
            teams. Open any design to inspect it, or remix it into your own
            workspace.
          </p>
        </div>

        {/* Search + tags */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs, authors, or tags…"
              className="h-10 border-border bg-[#141419] pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-violet-500/50"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {["All", ...tags.map(([t]) => t)].map((tag) => {
                const active = tag === "All" ? activeTag === null : activeTag === tag;
                const count =
                  tag === "All" ? items.length : tags.find(([t]) => t === tag)?.[1] ?? 0;
                return (
                  <button
                    key={tag}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
                        : "border-border bg-[#141419] text-muted-foreground hover:border-white/20 hover:text-foreground",
                    )}
                    onClick={() => setActiveTag(tag === "All" ? null : tag)}
                  >
                    {tag}
                    <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid */}
        {published === undefined ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-[#141419] p-3">
                <Skeleton className="h-[200px] w-full rounded-md bg-white/5" />
                <Skeleton className="mt-3 h-4 w-2/3 bg-white/5" />
                <Skeleton className="mt-2 h-3 w-1/3 bg-white/5" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-white/15 py-20 text-center">
            <Compass className="mx-auto size-8 text-muted-foreground/70" />
            <p className="mt-3 text-sm text-muted-foreground">
              {items.length === 0
                ? "Nothing has been published yet. Be the first — open a design and choose Share → Publish to Explore."
                : "No designs match your search. Try different keywords or clear the tag filter."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => (
              <ExploreCard
                key={f._id}
                fileId={f._id as Id<"files">}
                name={f.name}
                author={f.authorName}
                publishedAt={f.publishedAt}
                tags={f.tags}
                onOpen={() =>
                  navigate(
                    isAuthenticated
                      ? `/design/${f._id}`
                      : `/auth?returnTo=${encodeURIComponent(`/design/${f._id}`)}`,
                  )
                }
                onRemix={async () => {
                  if (!isAuthenticated) {
                    navigate(`/auth?returnTo=${encodeURIComponent("/explore")}`);
                    return;
                  }
                  try {
                    const newId = await remixFile({ id: f._id as Id<"files"> });
                    toast.success(`Remixed "${f.name}" into your workspace`);
                    navigate(`/design/${newId}`);
                  } catch {
                    toast.error("Could not remix this design. Try again.");
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/** Card that lazily fetches its doc for a live thumbnail. */
function ExploreCard({
  fileId,
  name,
  author,
  publishedAt,
  tags,
  onOpen,
  onRemix,
}: {
  fileId: Id<"files">;
  name: string;
  author?: string;
  publishedAt?: number;
  tags: string[];
  onOpen: () => void;
  onRemix: () => void | Promise<void>;
}) {
  const file = useQuery(api.files.get, { id: fileId });
  const doc = file?.doc as DesignDoc | undefined;
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-[#141419] text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-lg hover:shadow-black/40">
      <button onClick={onOpen} className="block w-full text-left" aria-label={`Open ${name}`}>
        <div className="overflow-hidden bg-[#101014]">
          <DocThumb doc={doc} name={name} />
        </div>
        <div className="p-4">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserIcon className="size-3" />
            {author ?? "Unknown"} · {timeAgo(publishedAt)}
          </p>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3 text-violet-400" />
        <span className="flex-1">Click to open and inspect</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void onRemix();
          }}
          className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/25 hover:text-violet-200"
        >
          <GitFork className="size-3" />
          Remix
        </button>
      </div>
    </div>
  );
}
