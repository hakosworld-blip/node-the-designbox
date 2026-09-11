import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Compass,
  FileCode2,
  Gauge,
  History,
  MousePointer2,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const FEATURES = [
  {
    icon: Users,
    color: "text-violet-400",
    ring: "bg-violet-500/10",
    title: "Real-time multiplayer",
    body: "Everyone designs in the same file at the same time. Live cursors, shared selections, and instant sync mean no more emailing designs around.",
  },
  {
    icon: History,
    color: "text-cyan-400",
    ring: "bg-cyan-500/10",
    title: "Automatic version history",
    body: "Every change is saved to the cloud and snapshotted as you work. Browse previous versions and restore any point with one click.",
  },
  {
    icon: FileCode2,
    color: "text-emerald-400",
    ring: "bg-emerald-500/10",
    title: "Developer-ready handoff",
    body: "Export PNG assets, copy CSS for any layer, or download the whole document. Engineers inspect specs without ever opening a design file.",
  },
  {
    icon: Boxes,
    color: "text-amber-400",
    ring: "bg-amber-500/10",
    title: "A real vector engine",
    body: "Frames, shapes, text, images, polygons, and lines on an infinite canvas — with layers, multiple pages, rotation, and precise property controls.",
  },
  {
    icon: MessageCircle,
    color: "text-pink-400",
    ring: "bg-pink-500/10",
    title: "Comment and review",
    body: "Drop pin comments anywhere on the canvas. Product managers and teammates give feedback right where the work happens.",
  },
  {
    icon: Compass,
    color: "text-indigo-400",
    ring: "bg-indigo-500/10",
    title: "Explore community assets",
    body: "Publish your designs to the public catalog and remix UI kits, icon sets, and app screens shared by other teams.",
  },
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
          <button className="flex items-center gap-2" onClick={() => navigate("/")}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/25">
              <Boxes className="size-4.5 text-white" />
            </span>
            <span className="text-base font-semibold tracking-tight">DesignBox</span>
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
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
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
                  className="hidden sm:inline-flex"
                  onClick={() => navigate("/auth")}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
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
      <section className="relative overflow-hidden">
        {/* Color field backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-600/25 blur-[120px]" />
          <div className="absolute top-24 right-[10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-[110px]" />
          <div className="absolute top-64 left-[8%] h-72 w-72 rounded-full bg-fuchsia-500/15 blur-[110px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center md:pt-32">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300"
          >
            <Sparkles className="size-3.5" />
            Google Docs for interface design
          </Badge>

          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Design UI together,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              all in the browser
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            DesignBox is a collaborative design tool where your whole team creates
            interface assets in one shared file. Designers draw, everyone reviews,
            developers export production-ready assets — no downloads, no version
            chaos, no handoff friction.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white shadow-lg shadow-violet-500/25 hover:opacity-90"
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

          <p className="mt-4 text-xs text-muted-foreground">
            Free to start · Works on macOS, Windows, and ChromeOS · No installation
          </p>

          {/* Editor mock */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative mt-16 w-full max-w-5xl"
          >
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl shadow-violet-500/10">
              {/* Window chrome */}
              <div className="flex h-10 items-center gap-2 border-b border-border/60 bg-card/80 px-4">
                <span className="size-2.5 rounded-full bg-rose-500/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-muted-foreground">
                  Checkout flow — Checkout flow design file
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  All changes saved
                </span>
              </div>
              {/* Mock canvas */}
              <div className="canvas-dotgrid relative h-[340px] bg-surface-canvas md:h-[420px]">
                {/* Left panel */}
                <div className="absolute left-0 top-0 h-full w-40 border-r border-border/60 bg-card/50 p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Layers
                  </p>
                  <div className="mt-2 space-y-1.5">
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
                {/* Frames */}
                <div className="absolute left-56 top-10 h-56 w-40 rounded-lg border border-violet-400/60 bg-card/80 shadow-lg md:left-64 md:h-64 md:w-48">
                  <div className="mx-3 mt-3 h-2.5 w-16 rounded-full bg-violet-400/70" />
                  <div className="mx-3 mt-2 h-2 w-24 rounded-full bg-muted" />
                  <div className="mx-3 mt-4 h-16 rounded-md bg-gradient-to-br from-violet-500/60 to-fuchsia-500/40" />
                  <div className="mx-3 mt-3 h-7 rounded-md bg-cyan-500/70" />
                </div>
                <div className="absolute left-[22rem] top-24 hidden h-56 w-40 rounded-lg border border-border/60 bg-card/60 md:left-[26rem] md:block">
                  <div className="mx-3 mt-3 h-2.5 w-20 rounded-full bg-cyan-400/70" />
                  <div className="mx-3 mt-3 h-12 rounded-md bg-muted" />
                  <div className="mx-3 mt-2 h-12 rounded-md bg-muted" />
                  <div className="mx-3 mt-4 h-7 rounded-md bg-emerald-500/70" />
                </div>
                {/* Live cursors */}
                <div className="absolute right-24 top-16 flex items-center gap-1.5">
                  <MousePointer2 className="size-4 fill-cyan-400 text-cyan-400" />
                  <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-semibold text-cyan-950">
                    Maya
                  </span>
                </div>
                <div className="absolute bottom-16 right-40 flex items-center gap-1.5">
                  <MousePointer2 className="size-4 fill-amber-400 text-amber-400" />
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
                    Sam
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="relative mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
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
              <div className="group h-full rounded-xl border border-border/60 bg-card/60 p-6 transition-colors hover:border-violet-400/40">
                <span
                  className={`flex size-10 items-center justify-center rounded-lg ${f.ring}`}
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
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              One workflow, three roles
            </h2>
            <p className="mt-4 text-muted-foreground">
              DesignBox keeps designers, reviewers, and engineers working from the
              same source of truth.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Designers draw",
                body: "Sketch screens with vector shapes, text, and images on an infinite canvas. Templates kickstart mobile and web layouts.",
                color: "text-violet-400",
              },
              {
                step: "02",
                title: "Teams review",
                body: "Stakeholders open the same file in the browser, watch edits live, and leave pin comments without a single screenshot.",
                color: "text-cyan-400",
              },
              {
                step: "03",
                title: "Developers export",
                body: "Grab PNGs at 2x, copy layer CSS, or publish to the Explore catalog so anyone can find and reuse approved assets.",
                color: "text-emerald-400",
              },
            ].map((s, i) => (
              <motion.div key={s.step} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
                <div className="h-full rounded-xl border border-border/60 bg-background/60 p-6">
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
              <p className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-4xl font-bold text-transparent">
                {s.value}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        </div>
        <div className="relative mx-auto w-full max-w-3xl px-6 pb-28 pt-10 text-center">
          <motion.div {...fadeUp}>
            <Gauge className="mx-auto size-8 text-violet-400" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Your next design file is a URL away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create a workspace, invite your team, and start shipping interface
              assets together. Sign up with just your email — no credit card, no
              desktop app.
            </p>
            <Button
              size="lg"
              className="mt-8 h-11 gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-white shadow-lg shadow-violet-500/25 hover:opacity-90"
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
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-cyan-400">
              <Boxes className="size-3.5 text-white" />
            </span>
            <span>DesignBox</span>
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
