import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Compass, MousePointer2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";

/** The editor's selection accent (matches render.ts). */
const VIOLET = "#8b5cf6";

/** Corner + edge handle positions for a Figma-style selection box. */
const HANDLES = [
  "-top-1.5 -left-1.5",
  "-top-1.5 left-1/2 -translate-x-1/2",
  "-top-1.5 -right-1.5",
  "top-1/2 -left-1.5 -translate-y-1/2",
  "top-1/2 -right-1.5 -translate-y-1/2",
  "-bottom-1.5 -left-1.5",
  "-bottom-1.5 left-1/2 -translate-x-1/2",
  "-bottom-1.5 -right-1.5",
] as const;

const RULER_TICKS = {
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 48px)," +
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 12px)",
} as const;

export default function NotFound() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    document.title = "404 · Node";
    return () => {
      document.title = "Node - Powering Projects to life";
    };
  }, []);

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground"
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
    >
      {/* Canvas dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Rulers */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 hidden h-5 border-b border-white/5 bg-[#141419] sm:block"
        style={RULER_TICKS}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 hidden w-5 border-r border-white/5 bg-[#141419] sm:block"
        style={{
          ...RULER_TICKS,
          transform: "rotate(90deg)",
          transformOrigin: "top left",
          width: "100vh",
        }}
      />
      <div aria-hidden className="absolute left-0 top-0 z-20 hidden size-5 border-r border-b border-border bg-[#1c1c22] sm:block" />

      {/* Brand + fake collaborators */}
      <div className="absolute left-6 top-9 z-20 hidden items-center gap-2 sm:flex">
        <img src={logo} alt="Node" className="size-5 rounded" />
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          Node
        </span>
      </div>
      <div className="absolute right-5 top-9 z-20 flex -space-x-1.5">
        {["Y", "G", "?"].map((initial, i) => (
          <span
            key={initial}
            title={
              initial === "?"
                ? "wandering guest (that's you)"
                : `collaborator ${initial}`
            }
            className="flex size-6 items-center justify-center rounded-full border border-[#0b0b0e] text-[10px] font-semibold text-white"
            style={{
              background: ["#8b5cf6", "#3f3f46", "#52525b"][i],
              zIndex: 3 - i,
            }}
          >
            {initial}
          </span>
        ))}
      </div>

      {/* Center stage */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          {/* Frame label (Figma shows it above the selection) */}
          <span
            className="absolute -top-7 left-0 text-xs font-medium"
            style={{ color: VIOLET }}
          >
            Frame 404
          </span>

          <div className="relative flex h-56 w-56 items-center justify-center rounded-lg md:h-64 md:w-64">
            {/* Marching-ants selection */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-visible"
            >
              <motion.rect
                x="0.75"
                y="0.75"
                width="99.5%"
                height="99.5%"
                rx="10"
                fill="none"
                stroke={VIOLET}
                strokeWidth="1.5"
                strokeDasharray="6 6"
                animate={{ strokeDashoffset: [0, -12] }}
                transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
              />
            </svg>
            {/* Handles */}
            {HANDLES.map((cls) => (
              <span
                key={cls}
                aria-hidden
                className={`absolute size-2.5 rounded-[2px] border border-zinc-400 bg-white shadow-sm ${cls}`}
              />
            ))}

            <span className="select-none text-6xl font-bold tracking-tight text-white md:text-7xl">
              404
            </span>

            {/* Dimension chip */}
            <span className="absolute -bottom-9 right-0 rounded bg-[#1c1c22] px-2 py-0.5 font-mono text-[11px] text-foreground/80 ring-1 ring-white/10">
              404 × 404
            </span>
          </div>

          {/* Drifting multiplayer cursor */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-1/2"
            animate={{ x: [0, 130, -50, 70, 0], y: [0, 60, 150, 30, 0] }}
            transition={{ repeat: Infinity, duration: 16, ease: "easeInOut" }}
          >
            <MousePointer2 className="size-4 fill-[#3f3f46] text-[#3f3f46]" />
            <span className="ml-3 -mt-1 inline-block rounded-full bg-[#3f3f46] px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white">
              wandering guest
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-16 text-center"
        >
          <h1 className="text-xl font-semibold text-white">
            This frame doesn't exist
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            It may have been moved, renamed, or never drawn. Your collaborators
            are still in the file, though.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button
              className="gap-2 bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-white/15 bg-transparent text-foreground hover:bg-white/5 hover:text-white"
              onClick={() => navigate("/explore")}
            >
              <Compass className="size-4" />
              Explore designs
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Zoom / coordinates pill */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 rounded-md bg-[#1c1c22] px-3 py-1.5 font-mono text-[11px] text-foreground/80 ring-1 ring-white/10">
        <span>100%</span>
        <span className="text-muted-foreground/70">|</span>
        <span className="tabular-nums">
          x {pos ? pos.x : "—"} · y {pos ? pos.y : "—"}
        </span>
      </div>
    </div>
  );
}
