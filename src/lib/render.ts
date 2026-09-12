/**
 * Node canvas renderer.
 *
 * Pure 2D-canvas painting of a DesignDoc with a view transform. The same
 * routine renders the editor canvas, multiplayer remote selections, and the
 * dashboard file thumbnails — so previews always match the real design.
 */
import {
  activePage,
  nodeBounds,
  type Bounds,
  type DesignDoc,
  type DesignNode,
  type Transform,
} from "./geo";

/** Canvas blend modes (Figma-inspired). "normal" = source-over. */
export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

type HandleBounds = Bounds & { rotation?: number };

export type { Transform };

export interface SnapGuide {
  axis: "x" | "y";
  value: number; // page-space coordinate
  kind: "edge" | "center";
}

export interface RenderOptions {
  showChrome?: boolean; // selection outlines + handles
  selection?: string[];
  remoteSelection?: string[];
  hoverId?: string | null;
  drawPreview?: DesignNode | null;
  selectionColor?: string;
  snapGuides?: SnapGuide[]; // smart alignment guides to paint
  outlineMode?: boolean; // Figma-style outlines-only rendering
  marquee?: Bounds | null; // rubber-band selection rectangle
  /** App-theme canvas override (light mode => white canvas). */
  themeBackground?: string;
}

function pathNode(ctx: CanvasRenderingContext2D, n: DesignNode) {
  const b = nodeBounds(n);
  ctx.beginPath();
  if (n.type === "ellipse") {
    ctx.ellipse(
      b.x + b.w / 2,
      b.y + b.h / 2,
      Math.abs(b.w / 2),
      Math.abs(b.h / 2),
      0,
      0,
      Math.PI * 2,
    );
  } else if (n.type === "polygon") {
    const sides = Math.max(3, n.points ?? 3);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const rx = b.w / 2;
    const ry = b.h / 2;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * rx;
      const py = cy + Math.sin(angle) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (n.type === "line" || n.type === "arrow") {
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(n.x + n.w, n.y + n.h);
  } else {
    const r = Math.min(n.radius, Math.abs(b.w) / 2, Math.abs(b.h) / 2);
    if (r > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(b.x, b.y, b.w, b.h, r);
    } else {
      ctx.rect(b.x, b.y, b.w, b.h);
    }
  }
}

// Simple image cache so we don't re-decode data URLs every frame.
const imgCache = new Map<string, HTMLImageElement>();

/** Apply mirror transforms around the node's own center (Figma-style flip). */
function applyFlip(ctx: CanvasRenderingContext2D, n: DesignNode) {
  if (!n.flipX && !n.flipY) return;
  const b = nodeBounds(n);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(n.flipX ? -1 : 1, n.flipY ? -1 : 1);
  ctx.translate(-cx, -cy);
}

/** Linear-gradient fill between two colors at an angle (degrees). */
function gradientPaint(ctx: CanvasRenderingContext2D, n: DesignNode) {
  const g = n.gradient;
  if (!g) return n.fill ?? "#8b5cf6";
  const b = nodeBounds(n);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rad = ((g.angle - 90) * Math.PI) / 180;
  const len = (Math.abs(b.w * Math.cos(rad)) + Math.abs(b.h * Math.sin(rad))) / 2;
  const grad = ctx.createLinearGradient(
    cx - Math.cos(rad) * len,
    cy - Math.sin(rad) * len,
    cx + Math.cos(rad) * len,
    cy + Math.sin(rad) * len,
  );
  grad.addColorStop(0, g.from);
  grad.addColorStop(1, g.to);
  return grad;
}

function paintNode(
  ctx: CanvasRenderingContext2D,
  n: DesignNode,
  t: Transform,
  scale: number,
  outline = false,
) {
  if (n.hidden) return;
  ctx.save();
  ctx.globalAlpha = n.opacity;
  if (n.blur && n.blur > 0) {
    // Layer blur via an SVG filter reference (fast, GPU-composited).
    ctx.filter = `blur(${n.blur}px)`;
  }
  if (n.blend && n.blend !== "normal") {
    ctx.globalCompositeOperation = n.blend as GlobalCompositeOperation;
  }
  if (n.shadowBlur && n.shadowBlur > 0) {
    ctx.shadowBlur = n.shadowBlur;
    ctx.shadowColor = n.shadowColor ?? "rgba(0,0,0,0.45)";
    ctx.shadowOffsetY = Math.max(2, n.shadowBlur / 3);
  }

  if (n.type === "image" && n.src) {
    let img = imgCache.get(n.src);
    if (!img) {
      img = new Image();
      img.src = n.src;
      imgCache.set(n.src, img);
    }
    ctx.translate(t.panX, t.panY);
    ctx.scale(t.zoom, t.zoom);
    applyFlip(ctx, n);
    if (outline) {
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = Math.max(1 / scale, 0.5);
      ctx.strokeRect(n.x, n.y, n.w, n.h);
    } else if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, n.x, n.y, n.w, n.h);
    } else {
      ctx.fillStyle = "#27272a";
      ctx.fillRect(n.x, n.y, n.w, n.h);
    }
    ctx.restore();
    return;
  }

  if (n.type === "text") {
    const fontSize = n.fontSize ?? 16;
    ctx.fillStyle = n.color ?? "#f4f4f5";
    ctx.textBaseline = "top";
    ctx.textAlign = (n.align ?? "left") as CanvasTextAlign;
    const tx =
      n.align === "center"
        ? n.x + n.w / 2
        : n.align === "right"
          ? n.x + n.w
          : n.x;
    const lines = (n.text ?? "").split("\n");
    ctx.font = `${n.fontWeight ?? 500} ${fontSize * t.zoom}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    if (outline) {
      // Outlines mode: show a light box for text layers.
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = Math.max(1 / scale, 0.5);
      ctx.strokeRect(n.x, n.y, n.w, n.h);
      ctx.restore();
      return;
    }
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        tx * t.zoom + t.panX,
        (n.y + i * fontSize * 1.35) * t.zoom + t.panY,
      );
    });
    ctx.restore();
    return;
  }

  ctx.translate(t.panX, t.panY);
  ctx.scale(t.zoom, t.zoom);
  applyFlip(ctx, n);
  pathNode(ctx, n);
  if (n.type !== "line" && n.type !== "arrow") {
    if (outline) {
      ctx.strokeStyle = n.fill ?? "#e4e4e7";
      ctx.lineWidth = Math.max(1 / scale, 0.5);
      ctx.stroke();
    } else {
      if (n.fill) {
        ctx.fillStyle = gradientPaint(ctx, n);
        ctx.fill();
      }
      if (n.stroke && n.strokeWidth > 0) {
        ctx.strokeStyle = n.stroke;
        ctx.lineWidth = Math.max(n.strokeWidth, 0.5 / scale);
        if (n.dash && n.dash > 0) ctx.setLineDash([n.dash, n.dash]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  } else {
    ctx.strokeStyle = n.stroke ?? n.fill ?? "#8b5cf6";
    ctx.lineWidth = Math.max(n.strokeWidth || 2, 1 / scale);
    if (n.dash && n.dash > 0) ctx.setLineDash([n.dash, n.dash]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Arrowhead for arrow nodes.
    if (n.type === "arrow") {
      const ex = n.x + n.w;
      const ey = n.y + n.h;
      const ang = Math.atan2(n.h, n.w);
      const head = Math.max(10, n.strokeWidth * 4);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - head * Math.cos(ang - 0.45), ey - head * Math.sin(ang - 0.45));
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - head * Math.cos(ang + 0.45), ey - head * Math.sin(ang + 0.45));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintHandles(
  ctx: CanvasRenderingContext2D,
  b: HandleBounds,
  t: Transform,
  color: string,
  withHandles: boolean,
) {
  const x = b.x * t.zoom + t.panX;
  const y = b.y * t.zoom + t.panY;
  const w = b.w * t.zoom;
  const h = b.h * t.zoom;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const rot = (b as { rotation?: number }).rotation ?? 0;
  if (rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  if (withHandles) {
    ctx.fillStyle = "#ffffff";
    const hs = 7;
    const pts: Array<[number, number]> = [
      [x, y],
      [x + w / 2, y],
      [x + w, y],
      [x, y + h / 2],
      [x + w, y + h / 2],
      [x, y + h],
      [x + w / 2, y + h],
      [x + w, y + h],
    ];
    for (const [px, py] of pts) {
      ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
      ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
    }
  }
  ctx.restore();
}

/** Parse a css color and return relative luminance (0 dark - 1 light). */
export function bgLuminance(css: string): number | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim());
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const rgb = /rgba?\(([^)]+)\)/.exec(css);
  if (rgb) {
    const parts = rgb[1].split(",").map((x) => parseFloat(x));
    if (parts.length >= 3) return (0.299 * parts[0] + 0.587 * parts[1] + 0.114 * parts[2]) / 255;
  }
  return null;
}

export function renderDoc(
  ctx: CanvasRenderingContext2D,
  doc: DesignDoc,
  t: Transform,
  width: number,
  height: number,
  dpr: number,
  opts: RenderOptions = {},
) {
  const page = activePage(doc);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Theme override (editor light/dark preference) wins over the doc's own
  // background so the canvas follows the app setting.
  const bg = opts.themeBackground ?? doc.background ?? "#101012";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Dot grid auto-contrasts with the background (dark dots on light bg).
  const gridStep = 32 * t.zoom;
  if (gridStep > 10) {
    const lum = bgLuminance(bg);
    ctx.fillStyle =
      lum === null
        ? "rgba(255,255,255,0.10)"
        : lum > 0.55
          ? "rgba(0,0,0,0.14)"
          : "rgba(255,255,255,0.10)";
    const ox = ((t.panX % gridStep) + gridStep) % gridStep;
    const oy = ((t.panY % gridStep) + gridStep) % gridStep;
    for (let gx = ox; gx < width; gx += gridStep) {
      for (let gy = oy; gy < height; gy += gridStep) {
        ctx.fillRect(gx, gy, 1.4, 1.4);
      }
    }
  }

  const scale = t.zoom * dpr;
  const outline = opts.outlineMode === true;
  for (const n of page.nodes) {
    // Smart alignment guides (painted under content chrome).
    if (opts.snapGuides && opts.snapGuides.length > 0) {
      ctx.save();
      ctx.strokeStyle = "#f0abfc"; // fuchsia-300
      ctx.lineWidth = 1;
      for (const guide of opts.snapGuides) {
        ctx.beginPath();
        if (guide.axis === "x") {
          const sx = guide.value * t.zoom + t.panX;
          ctx.moveTo(sx + 0.5, 0);
          ctx.lineTo(sx + 0.5, height);
        } else {
          const sy = guide.value * t.zoom + t.panY;
          ctx.moveTo(0, sy + 0.5);
          ctx.lineTo(width, sy + 0.5);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    if ((n.rotation ?? 0) === 0) {
      paintNode(ctx, n, t, scale, outline);
      continue;
    }
    // Rotated nodes: rotate about the node's own center in screen space.
    const b = nodeBounds(n);
    const cx = b.x * t.zoom + t.panX;
    const cy = b.y * t.zoom + t.panY;
    ctx.save();
    ctx.translate(cx + (b.w * t.zoom) / 2, cy + (b.h * t.zoom) / 2);
    ctx.rotate(((n.rotation ?? 0) * Math.PI) / 180);
    ctx.translate(-(b.w * t.zoom) / 2, -(b.h * t.zoom) / 2);
    const local: Transform = { zoom: t.zoom, panX: 0, panY: 0 };
    paintNode(ctx, n, local, scale, outline);
    ctx.restore();
  }

  if (opts.drawPreview) paintNode(ctx, opts.drawPreview, t, scale, outline);

  // Rubber-band marquee rectangle (painted above content, below chrome).
  if (opts.marquee) {
    const m = opts.marquee;
    const x = m.x * t.zoom + t.panX;
    const y = m.y * t.zoom + t.panY;
    const w = m.w * t.zoom;
    const h = m.h * t.zoom;
    ctx.save();
    ctx.fillStyle = "rgba(139, 92, 246, 0.12)";
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.restore();
  }

  if (opts.showChrome) {
    const selColor = opts.selectionColor ?? "#8b5cf6";
    for (const id of opts.remoteSelection ?? []) {
      const n = page.nodes.find((p) => p.id === id);
      if (n) {
        const b: HandleBounds = { ...nodeBounds(n), rotation: n.rotation };
        paintHandles(ctx, b, t, selColor, false);
      }
    }
    if (opts.hoverId && !(opts.selection ?? []).includes(opts.hoverId)) {
      const n = page.nodes.find((p) => p.id === opts.hoverId);
      if (n) {
        const b: HandleBounds = {
          ...nodeBounds(n),
          rotation: n.rotation,
        }; // attach for paintHandles
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          b.x * t.zoom + t.panX - 1,
          b.y * t.zoom + t.panY - 1,
          b.w * t.zoom + 2,
          b.h * t.zoom + 2,
        );
        ctx.restore();
      }
    }
    for (const id of opts.selection ?? []) {
      const n = page.nodes.find((p) => p.id === id);
      if (n) {
        const b: HandleBounds = { ...nodeBounds(n), rotation: n.rotation };
        paintHandles(ctx, b, t, selColor, true);
        // Figma-style rotate handle hovering just above the top-center handle.
        if ((opts.selection ?? []).length === 1 && !n.locked) {
          const rot = ((n.rotation ?? 0) * Math.PI) / 180;
          // Top-center local offset rotated about the node's center.
          const offX = (b.h / 2) * Math.sin(rot);
          const offY = -(b.h / 2) * Math.cos(rot);
          const cxp = (b.x + b.w / 2) * t.zoom + t.panX;
          const cyp = (b.y + b.h / 2) * t.zoom + t.panY;
          const ex = cxp + offX * t.zoom;
          const ey = cyp + offY * t.zoom;
          const hx = cxp + offX * t.zoom * 1.6;
          const hy = cyp + offY * t.zoom * 1.6;
          ctx.save();
          ctx.strokeStyle = selColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }
}

/**
 * Static thumbnail renderer: fits the doc's content into the given viewport
 * with no chrome. Used by dashboard cards and catalog cards.
 */
export function renderThumb(
  ctx: CanvasRenderingContext2D,
  doc: DesignDoc | null,
  width: number,
  height: number,
) {
  const dpr = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!doc) {
    ctx.fillStyle = "#141417";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const page = activePage(doc);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of page.nodes) {
    const b = nodeBounds(n);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const empty = !isFinite(minX);
  const bw = empty ? 800 : maxX - minX;
  const bh = empty ? 600 : maxY - minY;
  const zoom = Math.min((width - 24) / bw, (height - 24) / bh);
  const t: Transform = {
    zoom,
    panX: width / 2 - (empty ? 400 : minX + bw / 2) * zoom,
    panY: height / 2 - (empty ? 300 : minY + bh / 2) * zoom,
  };
  const drawDoc: DesignDoc = empty
    ? { ...doc, pages: [{ ...page, nodes: [] }] }
    : doc;
  renderDoc(ctx, drawDoc, t, width, height, dpr, {});
}
