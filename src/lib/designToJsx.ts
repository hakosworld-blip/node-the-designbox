// Design → JSX export — adapted from OpenPencil's `export -f jsx --style
// tailwind` (upstream/packages/core/src/io/formats/jsx/export.ts),
// reimplemented for Node's flat DesignDoc model. Pure functions, no DOM.

import type { DesignDoc, DesignNode } from "./geo";

export type JsxFormat = "tailwind" | "inline";

/** html tag per node type in Tailwind mode (upstream's NODE_TYPE_TO_TW_TAG). */
const TW_TAG: Record<string, string> = {
  frame: "div",
  rect: "div",
  ellipse: "div",
  text: "p",
  line: "div",
  arrow: "div",
  polygon: "div",
  image: "img",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert an arbitrary name into a valid PascalCase identifier. */
export function pascal(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "");
  const cap = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cap.length > 0 ? cap : "Node";
}

function px(n: number): string {
  return `${Math.round(n * 100) / 100}px`;
}

/** Only hex colors map safely to Tailwind arbitrary values. */
function twColor(c: string): string {
  return `[${c.trim()}]`;
}

function gradientAngleDeg(angle: number): number {
  return Math.round((((angle % 360) + 360) % 360) / 45) * 45;
}

// CSS gradient angle → Tailwind direction: 0deg = to top, 90deg = to right.
const GRAD_DIRS = [
  "to-t",
  "to-tr",
  "to-r",
  "to-br",
  "to-b",
  "to-bl",
  "to-l",
  "to-tl",
] as const;

/** Tailwind classes for a shape node. */
function shapeTw(n: DesignNode): string[] {
  const cls: string[] = [];
  cls.push(`w-[${px(n.w)}]`, `h-[${px(n.h)}]`);
  if (n.gradient) {
    cls.push(
      `bg-gradient-${GRAD_DIRS[gradientAngleDeg(n.gradient.angle) / 45]}`,
      `from-[${n.gradient.from.trim()}]`,
      `to-[${n.gradient.to.trim()}]`,
    );
  } else if (n.fill) {
    cls.push(`bg-${twColor(n.fill)}`);
  }
  if (n.radius > 0) cls.push(`rounded-[${px(n.radius)}]`);
  if (n.stroke)
    cls.push(`border-[${px(n.strokeWidth || 1)}]`, `border-${twColor(n.stroke)}`);
  if (n.opacity < 1) cls.push(`opacity-[${Math.round(n.opacity * 100) / 100}]`);
  if (n.rotation)
    cls.push(`rotate-[${Math.round(n.rotation * 100) / 100}deg]`);
  if ((n.shadowBlur ?? 0) > 0) cls.push("drop-shadow-md");
  if ((n.blur ?? 0) > 0) cls.push(`blur-[${px(n.blur ?? 0)}]`);
  if (n.hidden) cls.push("hidden");
  return cls;
}

/** Tailwind classes for a text node. */
function textTw(n: DesignNode): string[] {
  const cls: string[] = [`text-[${px(n.fontSize ?? 16)}]`];
  if (n.fontWeight && n.fontWeight !== 400) cls.push(`font-[${n.fontWeight}]`);
  if (n.color) cls.push(`text-${twColor(n.color)}`);
  if (n.align === "center") cls.push("text-center");
  else if (n.align === "right") cls.push("text-right");
  if (n.opacity < 1) cls.push(`opacity-[${Math.round(n.opacity * 100) / 100}]`);
  if (n.hidden) cls.push("hidden");
  return cls;
}

/** React style props for a shape node (inline mode). */
function shapeStyle(n: DesignNode): [string, string][] {
  const s: [string, string][] = [];
  s.push(["width", px(n.w)], ["height", px(n.h)]);
  if (n.gradient) {
    s.push([
      "background",
      `linear-gradient(${Math.round(n.gradient.angle)}deg, ${n.gradient.from}, ${n.gradient.to})`,
    ]);
  } else if (n.fill) {
    s.push(["background", n.fill]);
  }
  if (n.radius > 0) s.push(["borderRadius", px(n.radius)]);
  if (n.stroke)
    s.push(["border", `${n.strokeWidth || 1}px solid ${n.stroke}`]);
  if (n.opacity < 1) s.push(["opacity", String(Math.round(n.opacity * 100) / 100)]);
  if (n.rotation)
    s.push(["transform", `rotate(${Math.round(n.rotation * 100) / 100}deg)`]);
  if ((n.shadowBlur ?? 0) > 0)
    s.push([
      "boxShadow",
      `0 ${Math.round((n.shadowBlur ?? 0) / 2)}px ${n.shadowBlur ?? 0}px ${n.shadowColor ?? "rgba(0,0,0,0.25)"}`,
    ]);
  if ((n.blur ?? 0) > 0) s.push(["filter", `blur(${px(n.blur ?? 0)})`]);
  if (n.hidden) s.push(["display", "none"]);
  return s;
}

/** React style props for a text node (inline mode). */
function textStyle(n: DesignNode): [string, string][] {
  const s: [string, string][] = [];
  s.push(["fontSize", px(n.fontSize ?? 16)]);
  if (n.fontWeight && n.fontWeight !== 400)
    s.push(["fontWeight", String(n.fontWeight)]);
  if (n.color) s.push(["color", n.color]);
  if (n.align && n.align !== "left") s.push(["textAlign", n.align]);
  if (n.opacity < 1) s.push(["opacity", String(Math.round(n.opacity * 100) / 100)]);
  if (n.hidden) s.push(["display", "none"]);
  return s;
}

function styleJsx(entries: [string, string][]): string {
  if (entries.length === 0) return "";
  return ` style={{ ${entries.map(([k, v]) => `${k}: "${v}"`).join(", ")} }}`;
}

function emit(n: DesignNode, format: JsxFormat, indent: string): string {
  const tag = TW_TAG[n.type] ?? "div";
  const isText = n.type === "text";
  const isImage = n.type === "image";

  if (format === "tailwind") {
    const cls = (isText ? textTw(n) : shapeTw(n)).join(" ");
    const clsAttr = cls ? ` className="${cls}"` : "";
    if (isText)
      return `${indent}<p${clsAttr}>{${JSON.stringify(n.text ?? "")}}</p>`;
    if (isImage)
      return `${indent}<img${clsAttr} src="${n.src ?? ""}" alt="${escapeHtml(n.name)}" />`;
    return `${indent}<${tag}${clsAttr} />`;
  }

  const style = styleJsx(isText ? textStyle(n) : shapeStyle(n));
  if (isText) return `${indent}<p${style}>{${JSON.stringify(n.text ?? "")}}</p>`;
  if (isImage)
    return `${indent}<img${style} src="${n.src ?? ""}" alt="${escapeHtml(n.name)}" />`;
  return `${indent}<${tag}${style} />`;
}

export interface JsxExportResult {
  code: string;
  componentCount: number;
}

/**
 * Export each top-level node on a page as a self-contained React component,
 * mirroring OpenPencil's selection → JSX flow. Components are sized to the
 * node and fully self-styled; text content is escaped.
 */
export function docToJsx(
  doc: DesignDoc,
  opts: { pageId?: string; format?: JsxFormat } = {},
): JsxExportResult {
  const format = opts.format ?? "tailwind";
  const page =
    doc.pages.find((p) => p.id === (opts.pageId ?? doc.activePageId)) ??
    doc.pages[0];
  if (!page || page.nodes.length === 0)
    return { code: "", componentCount: 0 };

  const used = new Set<string>();
  const components: string[] = [];

  for (const n of page.nodes) {
    let name = pascal(n.name || n.type);
    while (used.has(name)) name = `${name}2`;
    used.add(name);

    const inner = emit(n, format, "      ");
    const body =
      format === "tailwind"
        ? `    return (\n      <div className="relative">\n${inner}\n      </div>\n    );`
        : `    return (\n      <div style={{ position: "relative" }}>\n${inner}\n      </div>\n    );`;

    components.push(`export function ${name}() {\n${body}\n  }`);
  }

  const header =
    `// Generated by Node — design export (${format} style)\n` +
    (format === "tailwind"
      ? "// Requires Tailwind CSS.\n\n"
      : "// Self-contained inline styles.\n\n");

  return {
    code: header + components.join("\n\n") + "\n",
    componentCount: components.length,
  };
}
