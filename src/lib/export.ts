/**
 * Asset export helpers: PNG snapshots and CSS snippets for developer handoff.
 */
import { activePage, type DesignDoc, type DesignNode } from "./geo";
import { renderDoc } from "./render";

/** Serialize a node's paint properties into useful CSS declarations. */
function nodeCss(n: DesignNode): string {
  const lines: string[] = [];
  lines.push(`width: ${Math.round(n.w)}px;`);
  lines.push(`height: ${Math.round(n.h)}px;`);
  const rot = n.rotation ?? 0;
  if (rot) lines.push(`transform: rotate(${rot}deg);`);
  if (n.radius > 0) lines.push(`border-radius: ${n.radius}px;`);
  if (n.fill && n.type !== "text") lines.push(`background: ${n.fill};`);
  if (n.stroke && n.strokeWidth > 0)
    lines.push(`border: ${n.strokeWidth}px solid ${n.stroke};`);
  if (n.opacity < 1) lines.push(`opacity: ${n.opacity};`);
  if (n.shadowBlur && n.shadowBlur > 0) {
    lines.push(
      `box-shadow: 0 ${Math.max(2, Math.round(n.shadowBlur / 3))}px ${n.shadowBlur}px ${n.shadowColor ?? "rgba(0,0,0,0.45)"};`,
    );
  }
  if (n.type === "text") {
    lines.push(`color: ${n.color ?? "#f4f4f5"};`);
    lines.push(`font-size: ${n.fontSize ?? 16}px;`);
    lines.push(`font-weight: ${n.fontWeight ?? 500};`);
    if (n.align && n.align !== "left") lines.push(`text-align: ${n.align};`);
  }
  return lines.join("\n");
}

export function docCss(doc: DesignDoc): string {
  const page = activePage(doc);
  const blocks = page.nodes.map((n) => `.${n.id} {\n${nodeCss(n)}\n}`);
  return `/* Node — CSS variables and styles for the current page */\n\n${blocks.join("\n\n")}\n`;
}

function download(name: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

/** Render the active page (or a single node) to a PNG data URL. */
export function renderToPng(
  doc: DesignDoc,
  opts: { nodeId?: string; scale?: number } = {},
): string {
  const page = activePage(doc);
  const scale = opts.scale ?? 2;
  const nodes = opts.nodeId
    ? page.nodes.filter((n) => n.id === opts.nodeId)
    : page.nodes;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  const pad = 8;
  const bw = isFinite(minX) ? maxX - minX + pad * 2 : 400;
  const bh = isFinite(minY) ? maxY - minY + pad * 2 : 300;
  const bx = isFinite(minX) ? minX - pad : 0;
  const by = isFinite(minY) ? minY - pad : 0;

  const canvas = document.createElement("canvas");
  canvas.width = Math.min(4096, Math.round(bw * scale));
  canvas.height = Math.min(4096, Math.round(bh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const t = { zoom: scale, panX: -bx * scale, panY: -by * scale };
  const drawDoc: DesignDoc = {
    ...doc,
    pages: [{ ...page, nodes }],
  };
  renderDoc(ctx, drawDoc, t, canvas.width, canvas.height, 1, {});
  return canvas.toDataURL("image/png");
}

export function exportPng(doc: DesignDoc, fileName: string) {
  const dataUrl = renderToPng(doc, { scale: 2 });
  if (dataUrl) download(`${fileName || "design"}.png`, dataUrl);
}

/** Export an individual layer as PNG. */
export function exportNodePng(doc: DesignDoc, node: DesignNode) {
  const dataUrl = renderToPng(doc, { nodeId: node.id, scale: 2 });
  if (dataUrl) download(`${node.name || node.type}.png`, dataUrl);
}

export function exportCss(doc: DesignDoc, fileName: string) {
  const blob = new Blob([docCss(doc)], { type: "text/css" });
  const url = URL.createObjectURL(blob);
  download(`${fileName || "design"}.css`, url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(doc: DesignDoc, fileName: string) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  download(`${fileName || "design"}.designbox.json`, url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
