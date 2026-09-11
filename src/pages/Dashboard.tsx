import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Compass,
  FilePlus2,
  FolderPlus,
  Globe,
  Home,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  Search,
  Smartphone,
  Star,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

type ViewTab = "recent" | "starred" | "trash";
type TemplateKind = "blank" | "mobile" | "web";

interface Project {
  _id: string;
  name: string;
}

interface FileRow {
  _id: string;
  name: string;
  projectId: string;
  starred: boolean;
  trashed: boolean;
  published: boolean;
  updatedAt: number;
  authorName?: string;
}

/** Deterministic pastel gradient so every file card is distinct and colorful. */
const TILE_GRADIENTS = [
  "from-violet-500/70 to-fuchsia-500/50",
  "from-cyan-500/60 to-blue-500/50",
  "from-emerald-500/60 to-teal-500/40",
  "from-amber-400/60 to-orange-500/50",
  "from-pink-500/60 to-rose-500/50",
  "from-indigo-500/60 to-violet-500/50",
];

function tileGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TILE_GRADIENTS[Math.abs(h) % TILE_GRADIENTS.length];
}

function timeAgo(ts: number) {
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

/** Minimal starter document — swapped for the shared template builder later. */
function starterDoc(kind: TemplateKind) {
  const pageId = `p_${Math.random().toString(36).slice(2, 9)}`;
  const node = (i: number) => `n_${Math.random().toString(36).slice(2, 9)}${i}`;
  const nodes: unknown[] = [];
  if (kind === "mobile") {
    nodes.push(
      { id: node(1), type: "frame", name: "iPhone frame", x: 60, y: 60, w: 390, h: 844, fill: "#17171c", stroke: null, strokeWidth: 0, radius: 40, opacity: 1 },
      { id: node(2), type: "text", name: "Title", x: 92, y: 116, w: 320, h: 36, fill: null, stroke: null, strokeWidth: 0, radius: 0, opacity: 1, text: "Good morning, Ava", fontSize: 26, fontWeight: 700, align: "left", color: "#ffffff" },
      { id: node(3), type: "rect", name: "Hero card", x: 92, y: 200, w: 326, h: 150, fill: "#8b5cf6", stroke: null, strokeWidth: 0, radius: 20, opacity: 1 },
      { id: node(4), type: "text", name: "Hero title", x: 116, y: 224, w: 240, h: 26, fill: null, stroke: null, strokeWidth: 0, radius: 0, opacity: 1, text: "Design sync", fontSize: 18, fontWeight: 700, align: "left", color: "#ffffff" },
    );
  } else if (kind === "web") {
    nodes.push(
      { id: node(1), type: "frame", name: "Dashboard frame", x: 80, y: 80, w: 1120, h: 700, fill: "#17171c", stroke: null, strokeWidth: 0, radius: 16, opacity: 1 },
      { id: node(2), type: "rect", name: "Sidebar", x: 80, y: 80, w: 220, h: 700, fill: "#1d1d23", stroke: null, strokeWidth: 0, radius: 16, opacity: 1 },
      { id: node(3), type: "text", name: "Brand", x: 108, y: 112, w: 180, h: 26, fill: null, stroke: null, strokeWidth: 0, radius: 0, opacity: 1, text: "DesignBox", fontSize: 18, fontWeight: 700, align: "left", color: "#ffffff" },
      { id: node(4), type: "rect", name: "KPI 1", x: 348, y: 208, w: 260, h: 120, fill: "#232329", stroke: null, strokeWidth: 0, radius: 14, opacity: 1 },
    );
  }
  return { pages: [{ id: pageId, name: "Page 1", nodes }], activePageId: pageId, background: "#101012" };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const projects = useQuery(api.projects.list);
  const files = useQuery(api.files.recent);

  const createProject = useMutation(api.projects.create);
  const createFile = useMutation(api.files.create);
  const trashFile = useMutation(api.files.trash);
  const restoreFile = useMutation(api.files.restore);
  const removeForever = useMutation(api.files.removeForever);
  const setStarred = useMutation(api.files.setStarred);
  const publishFile = useMutation(api.files.publish);
  const unpublishFile = useMutation(api.files.unpublish);

  const [tab, setTab] = useState<ViewTab>("recent");
  const [search, setSearch] = useState("");
  const [newDialog, setNewDialog] = useState<null | "project" | "file">(null);
  const [newName, setNewName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [template, setTemplate] = useState<TemplateKind>("mobile");

  const projectList = (projects ?? []) as Project[];
  const fileList = (files ?? []) as FileRow[];

  useEffect(() => {
    if (projectList.length > 0 && !projectId) {
      setProjectId(projectList[0]._id);
    }
  }, [projectList, projectId]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projectList.forEach((p) => map.set(p._id, p.name));
    return map;
  }, [projectList]);

  const visibleFiles = useMemo(() => {
    let list = fileList;
    if (tab === "trash") list = list.filter((f) => f.trashed);
    else {
      list = list.filter((f) => !f.trashed);
      if (tab === "starred") list = list.filter((f) => f.starred);
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q));
    return list;
  }, [fileList, tab, search]);

  const handleCreateFile = async () => {
    if (!projectId || !newName.trim()) return;
    const id = await createFile({
      projectId: projectId as Id<"projects">,
      name: newName.trim(),
      template,
      doc: starterDoc(template),
    });
    setNewDialog(null);
    setNewName("");
    navigate(`/design/${id}`);
  };

  const handleCreateProject = async () => {
    if (!newName.trim()) return;
    await createProject({ name: newName.trim() });
    setNewDialog(null);
    setNewName("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "recent", label: "Recent" },
    { key: "starred", label: "Starred" },
    { key: "trash", label: "Trash" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <button
            className="flex items-center gap-2"
            onClick={() => navigate("/dashboard")}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400">
              <LayoutGrid className="size-4 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight">DesignBox</span>
          </button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/explore")}>
              <Compass className="size-4" />
              Explore
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[11px] font-semibold text-white">
                    {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm">{user?.name ?? "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10">
        {/* Heading */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your UI and UX projects
          </h1>
        </div>

        {/* Projects strip */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Projects</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => {
                setNewName("");
                setNewDialog("project");
              }}
            >
              <FolderPlus className="size-3.5" />
              New project
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {projects === undefined ? (
              <>
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </>
            ) : projectList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet — create your first one to start designing.
              </p>
            ) : (
              projectList.map((p) => (
                <Badge
                  key={p._id}
                  variant={p._id === projectId ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1 text-xs font-normal transition-colors",
                    p._id === projectId &&
                      "border-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
                  )}
                  onClick={() => setProjectId(p._id)}
                >
                  {p.name}
                </Badge>
              ))
            )}
          </div>
        </section>

        {/* Toolbar: tabs + search + new */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === t.key
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files"
                className="h-9 w-52 pl-8"
              />
            </div>
            <Button
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              onClick={() => {
                setNewName("");
                setTemplate("mobile");
                setNewDialog("file");
              }}
            >
              <FilePlus2 className="size-4" />
              New design
            </Button>
          </div>
        </div>

        {/* Files grid */}
        <section className="mt-6">
          {files === undefined ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="border-border/70 p-3 shadow-none">
                  <Skeleton className="h-[160px] w-full" />
                  <Skeleton className="mt-3 h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {tab === "trash"
                  ? "Trash is empty."
                  : tab === "starred"
                    ? "No starred files yet. Star a design to pin it here."
                    : "No files found. Create your first design."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFiles.map((f) => (
                <Card
                  key={f._id}
                  className="group cursor-pointer border-border/70 p-3 shadow-none transition-colors hover:border-violet-400/50"
                  onClick={() => navigate(`/design/${f._id}`)}
                >
                  <div
                    className={cn(
                      "relative flex h-[160px] items-center justify-center overflow-hidden rounded-md bg-gradient-to-br",
                      tileGradient(f.name),
                    )}
                  >
                    <span className="text-2xl font-bold text-white/90">
                      {f.name.slice(0, 1).toUpperCase()}
                    </span>
                    {f.published && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white">
                        <Globe className="size-3" />
                        Published
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {projectNameById.get(f.projectId) ?? "Project"}
                        {" · "}
                        {timeAgo(f.updatedAt)}
                      </p>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setStarred({
                            id: f._id as Id<"files">,
                            starred: !f.starred,
                          })
                        }
                        title={f.starred ? "Unstar" : "Star"}
                      >
                        <Star
                          className={cn(
                            "size-4",
                            f.starred
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground",
                          )}
                        />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {!f.trashed && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() =>
                                f.published
                                  ? unpublishFile({ id: f._id as Id<"files"> })
                                  : publishFile({
                                      id: f._id as Id<"files">,
                                      tags: [],
                                      description: undefined,
                                    })
                              }
                            >
                              <Globe className="mr-2 size-4" />
                              {f.published ? "Unpublish" : "Publish to Explore"}
                            </DropdownMenuItem>
                          )}
                          {f.trashed ? (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  restoreFile({ id: f._id as Id<"files"> })
                                }
                              >
                                <RotateCcw className="mr-2 size-4" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() =>
                                  removeForever({ id: f._id as Id<"files"> })
                                }
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete forever
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => trashFile({ id: f._id as Id<"files"> })}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Move to trash
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Template shortcuts */}
        {tab === "recent" &&
          fileList.filter((f) => !f.trashed).length === 0 && (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card
                className="cursor-pointer border-border/70 p-5 shadow-none transition-colors hover:border-violet-400/50"
                onClick={() => {
                  setTemplate("mobile");
                  setNewName("Mobile app");
                  setNewDialog("file");
                }}
              >
                <Smartphone className="size-5 text-cyan-400" />
                <p className="mt-3 text-sm font-medium">Mobile app template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A ready-made phone screen with a header, hero card, and
                  buttons you can restyle.
                </p>
              </Card>
              <Card
                className="cursor-pointer border-border/70 p-5 shadow-none transition-colors hover:border-violet-400/50"
                onClick={() => {
                  setTemplate("web");
                  setNewName("Web dashboard");
                  setNewDialog("file");
                }}
              >
                <LayoutGrid className="size-5 text-violet-400" />
                <p className="mt-3 text-sm font-medium">Web dashboard template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A desktop frame with sidebar navigation and metric cards.
                </p>
              </Card>
            </div>
          )}
      </div>

      {/* New file dialog */}
      <Dialog open={newDialog === "file"} onOpenChange={() => setNewDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New design file</DialogTitle>
            <DialogDescription>
              Pick a starting point. Templates come with ready-made assets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="File name"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              {(["blank", "mobile", "web"] as const).map((t) => (
                <button
                  key={t}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs capitalize transition-colors",
                    template === t
                      ? "border-violet-400 bg-violet-500/10 font-medium text-foreground"
                      : "border-border text-muted-foreground hover:border-violet-400/40",
                  )}
                  onClick={() => setTemplate(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {projectList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateFile}
              disabled={!newName.trim() || !projectId}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New project dialog */}
      <Dialog
        open={newDialog === "project"}
        onOpenChange={() => setNewDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Group related design files together.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
          />
          <DialogFooter>
            <Button
              onClick={handleCreateProject}
              disabled={!newName.trim()}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
