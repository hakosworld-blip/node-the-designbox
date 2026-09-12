// Design lint — adapted from OpenPencil's `openpencil lint` CLI
// (upstream/packages/core/src/tools/analyze + lint presets): static analysis
// of a DesignDoc for naming, contrast/accessibility, layout, and structure
// issues. Pure functions, no DOM.

import type { DesignDoc, DesignNode } from "./geo";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  rule: string;
  severity: LintSeverity;
  nodeId?: string;
  nodeName?: string;
  message: string;
  // Optional concrete suggestion the UI can offer as a one-click fix.
  fix?: Partial<DesignNode>;
}

export interface LintResult {
  issues: LintIssue[];
  checked: number;
}

const GENERIC_NAMES = [
  "rect",
  "rectangle",
  "ellipse",
  "frame",
  "text",
  "line",
  "arrow",
  "polygon",
  "image",
  "group",
  "untitled",
  "layer",
];

function isGenericName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return GENERIC_NAMES.includes(n) || /^\d+$/.test(n);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two css colors (hex only). */
export function contrastRatio(a: string, b: string): number | null {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Hex alpha (#rrggbbaa) → opacity 0..1; opaque colors → 1. */
function hexAlpha(hex: string): number {
  const m = /^#[0-9a-f]{8}$/i.exec(hex.trim());
  return m ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
}

export function lintDoc(doc: DesignDoc): LintResult {
  const issues: LintIssue[] = [];
  let checked = 0;

  for (const page of doc.pages) {
    const nodes = page.nodes;
    checked += nodes.length;

    for (const n of nodes) {
      if (n.hidden) continue;

      // --- naming: generic auto-names reduce handoff clarity ---
      if (isGenericName(n.name)) {
        issues.push({
          rule: "naming/generic-name",
          severity: "info",
          nodeId: n.id,
          nodeName: n.name,
          message: `"${n.name}" uses a generic name — rename it so collaborators and code export stay readable.`,
          fix: { name: n.type === "text" ? n.text?.slice(0, 24) || "Label" : suggestName(n) },
        });
      }

      // --- text: contrast against the fill behind it (WCAG AA) ---
      if (n.type === "text" && n.color) {
        const bg = backgroundColorBehind(nodes, n);
        if (bg) {
          const ratio = contrastRatio(n.color, bg);
          // Alpha-composited text colors are approximations; only flag solid hex.
          if (ratio !== null && hexAlpha(n.color) === 1 && hexAlpha(bg) === 1) {
            const large = (n.fontSize ?? 16) >= 24 || (n.fontSize ?? 16) >= 18.66 && (n.fontWeight ?? 400) >= 700;
            const min = large ? 3 : 4.5;
            if (ratio < min) {
              issues.push({
                rule: "a11y/contrast",
                severity: "warning",
                nodeId: n.id,
                nodeName: n.name,
                message: `Text contrast ${ratio.toFixed(2)}:1 on ${bg} is below WCAG AA (${min}:1).`,
              });
            }
          }
        }
      }

      // --- layout: text overflow risk (box far narrower than the text needs) ---
      if (n.type === "text" && n.text && n.w > 0) {
        const charW = (n.fontSize ?? 16) * 0.55;
        const needed = n.text.length * charW;
        const lines = Math.max(1, Math.ceil(needed / n.w));
        const neededH = lines * (n.fontSize ?? 16) * 1.25;
        if (neededH > n.h * 1.6 && n.h > 0) {
          issues.push({
            rule: "layout/text-overflow",
            severity: "warning",
            nodeId: n.id,
            nodeName: n.name,
            message: `Text likely overflows its box (needs ~${Math.round(neededH)}px, box is ${Math.round(n.h)}px tall).`,
          });
        }
      }

      // --- layout: zero-size shapes ---
      if (n.type !== "text" && n.type !== "line" && n.type !== "arrow") {
        if (n.w <= 0 || n.h <= 0) {
          issues.push({
            rule: "layout/zero-size",
            severity: "error",
            nodeId: n.id,
            nodeName: n.name,
            message: `${n.type} has zero width or height and won't render.`,
          });
        }
      }

      // --- opacity: fully transparent nodes are invisible ---
      if (n.opacity <= 0.01) {
        issues.push({
          rule: "layout/invisible",
          severity: "warning",
          nodeId: n.id,
          nodeName: n.name,
          message: `"${n.name}" is fully transparent (opacity 0) — invisible on canvas and in export.`,
        });
      }
    }

    // --- structure: exact duplicates stacked at the same position ---
    const seen = new Map<string, DesignNode>();
    for (const n of nodes) {
      const key = `${n.type}|${n.x}|${n.y}|${n.w}|${n.h}|${n.fill ?? ""}|${n.text ?? ""}`;
      const prev = seen.get(key);
      if (prev) {
        issues.push({
          rule: "structure/duplicate",
          severity: "warning",
          nodeId: n.id,
          nodeName: n.name,
          message: `"${n.name}" exactly duplicates "${prev.name}" (same type, position, size, and fill).`,
        });
      } else {
        seen.set(key, n);
      }
    }
  }

  return { issues, checked };
}

function suggestName(n: DesignNode): string {
  switch (n.type) {
    case "frame":
      return "Section";
    case "ellipse":
      return "Avatar";
    case "line":
    case "arrow":
      return "Connector";
    case "polygon":
      return "Badge";
    case "image":
      return "Photo";
    default:
      return "Surface";
  }
}

/** Best-effort background color directly behind a text node (topmost shape
 * whose bounds contain the text's top-left corner). */
function backgroundColorBehind(
  nodes: DesignNode[],
  text: DesignNode,
): string | null {
  let best: DesignNode | null = null;
  for (const n of nodes) {
    if (n.id === text.id || n.hidden) continue;
    if (n.type === "text" || n.type === "line" || n.type === "arrow") continue;
    if (!n.fill) continue;
    const contains =
      text.x >= n.x &&
      text.y >= n.y &&
      text.x + text.w <= n.x + n.w + 1 &&
      text.y + text.h <= n.y + n.h + 1;
    if (contains && (!best || nodes.indexOf(n) > nodes.indexOf(best))) best = n;
  }
  return best?.fill ?? null;
}

export const LINT_RULE_LABELS: Record<string, string> = {
  "naming/generic-name": "Generic layer name",
  "a11y/contrast": "Low text contrast",
  "layout/text-overflow": "Possible text overflow",
  "layout/zero-size": "Zero-size shape",
  "layout/invisible": "Invisible (opacity 0)",
  "structure/duplicate": "Exact duplicate",
};

export const SEVERITY_ORDER: Record<LintSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};
