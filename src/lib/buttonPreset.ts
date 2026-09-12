// Button component preset — composes a real button (auto-layout frame +
// centered label) from renderer-supported primitives, so it behaves exactly
// like a hand-drawn button: editable text, auto-layout padding, recolorable.

import type { DesignNode } from "./geo";
import { defaultNode, uid } from "./geo";

export interface ButtonVariant {
  id: string;
  label: string;
  bg: string;
  fg: string;
  border: string | null;
  radius: number;
}

export const BUTTON_VARIANTS: ButtonVariant[] = [
  { id: "primary", label: "Primary", bg: "#8b5cf6", fg: "#ffffff", border: null, radius: 10 },
  { id: "secondary", label: "Secondary", bg: "#26262e", fg: "#f4f4f5", border: null, radius: 10 },
  { id: "outline", label: "Outline", bg: "transparent", fg: "#e4e4e7", border: "#3f3f46", radius: 10 },
  { id: "danger", label: "Danger", bg: "#ef4444", fg: "#ffffff", border: null, radius: 10 },
];

/**
 * Build the node pair for a button. Returns [frame, label] with the label
 * centered inside the frame via frame auto layout (row + padding), so
 * dragging the frame keeps the label locked to center.
 */
export function buildButtonNodes(
  opts: {
    text?: string;
    x?: number;
    y?: number;
    variant?: string;
    w?: number;
    h?: number;
  } = {},
): DesignNode[] {
  const variant =
    BUTTON_VARIANTS.find((v) => v.id === opts.variant) ?? BUTTON_VARIANTS[0];
  const text = opts.text ?? "Button";
  const w = Math.max(64, opts.w ?? 128);
  const h = Math.max(32, opts.h ?? 40);
  const x = opts.x ?? 0;
  const y = opts.y ?? 0;

  const fontSize = h >= 48 ? 18 : 14;
  const labelW = Math.max(24, Math.round(text.length * fontSize * 0.58));

  const frame = defaultNode("frame", x, y);
  frame.id = uid("btn");
  frame.name = `Button / ${variant.label}`;
  frame.w = w;
  frame.h = h;
  frame.fill = variant.bg === "transparent" ? null : variant.bg;
  frame.stroke = variant.border;
  frame.strokeWidth = variant.border ? 1 : 0;
  frame.radius = variant.radius;
  // Row auto layout: padding is the leading gap, so size it to center the
  // label horizontally; vertical centering is handled by the layout itself.
  frame.layout = { mode: "row", gap: 8, padding: Math.max(8, Math.round((w - labelW) / 2)) };

  const label = defaultNode("text", x, y);
  label.id = uid("btnl");
  label.name = "Label";
  label.w = labelW;
  label.h = Math.round(fontSize * 1.25);
  label.fill = null;
  label.text = text;
  label.fontSize = fontSize;
  label.fontWeight = 600;
  label.color = variant.fg;
  label.align = "center";

  return [frame, label];
}
