import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  FileCode2,
  History,
  MessageCircle,
  MousePointer2,
  Shapes,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NodeMark, NodeMarkTile } from "@/components/NodeLogo";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const DOT_GRID = {
  backgroundImage:
    "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
} as const;

const FEATURES = [
  {
    icon: Users,
    title: "Real-time multiplayer",
    body: "Everyone designs in the same file at the same time. Live cursors, shared selections, and instant sync — no more emailing designs around.",
  },
  {
    icon: History,
    title: "Automatic version history",
    body: "Every change is saved and snapshotted as you work — locally on your device and in the cloud. Browse and restore any point in one click.",
  },
  {
    icon: FileCode2,
    title: "Developer-ready handoff",
    body: "Export PNG assets, copy CSS for any layer, or download the whole document. Engineers inspect specs without opening a design tool.",
  },
  {
    icon: Shapes,
    title: "A real vector engine",
    body: "Frames, shapes, text, images, polygons, and lines on an infinite canvas — with auto layout, components, blends, and precise controls.",
  },
  {
    icon: MessageCircle,
    title: "Comment and review",
    body: "Drop pin comments anywhere on the canvas. Product managers and teammates give feedback right where the work happens.",
  },
  {
    icon: Compass,
    title: "Explore community assets",
    body: "Publish your designs to the public catalog and remix UI kits, icon sets, and app screens shared by other teams.",
  },
];

const TICKER = [
  "Frames",
  "Auto layout",
  "Components",
  "Instances",
  "Multiplayer",
  "Comments",
  "Version history",
  "CSS export",
  "Gradients",
  "Blend modes",
  "Boolean ops",
  "Templates",
];

const TEAM = [
  { initial: "M", color: "#22d3ee", name: "Maya" },
  { initial: "S", color: "#fbbf24", name: "Sam" },
  { initial: "J", color: "#8b5cf6", name: "Jon" },
  { initial: "A", color: "#34d399", name: "Ada" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const primaryCta = () => navigate(isAuthenticated ? "/dashboard" : "/auth");
  const primaryLabel = isAuthenticated
    ? "Open your workspace"
    : "Start designing free";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#0b0b0e] text-zinc-100"
    >
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b0e]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <button className="flex items-center gap-2.5" onClick={() => navigate("/")}>
            <NodeMarkTile className="size-8" />
            <span className="text-[15px] font-bold uppercase tracking-[0.22em]">
              Node
            </span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Workflow
            </a>
            <button
              className="rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
              onClick={() => navigate("/explore")}
            >
              Explore
            </button>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button
                size="sm"
                className="gap-1.5 bg-violet-500 text-white hover:bg-violet-400"
                onClick={primaryCta}
              >
                Open workspace
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-zinc-300 hover:bg-white/5 hover:text-white sm:inline-flex"
                  onClick={() => navigate("/auth")}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-violet-500 text-white hover:bg-violet-400"
                  onClick={primaryCta}
                >
                  Get started
                  <ArrowRight className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Isometric cube field backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-0" style={DOT_GRID} />
          <NodeMark
            variant="dark"
            className="absolute -right-24 -top-24 size-[28rem] opacity-[0.04]"
          />
          <NodeMark
            variant="dark"
            className="absolute -left-32 bottom-0 size-[22rem] opacity-[0.03]"
          />
          <div className="absolute right-[18%] top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[130px]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-6 pb-24 pt-20 md:pt-28 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <span className="size-1.5 animate-pulse rounded-full bg-violet-400" />
              Real-time design, built for teams
            </span>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
              Every interface
              <br />
              starts at a{" "}
              <span className="relative inline-block text-violet-400">
                Node
                {/* selection-dash underline, straight from the editor */}
                <svg
                  viewBox="0 0 120 10"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-2.5 w-full text-violet-400/60"
                  aria-hidden
                >
                  <line
                    x1="0"
                    y1="5"
                    x2="120"
                    y2="5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="6 5"
                  />
                </svg>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 md:text-lg lg:mx-0">
              Node is the collaborative design tool where your whole team builds
              interface assets in one shared file. Designers draw, reviewers
              comment, developers export production-ready assets — no downloads,
              no “final_v2_FINAL”, no handoff friction.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="h-11 gap-2 bg-violet-500 px-6 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400"
                onClick={primaryCta}
              >
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 gap-2 border-white/15 bg-white/5 px-6 text-zinc-100 backdrop-blur hover:bg-white/10 hover:text-white"
                onClick={() => navigate("/explore")}
              >
                <Compass className="size-4" />
                Browse community designs
              </Button>
            </div>

            {/* Live collaborators row */}
            <div className="mt-8 flex items-center justify-center gap-3 lg:justify-start">
              <div className="flex -space-x-2">
                {TEAM.map((m) => (
                  <span
                    key={m.initial}
                    title={m.name}
                    className="flex size-7 items-center justify-center rounded-full border-2 border-[#0b0b0e] text-[10px] font-bold text-black"
                    style={{ background: m.color }}
                  >
                    {m.initial}
                  </span>
                ))}
              </div>
              <span className="text-xs text-zinc-500">
                Designing together, right now
              </span>
            </div>
          </div>

          {/* Editor mock */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141419] shadow-2xl shadow-black/60 ring-1 ring-black/40">
              {/* Window chrome */}
              <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#1c1c22] px-3.5">
                <NodeMarkTile className="size-5 rounded-[5px]" />
                <span className="text-xs font-medium text-zinc-300">
                  Checkout flow
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  All changes saved
                </span>
              </div>
              {/* Mock canvas */}
              <div
                className="relative h-[320px] bg-[#101014] md:h-[380px]"
                style={DOT_GRID}
              >
                {/* Layers panel */}
                <div className="absolute left-0 top-0 h-full w-36 border-r border-white/10 bg-[#141419]/80 p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    Layers
                  </p>
                  <div className="mt-2 space-y-1">
                    {[
                      "Header",
                      "Search field",
                      "Hero card",
                      "Price",
                      "CTA button",
                    ].map((layer, i) => (
                      <div
                        key={layer}
                        className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] ${
                          i === 2
                            ? "bg-violet-500/20 text-violet-200"
                            : "text-zinc-400"
                        }`}
                      >
                        <MousePointer2 className="size-3" />
                        {layer}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Frame 1 — selected with marching ants */}
                <div className="absolute left-44 top-8 h-52 w-40 rounded-lg bg-[#1c1c22]/90 shadow-lg md:left-48 md:h-60">
                  <svg aria-hidden className="pointer-events-none absolute -inset-px h-[calc(100%+2px)] w-[calc(100%+2px)]">
                    <rect
                      x="0.75"
                      y="0.75"
                      width="99%"
                      height="99%"
                      rx="10"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                      className="animate-[march_0.6s_linear_infinite]"
                    />
                  </svg>
                  <span className="absolute -top-6 left-0 text-[10px] font-medium text-violet-400">
                    Hero card · 375×812
                  </span>
                  <div className="mx-3 mt-3 h-2.5 w-16 rounded-full bg-violet-400/80" />
                  <div className="mx-3 mt-2 h-2 w-24 rounded-full bg-white/15" />
                  <div className="mx-3 mt-4 h-16 rounded-md bg-violet-500/30" />
                  <div className="mx-3 mt-3 flex items-center justify-between">
                    <div className="h-2 w-10 rounded-full bg-white/15" />
                    <div className="h-2 w-6 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="mx-3 mt-3 h-7 rounded-md bg-cyan-500/60" />
                </div>
                {/* Frame 2 */}
                <div className="absolute left-[24rem] top-20 hidden h-52 w-36 rounded-lg border border-white/10 bg-[#1c1c22]/60 lg:block">
                  <div className="mx-3 mt-3 h-2.5 w-14 rounded-full bg-cyan-400/70" />
                  <div className="mx-3 mt-3 h-12 rounded-md bg-white/10" />
                  <div className="mx-3 mt-2 h-12 rounded-md bg-white/10" />
                  <div className="mx-3 mt-4 h-7 rounded-md bg-emerald-500/70" />
                </div>
                {/* Live cursors */}
                {[
                  { name: "Maya", color: "#22d3ee", cls: "right-16 top-12" },
                  { name: "Sam", color: "#fbbf24", cls: "bottom-12 right-32" },
                ].map((c) => (
                  <motion.div
                    key={c.name}
                    className={`absolute flex items-center gap-1.5 ${c.cls}`}
                    animate={{ x: [0, -14, 8, 0], y: [0, 10, -6, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 7,
                      ease: "easeInOut",
                    }}
                  >
                    <MousePointer2
                      className="size-4"
                      style={{ fill: c.color, color: c.color }}
                    />
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-black"
                      style={{ background: c.color }}
                    >
                      {c.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating spec card — the developer-handoff hook */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -bottom-6 -left-4 hidden rounded-lg border border-white/10 bg-[#1c1c22]/95 p-3 shadow-xl backdrop-blur sm:block"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Inspect · CTA button
              </p>
              <div className="mt-1.5 space-y-1 font-mono text-[11px] leading-relaxed">
                <p>
                  <span className="text-cyan-300">background</span>:{" "}
                  <span className="text-emerald-300">#0ea5e9</span>;
                </p>
                <p>
                  <span className="text-cyan-300">border-radius</span>:{" "}
                  <span className="text-amber-300">8px</span>;
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Capability ticker */}
        <div className="relative border-t border-white/10 bg-[#0e0e12] py-3.5">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-6">
            {TICKER.map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 text-xs font-medium text-zinc-500"
              >
                <span className="size-1 rounded-full bg-violet-400/70" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section
        id="features"
        className="relative mx-auto w-full max-w-6xl px-6 py-24"
      >
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/90">
            Why Node
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Everything a product team needs, in one file
          </h2>
          <p className="mt-4 text-zinc-400">
            From first wireframe to final asset export — without switching tools,
            sending files, or losing track of versions.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.title} {...fadeUp}>
              <div className="group h-full rounded-xl border border-white/10 bg-[#141419] p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#18181f] hover:shadow-lg hover:shadow-black/40">
                <span className="flex size-10 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
                  <f.icon className="size-5 text-violet-300" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {f.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow strip */}
      <section id="workflow" className="border-y border-white/10 bg-[#0e0e12]">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/90">
              One workflow
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Three roles, one source of truth
            </h2>
            <p className="mt-4 text-zinc-400">
              Node keeps designers, reviewers, and engineers working from the
              same file — in the browser, on any platform.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Designers draw",
                body: "Sketch screens with vector shapes, text, and images on an infinite canvas. Templates kickstart mobile and web layouts.",
              },
              {
                step: "02",
                title: "Teams review",
                body: "Stakeholders open the same file in the browser, watch edits live, and leave pin comments without a single screenshot.",
              },
              {
                step: "03",
                title: "Developers export",
                body: "Grab PNGs at 2x, copy layer CSS, or publish to the Explore catalog so anyone can find and reuse approved assets.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              >
                <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-[#141419] p-6">
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-violet-500/60" />
                  <p className="font-mono text-3xl font-bold text-violet-400">
                    {s.step}
                  </p>
                  <h3 className="mt-3 text-base font-semibold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {s.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / trust */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {[
            { value: "0 files", label: "named final_v2_FINAL — ever" },
            { value: "1 URL", label: "shared with the whole team" },
            { value: "∞ versions", label: "kept automatically in the cloud" },
          ].map((s) => (
            <motion.div key={s.label} {...fadeUp}>
              <p className="text-4xl font-bold text-white">{s.value}</p>
              <p className="mt-1.5 text-sm text-zinc-500">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0" style={DOT_GRID} />
          <NodeMark
            variant="dark"
            className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
          />
          <div className="absolute left-1/2 top-1/2 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
        </div>
        <div className="relative mx-auto w-full max-w-3xl px-6 py-28 text-center">
          <motion.div {...fadeUp}>
            <NodeMarkTile className="mx-auto size-14 rounded-xl" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Your next design file is a URL away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Create a workspace, invite your team, and start shipping interface
              assets together. Sign up with just your email — no credit card, no
              desktop app.
            </p>
            <Button
              size="lg"
              className="mt-8 h-11 gap-2 bg-violet-500 px-8 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400"
              onClick={primaryCta}
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <NodeMarkTile className="size-6 rounded-[5px]" />
            <span className="font-bold uppercase tracking-[0.22em] text-white">
              Node
            </span>
          </div>
          <p>Collaborative interface design for modern product teams.</p>
          <button
            className="transition-colors hover:text-white"
            onClick={() => navigate("/explore")}
          >
            Explore the catalog
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
