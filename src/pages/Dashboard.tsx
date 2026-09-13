import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import type { DesignDoc } from "@/lib/geo";
import { renderThumb } from "@/lib/thumb";
import { buildTemplate } from "@/lib/templates";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NodeMarkTile } from "@/components/NodeLogo";
import { useTheme } from "@/lib/theme";import {
  Compass,
  FilePlus2,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Globe,
  Layers,
  LayoutGrid,
  LogOut,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  PenLine,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Zap,
} from "lucide-react";

type ViewTab = "recent" | "starred" | "trash";
type TemplateKind = "blank" | "mobile" | "web";

interface Project {
  _id: string;
  name: string;
  folderId?: string;
}

interface FolderRow {
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

/** Canvas thumbnail that renders the file's real design doc. */
function FileThumb({ doc, name }: { doc: DesignDoc | undefined; name: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 320 * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);
    renderThumb(ctx, doc ?? null, 320, 180);
  }, [doc]);
  if (!doc)
    return (
      <div className="flex h-[180px] items-center justify-center rounded-md border border-border/60 bg-card/60">
        <span className="text-3xl font-bold text-muted-foreground/40">
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  return (
    <canvas
      ref={ref}
      style={{ width: 320, height: 180 }}
      className="h-[180px] w-full rounded-md"
    />
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const themeMode = useTheme((t) => t.mode);
  const navigate = useNavigate();

  const projects = useQuery(api.projects.list);
  const files = useQuery(api.files.recent);
  const folders = useQuery(api.projects.listFolders);
  const fileCount = (files ?? []).filter((f) => !(f as FileRow).trashed).length;

  const createProject = useMutation(api.projects.create);
  const createFile = useMutation(api.files.create);
  const trashFile = useMutation(api.files.trash);
  const restoreFile = useMutation(api.files.restore);
  const removeForever = useMutation(api.files.removeForever);
  const setStarred = useMutation(api.files.setStarred);
  const publishFile = useMutation(api.files.publish);
  const unpublishFile = useMutation(api.files.unpublish);
  const ensureWorkspace = useMutation(api.bootstrap.ensureUserWorkspace);
  const updateProfile = useMutation(api.profile.updateProfile);
  const createFolder = useMutation(api.projects.createFolder);
  const renameFolderFn = useMutation(api.projects.renameFolder);
  const deleteFolderFn = useMutation(api.projects.deleteFolder);
  const renameProject = useMutation(api.projects.rename);
  const moveProject = useMutation(api.projects.moveToFolder);
  const removeProject = useMutation(api.projects.remove);
  const deleteAccountFn = useMutation(api.account.deleteAccount);

  const [bootstrapped, setBootstrapped] = useState(false);
  const [tab, setTab] = useState<ViewTab>("recent");
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [template, setTemplate] = useState<TemplateKind>("mobile");
  const [publishFor, setPublishFor] = useState<FileRow | null>(null);
  const [publishTags, setPublishTags] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [newDialog, setNewDialog] = useState<null | "project" | "file" | "folder">(null);
  const [projectMenu, setProjectMenu] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [accountDialog, setAccountDialog] = useState(false);
  const [accountConfirm, setAccountConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  // Create a starter project the first time a user lands here.
  useEffect(() => {
    if (projects === undefined || bootstrapped) return;
    setBootstrapped(true);
    if (projects.length === 0) ensureWorkspace({});
  }, [projects, bootstrapped, ensureWorkspace]);

  useEffect(() => {
    if (projects && projects.length > 0 && !projectId) {
      setProjectId((projects[0] as Project)._id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
  }, [user?.name]);

  const projectList = (projects ?? []) as Project[];
  const fileList = (files ?? []) as FileRow[];

  const projectNameById = new Map(projectList.map((p) => [p._id, p.name]));

  const visibleFiles = fileList
    .filter((f) => (tab === "trash" ? f.trashed : !f.trashed))
    .filter((f) => (tab === "starred" ? f.starred : true))
    .filter((f) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (projectNameById.get(f.projectId) ?? "").toLowerCase().includes(q)
      );
    });

  const handleCreateFile = async () => {
    if (!projectId || !newName.trim()) return;
    const id = await createFile({
      projectId: projectId as Id<"projects">,
      name: newName.trim(),
      template,
      doc: buildTemplate(template),
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

  const handleCreateFolder = async () => {
    if (!newName.trim()) return;
    await createFolder({ name: newName.trim() });
    setNewDialog(null);
    setNewName("");
  };

  const handleRename = async () => {
    if (!renameValue.trim() || !moveTarget) return;
    const [id, kind] = moveTarget.split("|");
    if (kind === "folder") await renameFolderFn({ id: id as never, name: renameValue.trim() });
    else if (kind === "rename") await renameProject({ id: id as never, name: renameValue.trim() });
    setMoveTarget("");
    setRenameValue("");
  };

  const handleDeleteProject = async () => {
    if (!deleteProject || deleteConfirm.trim() !== deleteProject.name) return;
    setBusy(true);
    try {
      await removeProject({ id: deleteProject._id as never });
      if (projectId === deleteProject._id) setProjectId("");
      setDeleteProject(null);
      setDeleteConfirm("");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.name || accountConfirm.trim() !== user.name.trim()) return;
    setBusy(true);
    try {
      await deleteAccountFn({ consent: accountConfirm.trim() });
      await signOut();
      navigate("/");
    } finally {
      setBusy(false);
    }
  };

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "recent", label: "Recent" },
    { key: "starred", label: "Starred" },
    { key: "trash", label: "Trash" },
  ];

  return (
    <main className="relative min-h-dvh bg-background text-foreground">
      {/* Canvas dot grid backdrop — softer, editorial */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
      {/* Split ambience: violet up top, cyan whisper at the base */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-0 h-80 w-[54rem] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-24 left-1/4 h-64 w-[36rem] rounded-full bg-cyan-500/[0.05] blur-[120px]"
      />

      {/* Top bar — floating pill nav */}
      <header className="sticky top-3 z-20 mx-auto w-full max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between rounded-2xl border border-border/80 bg-background/80 px-3 shadow-sm shadow-black/5 backdrop-blur-xl">
          <button className="flex items-center gap-2.5 pl-1" onClick={() => navigate("/dashboard")}>
            <NodeMarkTile className="size-7 rounded-[8px]" />
            <span className="text-sm font-bold uppercase tracking-[0.22em]">Node</span>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => navigate("/explore")}
            >
              <Compass className="size-4" />
              <span className="hidden sm:inline">Explore</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 px-2 hover:bg-accent"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[11px] font-semibold text-white">
                    {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                  <span className="hidden max-w-24 truncate text-sm text-foreground sm:inline">
                    {user?.name ?? "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setProfileName(user?.name ?? "");
                    setRenameOpen(true);
                  }}
                >
                  <PenLine className="mr-2 size-4" />
                  Rename profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => useTheme.getState().toggle()}
                >
                  {themeMode === "dark" ? (
                    <Sun className="mr-2 size-4" />
                  ) : (
                    <Moon className="mr-2 size-4" />
                  )}
                  {themeMode === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-red-400 focus:text-red-400"
                  onClick={() => {
                    setAccountConfirm("");
                    setAccountDialog(true);
                  }}
                >
                  <ShieldAlert className="mr-2 size-4" />
                  Delete account…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate("/privacy")}
                >
                  <ShieldAlert className="mr-2 size-4" />
                  Privacy
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate("/terms")}
                >
                  <PenLine className="mr-2 size-4" />
                  Terms
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-10">
        {/* Greeting hero */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-violet-500">
              <Sparkles className="size-3.5" />
              Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome back,
              <span className="bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                {user?.name?.split(" ")[0] ?? "designer"}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {fileCount === 0
                ? "Your canvas awaits — start something new."
                : `${fileCount} design${fileCount === 1 ? "" : "s"} · ready when you are.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border bg-card/60 hover:bg-accent"
              onClick={() => navigate("/explore")}
            >
              <Compass className="size-4 text-violet-500" />
              Browse Explore
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-600/25 hover:from-violet-500 hover:to-violet-400"
              onClick={() => {
                setNewName("");
                setTemplate("mobile");
                setNewDialog("file");
              }}
            >
              <Zap className="size-4" />
              New design
            </Button>
          </div>
        </div>

        {/* Quick-start template cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            { kind: "mobile" as const, icon: Smartphone, name: "Mobile app", blurb: "Phone screen with header, hero card, and buttons" },
            { kind: "web" as const, icon: LayoutGrid, name: "Web dashboard", blurb: "Desktop frame with sidebar and metric cards" },
            { kind: "blank" as const, icon: PenLine, name: "Blank canvas", blurb: "Start from a clean frame and build anything" },
          ]).map(({ kind, icon: Icon, name, blurb }) => (
            <button
              key={kind}
              className="group flex items-start gap-3 rounded-xl border border-border/80 bg-card/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-accent/60 hover:shadow-md hover:shadow-violet-600/10"
              onClick={() => {
                setTemplate(kind);
                setNewName(name);
                setNewDialog("file");
              }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 transition-colors group-hover:bg-violet-500/20">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{blurb}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Projects & folders */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Projects</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  setNewName("");
                  setNewDialog("folder");
                }}
              >
                <FolderPlus className="size-3.5" />
                New folder
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  setNewName("");
                  setNewDialog("project");
                }}
              >
                <FolderPlus className="size-3.5" />
                New project
              </Button>
            </div>
          </div>

          {/* Folders */}
          {folders !== undefined && folders.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {folders.map((folder) => {
                const f = folder as FolderRow;
                const isOpen = openFolderId === f._id;
                const inside = projectList.filter((p) => p.folderId === f._id);
                return (
                  <div
                    key={f._id}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                      isOpen
                        ? "border-violet-500/60 bg-violet-500/10"
                        : "border-border bg-card/50 hover:border-white/25 hover:bg-accent/60",
                    )}
                    onClick={() => setOpenFolderId(isOpen ? null : f._id)}
                  >
                    {isOpen ? (
                      <FolderOpen className="size-4 shrink-0 text-violet-500" />
                    ) : (
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {f.name}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {inside.length}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameValue(f.name);
                            setProjectMenu(null);
                            setMoveTarget(f._id + "|folder");
                          }}
                        >
                          <Pencil className="mr-2 size-3.5" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-400 focus:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolderFn({ id: f._id as never });
                          }}
                        >
                          <Trash2 className="mr-2 size-3.5" /> Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}

          {/* Project chips (unfiled or in the open folder) */}
          <div className="mt-3 flex flex-wrap gap-2">
            {projects === undefined ? (
              <>
                <Skeleton className="h-8 w-28 rounded-full bg-accent" />
                <Skeleton className="h-8 w-24 rounded-full bg-accent" />
                <Skeleton className="h-8 w-32 rounded-full bg-accent" />
              </>
            ) : projectList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Setting up your workspace…
              </p>
            ) : (
              projectList
                .filter((p) =>
                  openFolderId ? p.folderId === openFolderId : !p.folderId,
                )
                .filter((p) => !openFolderId || true)
                .map((p) => (
                  <Badge
                    key={p._id}
                    variant="outline"
                    className={cn(
                      "group cursor-pointer rounded-full border-border px-3 py-1 text-xs font-normal transition-colors hover:border-white/25 hover:bg-accent/60",
                      p._id === projectId &&
                        "border-violet-500/60 bg-violet-500/15 text-violet-500 hover:border-violet-500",
                    )}
                    onClick={() => setProjectId(p._id)}
                  >
                    {p.name}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="ml-1.5 inline-flex rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setRenameValue(p.name);
                            setMoveTarget(p._id + "|rename");
                          }}
                        >
                          <Pencil className="mr-2 size-3.5" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                          Move to folder
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => moveProject({ id: p._id as never, folderId: undefined })}
                        >
                          <FolderInput className="mr-2 size-3.5" /> No folder
                        </DropdownMenuItem>
                        {(folders ?? []).map((folder) => {
                          const fo = folder as FolderRow;
                          return (
                            <DropdownMenuItem
                              key={fo._id}
                              className="cursor-pointer"
                              onClick={() =>
                                moveProject({ id: p._id as never, folderId: fo._id as never })
                              }
                            >
                              <Folder className="mr-2 size-3.5" /> {fo.name}
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-red-400 focus:text-red-400"
                          onClick={() => {
                            setDeleteProject(p);
                            setDeleteConfirm("");
                          }}
                        >
                          <Trash2 className="mr-2 size-3.5" /> Delete project…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Badge>
                ))
            )}
          </div>
        </section>

        {/* Toolbar — view tabs + search */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card/60 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm transition-colors",
                  tab === t.key
                    ? "bg-violet-500/15 font-medium text-foreground shadow-sm"
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
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground/70" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files"
                className="h-9 w-full border-border bg-card/60 pl-8 placeholder:text-muted-foreground/70 focus-visible:ring-violet-500/40 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Files grid */}
        <section className="mt-6">
          {files === undefined ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card
                  key={i}
                  className="border-border bg-card/50 p-3 shadow-none"
                >
                  <Skeleton className="h-[180px] w-full bg-accent" />
                  <Skeleton className="mt-3 h-4 w-2/3 bg-accent" />
                </Card>
              ))}
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 py-16 text-center">
              <span className="mx-auto flex size-11 w-max items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                {tab === "trash" ? <Trash2 className="size-5" /> : tab === "starred" ? <Star className="size-5" /> : <FilePlus2 className="size-5" />}
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">
                {tab === "trash"
                  ? "Trash is empty"
                  : tab === "starred"
                    ? "Nothing starred yet"
                    : "No files found"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tab === "trash"
                  ? "Deleted designs will appear here for recovery."
                  : tab === "starred"
                    ? "Star a design to pin it to this view."
                    : "Create your first design — templates are one click away."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFiles.map((f) => (
                <FileCard
                  key={f._id}
                  file={f}
                  projectName={projectNameById.get(f.projectId) ?? "Project"}
                  onOpen={() => navigate(`/design/${f._id}`)}
                  onToggleStar={() =>
                    setStarred({
                      id: f._id as Id<"files">,
                      starred: !f.starred,
                    })
                  }
                  onPublish={() => {
                    setPublishFor(f);
                    setPublishTags("");
                  }}
                  onUnpublish={() =>
                    unpublishFile({ id: f._id as Id<"files"> })
                  }
                  onTrash={() => trashFile({ id: f._id as Id<"files"> })}
                  onRestore={() => restoreFile({ id: f._id as Id<"files"> })}
                  onDeleteForever={() =>
                    removeForever({ id: f._id as Id<"files"> })
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Template shortcuts (only when the workspace is truly empty) */}
        {tab === "recent" && fileList.filter((f) => !f.trashed).length === 0 && (
          <div className="mt-8 rounded-2xl border border-border/80 bg-card/40 p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="size-4 text-violet-500" />
              Start from a template
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card
                className="group cursor-pointer border-border/80 bg-card/60 p-4 shadow-none transition-all hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-accent/60 hover:shadow-md hover:shadow-violet-600/10"
                onClick={() => {
                  setTemplate("mobile");
                  setNewName("Mobile app");
                  setNewDialog("file");
                }}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 transition-colors group-hover:bg-violet-500/20">
                  <Smartphone className="size-4" />
                </span>
                <p className="mt-3 text-sm font-medium text-foreground">Mobile app template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A ready-made phone screen with a header, hero card, and buttons
                  you can restyle.
                </p>
              </Card>
              <Card
                className="group cursor-pointer border-border/80 bg-card/60 p-4 shadow-none transition-all hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-accent/60 hover:shadow-md hover:shadow-violet-600/10"
                onClick={() => {
                  setTemplate("web");
                  setNewName("Web dashboard");
                  setNewDialog("file");
                }}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 transition-colors group-hover:bg-violet-500/20">
                  <LayoutGrid className="size-4" />
                </span>
                <p className="mt-3 text-sm font-medium text-foreground">Web dashboard template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A desktop frame with sidebar navigation and metric cards.
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* New file dialog */}
      <Dialog open={newDialog === "file"} onOpenChange={() => setNewDialog(null)}>
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-popover text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New design file</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Pick a starting point. Templates come with ready-made assets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="File name"
              autoFocus
              className="border-border bg-card/60 placeholder:text-muted-foreground/70"
            />
            <div className="grid grid-cols-3 gap-2">
              {(["blank", "mobile", "web"] as const).map((t) => (
                <button
                  key={t}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs capitalize transition-colors",
                    template === t
                      ? "border-violet-500/60 bg-violet-500/10 font-medium text-foreground"
                      : "border-border text-muted-foreground hover:border-white/25 hover:text-foreground/80",
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
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
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
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-sm shadow-violet-600/20 hover:from-violet-500 hover:to-violet-400"
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
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-popover text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Group related design files together.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            autoFocus
            className="border-border bg-card/60 placeholder:text-muted-foreground/70"
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
          />
          <DialogFooter>
            <Button
              onClick={handleCreateProject}
              disabled={!newName.trim()}
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-sm shadow-violet-600/20 hover:from-violet-500 hover:to-violet-400"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog */}
      <Dialog
        open={publishFor !== null}
        onOpenChange={(open) => !open && setPublishFor(null)}
      >
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-popover text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Publish to Explore</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              "{publishFor?.name}" will be listed in the public catalog for
              anyone to find, inspect, and remix.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Tags, comma separated (e.g. mobile, ecommerce)"
            value={publishTags}
            onChange={(e) => setPublishTags(e.target.value)}
            className="border-border bg-card/60 placeholder:text-muted-foreground/70"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setPublishFor(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-sm shadow-violet-600/20 hover:from-violet-500 hover:to-violet-400"
              onClick={() => {
                if (!publishFor) return;
                publishFile({
                  id: publishFor._id as Id<"files">,
                  description: undefined,
                  tags: publishTags
                    .split(",")
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean)
                    .slice(0, 5),
                });
                setPublishFor(null);
              }}
            >
              <Globe className="mr-2 size-4" />
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog
        open={newDialog === "folder"}
        onOpenChange={() => setNewDialog(null)}
      >
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-popover text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Folders group related projects together.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            className="border-border bg-card/60 placeholder:text-muted-foreground/70"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button
              onClick={handleCreateFolder}
              disabled={!newName.trim()}
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-sm shadow-violet-600/20 hover:from-violet-500 hover:to-violet-400"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog (project or folder) */}
      <Dialog
        open={moveTarget.endsWith("|rename") || moveTarget.endsWith("|folder")}
        onOpenChange={() => setMoveTarget("")}
      >
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-popover text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {moveTarget.endsWith("|folder") ? "Rename folder" : "Rename project"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New name"
            autoFocus
            className="border-border bg-card/60 placeholder:text-muted-foreground/70"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button
              onClick={handleRename}
              disabled={!renameValue.trim() || !moveTarget}
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-sm shadow-violet-600/20 hover:from-violet-500 hover:to-violet-400"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete project dialog — requires typing the project name */}
      <Dialog
        open={deleteProject !== null}
        onOpenChange={() => setDeleteProject(null)}
      >
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-red-500/40 bg-popover text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="size-5" />
              Delete project
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This permanently deletes <strong>{deleteProject?.name}</strong>{" "}
              and every design file inside it, including version history and
              comments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground">{deleteProject?.name}</strong>{" "}
              to confirm:
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Project name"
              autoFocus
              className="border-border bg-card/60 placeholder:text-muted-foreground/70"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setDeleteProject(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || deleteConfirm.trim() !== (deleteProject?.name ?? "")}
              onClick={handleDeleteProject}
            >
              {busy ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account dialog — requires typing the display name */}
      <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-red-500/40 bg-popover text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="size-5" />
              Delete account permanently
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This erases <strong>everything</strong>: your profile, all
              projects, folders, design files, version history, and comments.
              You will be signed out immediately. There is no recovery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type your display name{" "}
              <strong className="text-foreground">{user?.name}</strong> to
              confirm:
            </p>
            <Input
              value={accountConfirm}
              onChange={(e) => setAccountConfirm(e.target.value)}
              placeholder="Your display name"
              autoFocus
              className="border-border bg-card/60 placeholder:text-muted-foreground/70"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setAccountDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                busy ||
                !(user?.name ?? "").trim() ||
                accountConfirm.trim() !== (user?.name ?? "").trim()
              }
              onClick={handleDeleteAccount}
            >
              {busy ? "Deleting…" : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-h-[85dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-popover text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Display name</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This is the name collaborators see on your cursor and comments.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="border-border bg-card/60 placeholder:text-muted-foreground/70"
          />
          <DialogFooter>
            <Button
              disabled={!profileName.trim()}
              className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-sm shadow-violet-600/20 hover:from-violet-500 hover:to-violet-400"
              onClick={async () => {
                await updateProfile({ name: profileName.trim() });
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/* ---------- File card with live thumbnail and actions ---------- */

function FileCard({
  file,
  projectName,
  onOpen,
  onToggleStar,
  onPublish,
  onUnpublish,
  onTrash,
  onRestore,
  onDeleteForever,
}: {
  file: FileRow;
  projectName: string;
  onOpen: () => void;
  onToggleStar: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  const fileRow = useQuery(api.files.get, {
    id: file._id as Id<"files">,
  });
  const doc = fileRow?.doc as DesignDoc | undefined;

  return (
    <Card
      className="group cursor-pointer border-border/80 bg-card/50 p-3 shadow-none transition-all hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-accent/60 hover:shadow-lg hover:shadow-violet-600/10"
      onClick={onOpen}
    >
      <div className="overflow-hidden rounded-md border border-border/60 bg-card">
        <FileThumb doc={doc} name={file.name} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {projectName} · {timeAgo(file.updatedAt)}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-accent"
            onClick={onToggleStar}
            title={file.starred ? "Unstar" : "Star"}
          >
            <Star
              className={cn(
                "size-4",
                file.starred
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground",
              )}
            />
        </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="hover:bg-accent">
                <MoreHorizontal className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!file.trashed && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={file.published ? onUnpublish : onPublish}
                >
                  <Globe className="mr-2 size-4" />
                  {file.published ? "Unpublish" : "Publish to Explore"}
                </DropdownMenuItem>
              )}
              {file.trashed ? (
                <>
                  <DropdownMenuItem className="cursor-pointer" onClick={onRestore}>
                    <RotateCcw className="mr-2 size-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-400 focus:text-red-400"
                    onClick={onDeleteForever}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete forever
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer text-red-400 focus:text-red-400"
                  onClick={onTrash}
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
  );
}
