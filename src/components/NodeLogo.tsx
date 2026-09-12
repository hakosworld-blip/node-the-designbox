// Node brand mark — the interlocking isometric cube "N" from the Node logo.
// `variant="light"` is for light backgrounds (brand black/white),
// `variant="dark"` remaps the faces so the mark reads on dark surfaces.

const PALETTES = {
  light: {
    black: "#0a0a0a",
    gray: "#3d3d3d",
    gray2: "#2e2e2e",
    white: "#ffffff",
  },
  dark: {
    black: "#fafafa",
    gray: "#9c9c9c",
    gray2: "#7c7c7c",
    white: "#2b2b2b",
  },
} as const;

export function NodeMark({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: keyof typeof PALETTES;
}) {
  const c = PALETTES[variant];
  return (
    <svg viewBox="0 0 100 104" className={className} aria-hidden="true">
      {/* top-left flat diamond */}
      <polygon points="28.5,8 49.5,20 28.5,32 7.5,20" fill={c.gray} />
      {/* lower-left cube */}
      <polygon points="40,42 61,54 40,66 19,54" fill={c.white} />
      <polygon points="19,54 40,66 40,90 19,78" fill={c.black} />
      <polygon points="40,66 61,54 61,78 40,90" fill={c.black} />
      {/* bottom-right flat diamond */}
      <polygon points="40,90 61,78 82,90 61,102" fill={c.black} />
      {/* upper-right cube (drawn over, interlocking) */}
      <polygon points="60,14 81,26 60,38 39,26" fill={c.gray2} />
      <polygon points="60,38 81,26 81,50 60,62" fill={c.black} />
      <polygon points="39,26 60,38 60,62 39,50" fill={c.white} />
      {/* interlock notch from the lower cube's right face */}
      <polygon points="40,66 61,54 60,62" fill={c.black} />
    </svg>
  );
}

/** Mark inside the white brand tile, as it appears in the logo files. */
export function NodeMarkTile({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/10 ${className ?? ""}`}
    >
      <NodeMark variant="light" className="size-[62%] translate-y-[2%]" />
    </span>
  );
}

/** Full horizontal lockup: mark + NODE wordmark. */
export function NodeLockup({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: keyof typeof PALETTES;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <NodeMark variant={variant} className="size-7" />
      <span
        className={`text-[17px] font-bold uppercase tracking-[0.22em] ${variant === "dark" ? "text-white" : "text-neutral-950"}`}
      >
        Node
      </span>
    </span>
  );
}
