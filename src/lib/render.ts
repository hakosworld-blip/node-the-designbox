/**
 * DesignBox canvas renderer.
 *
 * Pure 2D-canvas painting of a DesignDoc with a view transform. The same
 * routine renders the editor canvas, multiplayer remote selections, and the
 * dashboard file thumbnails — so previews always match the real design.
 */
import {
  activePage,
  nodeBounds,
  type DesignDoc,
  type DesignNode,
  type Transform,
} from "./geo";

export type { Transform };

export interface RenderOptions {
  showChrome?: boolean; // selection outlines + handles
  selection?: string[];
  remoteSelection?: string[];
  hoverId?: string | null;
  drawPreview?: DesignNode | null;
  selectionColor?: string;
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
  } else if (n.type === "line") {
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

function paintNode(
  ctx: CanvasRenderingContext2D,
  n: DesignNode,
  t: Transform,
  scale: number,
) {
  if (n.hidden) return;
  ctx.save();
  ctx.globalAlpha = n.opacity;
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
    if (img.complete && img.naturalWidth > 0) {
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
  pathNode(ctx, n);
  if (n.type !== "line") {
    if (n.fill) {
      ctx.fillStyle = n.fill;
      ctx.fill();
    }
    if (n.stroke && n.strokeWidth > 0) {
      ctx.strokeStyle = n.stroke;
      ctx.lineWidth = Math.max(n.strokeWidth, 0.5 / scale);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = n.stroke ?? n.fill ?? "#8b5cf6";
    ctx.lineWidth = Math.max(n.strokeWidth || 2, 1 / scale);
    ctx.stroke();
  }
  ctx.restore();
}

function paintHandles(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number; rotation?: number },
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

  ctx.fillStyle = doc.background || "#101012";
  ctx.fillRect(0, 0, width, height);

  // Dot grid on the infinite canvas surface
  const gridStep = 32 * t.zoom;
  if (gridStep > 10) {
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    const ox = ((t.panX % gridStep) + gridStep) % gridStep;
    const oy = ((t.panY % gridStep) + gridStep) % gridStep;
    for (let gx = ox; gx < width; gx += gridStep) {
      for (let gy = oy; gy < height; gy += gridStep) {
        ctx.fillRect(gx, gy, 1.4, 1.4);
      }
    }
  }

  const scale = t.zoom * dpr;
  for (const n of page.nodes) {
    if ((n.rotation ?? 0) === 0) {
      paintNode(ctx, n, t, scale);
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
    paintNode(ctx, n, local, scale);
    ctx.restore();
  }

  if (opts.drawPreview) paintNode(ctx, opts.drawPreview, t, scale);

  if (opts.showChrome) {
    const selColor = opts.selectionColor ?? "#8b5cf6";
    for (const id of opts.remoteSelection ?? []) {
      const n = page.nodes.find((p) => p.id === id);
      if (n) {
        const b = nodeBounds(n);
        b.rotation = n.rotation;
        paintHandles(ctx, b, t, selColor, false);
      }
    }
    if (opts.hoverId && !(opts.selection ?? []).includes(opts.hoverId)) {
      const n = page.nodes.find((p) => p.id === opts.hoverId);
      if (n) {
        const b = nodeBounds(n);
        b.rotation = n.rotation; // attach for paintHandles
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
        const b = nodeBounds(n);
        b.rotation = n.rotation;
        paintHandles(ctx, b, t, selColor, true);
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
