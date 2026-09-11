/**
 * Figma-style device frame presets. The editor offers these when the Frame
 * tool is active so users can stamp exact device sizes instead of dragging.
 */

export interface FramePreset {
  id: string;
  label: string;
  w: number;
  h: number;
  group: "Phone" | "Tablet" | "Desktop";
}

export const FRAME_PRESETS: FramePreset[] = [
  { id: "iphone-15-pro", label: "iPhone 15 Pro", w: 393, h: 852, group: "Phone" },
  { id: "iphone-se", label: "iPhone SE", w: 375, h: 667, group: "Phone" },
  { id: "pixel-8", label: "Pixel 8", w: 412, h: 915, group: "Phone" },
  { id: "ipad-mini", label: "iPad Mini", w: 744, h: 1133, group: "Tablet" },
  { id: "ipad-pro-11", label: "iPad Pro 11", w: 834, h: 1194, group: "Tablet" },
  { id: "macbook-air", label: "MacBook Air", w: 1280, h: 800, group: "Desktop" },
  { id: "desktop-1920", label: "Desktop 1920", w: 1920, h: 1080, group: "Desktop" },
];

export const DEFAULT_FRAME_PRESETS = FRAME_PRESETS;
