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
import { Badge } from "@/components/ui/badge";
import { NodeMark, NodeMarkTile } from "@/components/NodeLogo";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const FEATURES = [
  {
    icon: Users,
    color: "text-violet-300",
    ring: "bg-violet-500/10 border-violet-400/20",
    title: "Real-time multiplayer",
    body: "Everyone designs in the same file at the same time. Live cursors, shared selections, and instant sync — no more emailing designs around.",
  },
  {
    icon: History,
    color: "text-cyan-300",
    ring: "bg-cyan-500/10 border-cyan-400/20",
    title: "Automatic version history",
    body: "Every change is saved to the cloud and snapshotted as you work. Browse previous versions and restore any point in one click.",
  },
  {
    icon: FileCode2,
    color: "text-emerald-300",
    ring: "bg-emerald-500/10 border-emerald-400/20",
    title: "Developer-ready handoff",
    body: "Export PNG assets, copy CSS for any layer, or download the whole document. Engineers inspect specs without opening a design tool.",
  },
  {
    icon: Shapes,
    color: "text-amber-300",
    ring: "bg-amber-500/10 border-amber-400/20",
    title: "A real vector engine",
    body: "Frames, shapes, text, images, polygons, and lines on an infinite canvas — with auto layout, components, blends, and precise controls.",
  },
  {
    icon: MessageCircle,
    color: "text-pink-300",
    ring: "bg-pink-500/10 border-pink-400/20",
    title: "Comment and review",
    body: "Drop pin comments anywhere on the canvas. Product managers and teammates give feedback right where the work happens.",
  },
  {
    icon: Compass,
    color: "text-indigo-300",
    ring: "bg-indigo-500/10 border-indigo-400/20",
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

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const primaryCta = () => navigate(isAuthenticated ? "/dashboard" : "/auth");
  const primaryLabel = isAuthenticated ? "Open your workspace" : "Start designing free";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <button className="flex items-center gap-2.5" onClick={() => navigate("/")}>
            <NodeMarkTile className="size-8" />
            <span className="text-[15px] font-bold uppercase tracking-[0.22em]">Node</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Workflow
            </a>
            <button
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => navigate("/explore")}
            >
              Explore
            </button>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button size="sm" className="gap-1.5" onClick={primaryCta}>
                Open workspace
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => navigate("/auth")}
                >
                  Sign in
                </Button>
                <Button size="sm" className="gap-1.5" onClick={primaryCta}>
                  Get started
                  <ArrowRight className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Isometric cube field backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <NodeMark variant="dark" className="absolute -right-24 -top-24 size-[28rem] opacity-[0.05]" />
          <NodeMark variant="dark" className="absolute -left-32 bottom-0 size-[22rem] opacity-[0.04]" />
          <div className="absolute right-[20%] top-16 h-64 w-64 rounded-full bg-violet-600/20 blur-[110px]" />
          <div className="absolute left-[12%] top-48 h-56 w-56 rounded-full bg-cyan-500/15 blur-[110px]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-6 pb-24 pt-20 md:pt-28 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300"
            >
              <span className="size-1.5 rounded-full bg-violet-400" />
              Real-time design, built for teams
            </Badge>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Every interface
              <br />
              starts at a{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
                  Node
                </span>
                <svg
                  viewBox="0 0 120 12"
                  className="absolute -bottom-1.5 left-0 w-full text-violet-400/70"
                  aria-hidden
                >
                  <path
                    d="M2 9 Q 30 2, 60 7 T 118 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
              Node is the collaborative design tool where your whole team builds
              interface assets in one shared file. Designers draw, reviewers
              comment, developers export production-ready assets — no downloads,
              no “final_v2_FINAL”, no handoff friction.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="h-11 gap-2 px-6 shadow-lg shadow-violet-500/20"
                onClick={primaryCta}
              >
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 gap-2 border-border/80 bg-card/60 px-6 backdrop-blur"
                onClick={() => navigate("/explore")}
              >
                <Compass className="size-4" />
                Browse community designs
              </Button>
            </div>

            {/* Palette chips — bold color, minimal chrome */}
            <div className="mt-8 flex items-center justify-center gap-2 lg:justify-start">
              {["bg-violet-400", "bg-fuchsia-400", "bg-cyan-300", "bg-emerald-400", "bg-amber-300", "bg-pink-400"].map(
                (c, i) => (
                  <span
                    key={c}
                    className={`size-3 rounded-[4px] ${c} ${i === 0 ? "ring-2 ring-ring/50 ring-offset-2 ring-offset-background" : ""}`}
                  />
                ),
              )}
              <span className="ml-2 text-xs text-muted-foreground">
                Your whole palette, one URL
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
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl shadow-black/40">
              {/* Window chrome */}
              <div className="flex h-10 items-center gap-2 border-b border-border/60 bg-card/90 px-3.5">
                <NodeMarkTile className="size-5 rounded-[5px]" />
                <span className="text-xs font-medium text-muted-foreground">
                  Checkout flow
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  All changes saved
                </span>
              </div>
              {/* Mock canvas */}
              <div className="canvas-dotgrid relative h-[320px] bg-surface-canvas md:h-[380px]">
                {/* Layers panel */}
                <div className="absolute left-0 top-0 h-full w-36 border-r border-border/60 bg-card/50 p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Layers
                  </p>
                  <div className="mt-2 space-y-1">
                    {["Header", "Search field", "Hero card", "Price", "CTA button"].map(
                      (layer, i) => (
                        <div
                          key={layer}
                          className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] ${
                            i === 2
                              ? "bg-violet-500/20 text-violet-200"
                              : "text-muted-foreground"
                          }`}
                        >
                          <MousePointer2 className="size-3" />
                          {layer}
                        </div>
                      ),
                    )}
                  </div>
                </div>
                {/* Frame 1 — selected */}
                <div className="absolute left-44 top-8 h-52 w-40 rounded-lg border-2 border-violet-400/70 bg-card/80 shadow-lg md:left-48 md:h-60">
                  <div className="mx-3 mt-3 h-2.5 w-16 rounded-full bg-violet-400/70" />
                  <div className="mx-3 mt-2 h-2 w-24 rounded-full bg-muted" />
                  <div className="mx-3 mt-4 h-16 rounded-md bg-gradient-to-br from-violet-500/60 to-fuchsia-500/40" />
                  <div className="mx-3 mt-3 flex items-center justify-between">
                    <div className="h-2 w-10 rounded-full bg-muted" />
                    <div className="h-2 w-6 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="mx-3 mt-3 h-7 rounded-md bg-cyan-500/70" />
                  <span className="absolute -top-2.5 left-3 rounded-sm bg-violet-500 px-1 text-[9px] font-semibold text-white">
                    Frame · 375×812
                  </span>
                </div>
                {/* Frame 2 */}
                <div className="absolute left-[24rem] top-20 hidden h-52 w-36 rounded-lg border border-border/60 bg-card/60 lg:block">
                  <div className="mx-3 mt-3 h-2.5 w-14 rounded-full bg-cyan-400/70" />
                  <div className="mx-3 mt-3 h-12 rounded-md bg-muted" />
                  <div className="mx-3 mt-2 h-12 rounded-md bg-muted" />
                  <div className="mx-3 mt-4 h-7 rounded-md bg-emerald-500/70" />
                </div>
                {/* Live cursors */}
                <div className="absolute right-16 top-12 flex items-center gap-1.5">
                  <MousePointer2 className="size-4 fill-cyan-400 text-cyan-400" />
                  <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-semibold text-cyan-950">
                    Maya
                  </span>
                </div>
                <div className="absolute bottom-12 right-32 flex items-center gap-1.5">
                  <MousePointer2 className="size-4 fill-amber-400 text-amber-400" />
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
                    Sam
                  </span>
                </div>
              </div>
            </div>

            {/* Floating spec card — the developer-handoff hook */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -bottom-6 -left-4 hidden rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur sm:block"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
        <div className="relative border-t border-border/60 bg-card/30 py-3">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-6">
            {TICKER.map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <span className="size-1 rounded-full bg-violet-400/70" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="relative mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Why Node
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Everything a product team needs, in one file
          </h2>
          <p className="mt-4 text-muted-foreground">
            From first wireframe to final asset export — without switching tools,
            sending files, or losing track of versions.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.title} {...fadeUp}>
              <div className="group h-full rounded-xl border border-border/60 bg-card/60 p-6 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-lg hover:shadow-black/20">
                <span
                  className={`flex size-10 items-center justify-center rounded-lg border ${f.ring}`}
                >
                  <f.icon className={`size-5 ${f.color}`} />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow strip */}
      <section id="workflow" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
              One workflow
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Three roles, one source of truth
            </h2>
            <p className="mt-4 text-muted-foreground">
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
                color: "text-violet-300",
                bar: "bg-violet-400",
              },
              {
                step: "02",
                title: "Teams review",
                body: "Stakeholders open the same file in the browser, watch edits live, and leave pin comments without a single screenshot.",
                color: "text-cyan-300",
                bar: "bg-cyan-300",
              },
              {
                step: "03",
                title: "Developers export",
                body: "Grab PNGs at 2x, copy layer CSS, or publish to the Explore catalog so anyone can find and reuse approved assets.",
                color: "text-emerald-300",
                bar: "bg-emerald-400",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              >
                <div className="relative h-full overflow-hidden rounded-xl border border-border/60 bg-background/60 p-6">
                  <span className={`absolute inset-x-0 top-0 h-0.5 ${s.bar}`} />
                  <p className={`text-3xl font-bold ${s.color}`}>{s.step}</p>
                  <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
              <p className="bg-gradient-to-r from-white via-white to-violet-300 bg-clip-text text-4xl font-bold text-transparent">
                {s.value}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/60">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <NodeMark variant="dark" className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]" />
          <div className="absolute left-1/2 top-1/2 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        </div>
        <div className="relative mx-auto w-full max-w-3xl px-6 py-28 text-center">
          <motion.div {...fadeUp}>
            <NodeMarkTile className="mx-auto size-14 rounded-xl" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              Your next design file is a URL away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create a workspace, invite your team, and start shipping interface
              assets together. Sign up with just your email — no credit card, no
              desktop app.
            </p>
            <Button
              size="lg"
              className="mt-8 h-11 gap-2 px-8 shadow-lg shadow-violet-500/20"
              onClick={primaryCta}
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2.5">
            <NodeMarkTile className="size-6 rounded-[5px]" />
            <span className="font-bold uppercase tracking-[0.22em] text-foreground">Node</span>
          </div>
          <p>Collaborative interface design for modern product teams.</p>
          <button
            className="transition-colors hover:text-foreground"
            onClick={() => navigate("/explore")}
          >
            Explore the catalog
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
