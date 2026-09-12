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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NodeMarkTile } from "@/components/NodeLogo";
import {
  Compass,
  FilePlus2,
  FolderPlus,
  Globe,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PenLine,
  RotateCcw,
  Search,
  Smartphone,
  Star,
  Trash2,
} from "lucide-react";

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
      <div className="flex h-[180px] items-center justify-center rounded-md border border-white/5 bg-white/[0.03]">
        <span className="text-3xl font-bold text-zinc-700">
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
  const ensureWorkspace = useMutation(api.bootstrap.ensureUserWorkspace);
  const updateProfile = useMutation(api.profile.updateProfile);

  const [bootstrapped, setBootstrapped] = useState(false);
  const [tab, setTab] = useState<ViewTab>("recent");
  const [search, setSearch] = useState("");
  const [newDialog, setNewDialog] = useState<null | "project" | "file">(null);
  const [newName, setNewName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [template, setTemplate] = useState<TemplateKind>("mobile");
  const [publishFor, setPublishFor] = useState<FileRow | null>(null);
  const [publishTags, setPublishTags] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [profileName, setProfileName] = useState("");

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

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "recent", label: "Recent" },
    { key: "starred", label: "Starred" },
    { key: "trash", label: "Trash" },
  ];

  return (
    <main className="relative min-h-screen bg-[#0b0b0e] text-zinc-100">
      {/* Canvas dot grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Violet ambience */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-0 h-72 w-[50rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]"
      />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b0b0e]/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <button className="flex items-center gap-2.5" onClick={() => navigate("/dashboard")}>
            <NodeMarkTile className="size-7 rounded-[8px]" />
            <span className="text-sm font-bold uppercase tracking-[0.22em]">Node</span>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
              onClick={() => navigate("/explore")}
            >
              <Compass className="size-4" />
              Explore
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 px-2 hover:bg-white/[0.06]"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-violet-500 text-[11px] font-semibold text-white">
                    {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                  <span className="text-sm text-zinc-200">{user?.name ?? "Account"}</span>
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
        {/* Heading */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Your UI and UX projects
          </h1>
        </div>

        {/* Projects strip */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500">Projects</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
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
                <Skeleton className="h-8 w-28 rounded-full bg-white/[0.06]" />
                <Skeleton className="h-8 w-24 rounded-full bg-white/[0.06]" />
                <Skeleton className="h-8 w-32 rounded-full bg-white/[0.06]" />
              </>
            ) : projectList.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Setting up your workspace…
              </p>
            ) : (
              projectList.map((p) => (
                <Badge
                  key={p._id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer rounded-full border-white/10 px-3 py-1 text-xs font-normal transition-colors hover:border-white/25 hover:bg-white/[0.04]",
                    p._id === projectId &&
                      "border-violet-400/40 bg-violet-500/15 text-violet-200 hover:border-violet-400/60",
                  )}
                  onClick={() => setProjectId(p._id)}
                >
                  {p.name}
                </Badge>
              ))
            )}
          </div>
        </section>

        {/* Toolbar */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === t.key
                    ? "bg-white/[0.08] font-medium text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
                onClick={() => setTab(t.key)}
              >
                {t.label}
</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-zinc-600" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files"
                className="h-9 w-52 border-white/10 bg-white/[0.03] pl-8 placeholder:text-zinc-600 focus-visible:ring-violet-500/40"
              />
            </div>
            <Button
              className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
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
                <Card
                  key={i}
                  className="border-white/[0.06] bg-white/[0.02] p-3 shadow-none"
                >
                  <Skeleton className="h-[180px] w-full bg-white/[0.06]" />
                  <Skeleton className="mt-3 h-4 w-2/3 bg-white/[0.06]" />
                </Card>
              ))}
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
              <p className="text-sm text-zinc-500">
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

        {/* Template shortcuts */}
        {tab === "recent" && fileList.filter((f) => !f.trashed).length === 0 && (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card
              className="group cursor-pointer border-white/[0.06] bg-white/[0.02] p-5 shadow-none transition-colors hover:border-violet-400/40 hover:bg-white/[0.04]"
              onClick={() => {
                setTemplate("mobile");
                setNewName("Mobile app");
                setNewDialog("file");
              }}
            >
              <Smartphone className="size-5 text-violet-400" />
              <p className="mt-3 text-sm font-medium text-zinc-100">Mobile app template</p>
              <p className="mt-1 text-xs text-zinc-500">
                A ready-made phone screen with a header, hero card, and buttons
                you can restyle.
              </p>
            </Card>
            <Card
              className="group cursor-pointer border-white/[0.06] bg-white/[0.02] p-5 shadow-none transition-colors hover:border-violet-400/40 hover:bg-white/[0.04]"
              onClick={() => {
                setTemplate("web");
                setNewName("Web dashboard");
                setNewDialog("file");
              }}
            >
              <LayoutGrid className="size-5 text-violet-400" />
              <p className="mt-3 text-sm font-medium text-zinc-100">Web dashboard template</p>
              <p className="mt-1 text-xs text-zinc-500">
                A desktop frame with sidebar navigation and metric cards.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* New file dialog */}
      <Dialog open={newDialog === "file"} onOpenChange={() => setNewDialog(null)}>
        <DialogContent className="border-white/10 bg-[#131318] text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New design file</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Pick a starting point. Templates come with ready-made assets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="File name"
              autoFocus
              className="border-white/10 bg-white/[0.03] placeholder:text-zinc-600"
            />
            <div className="grid grid-cols-3 gap-2">
              {(["blank", "mobile", "web"] as const).map((t) => (
                <button
                  key={t}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs capitalize transition-colors",
                    template === t
                      ? "border-violet-400/50 bg-violet-500/10 font-medium text-zinc-100"
                      : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300",
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
              className="h-9 rounded-md border border-white/10 bg-[#0b0b0e] px-3 text-sm text-zinc-200"
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
              className="bg-violet-600 text-white hover:bg-violet-500"
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
        <DialogContent className="border-white/10 bg-[#131318] text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Group related design files together.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            autoFocus
            className="border-white/10 bg-white/[0.03] placeholder:text-zinc-600"
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
          />
          <DialogFooter>
            <Button
              onClick={handleCreateProject}
              disabled={!newName.trim()}
              className="bg-violet-600 text-white hover:bg-violet-500"
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
        <DialogContent className="border-white/10 bg-[#131318] text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Publish to Explore</DialogTitle>
            <DialogDescription className="text-zinc-500">
              "{publishFor?.name}" will be listed in the public catalog for
              anyone to find, inspect, and remix.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Tags, comma separated (e.g. mobile, ecommerce)"
            value={publishTags}
            onChange={(e) => setPublishTags(e.target.value)}
            className="border-white/10 bg-white/[0.03] placeholder:text-zinc-600"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
              onClick={() => setPublishFor(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-500"
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

      {/* Profile rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="border-white/10 bg-[#131318] text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Display name</DialogTitle>
            <DialogDescription className="text-zinc-500">
              This is the name collaborators see on your cursor and comments.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="border-white/10 bg-white/[0.03] placeholder:text-zinc-600"
          />
          <DialogFooter>
            <Button
              disabled={!profileName.trim()}
              className="bg-violet-600 text-white hover:bg-violet-500"
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
      className="group cursor-pointer border-white/[0.06] bg-white/[0.02] p-3 shadow-none transition-colors hover:border-violet-400/40 hover:bg-white/[0.04]"
      onClick={onOpen}
    >
      <div className="overflow-hidden rounded-md border border-white/5 bg-[#0d0d11]">
        <FileThumb doc={doc} name={file.name} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{file.name}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
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
            className="hover:bg-white/[0.08]"
            onClick={onToggleStar}
            title={file.starred ? "Unstar" : "Star"}
          >
            <Star
              className={cn(
                "size-4",
                file.starred
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-500",
              )}
            />
        </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="hover:bg-white/[0.08]">
                <MoreHorizontal className="size-4 text-zinc-400" />
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
