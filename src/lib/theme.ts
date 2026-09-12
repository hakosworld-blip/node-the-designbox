// App theme: light/dark mode plus an editor canvas preference. Persisted to
// localStorage; applied by toggling the `dark` class on <html>.

import { create } from "zustand";

export type ThemeMode = "light" | "dark";
/** Canvas surface: "theme" follows app mode, or force white/black. */
export type CanvasPref = "theme" | "white" | "black";

const THEME_KEY = "node.theme";
const CANVAS_KEY = "node.canvas";

function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage unavailable */
  }
  return "dark";
}

function readCanvas(): CanvasPref {
  try {
    const v = localStorage.getItem(CANVAS_KEY);
    if (v === "theme" || v === "white" || v === "black") return v;
  } catch {
    /* storage unavailable */
  }
  // Default: white canvas (Figma-style), switchable back to dark in settings.
  return "white";
}

interface ThemeState {
  mode: ThemeMode;
  canvas: CanvasPref;
  setMode: (m: ThemeMode) => void;
  setCanvas: (c: CanvasPref) => void;
  toggle: () => void;
}

function applyMode(mode: ThemeMode) {
  try {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* noop */
  }
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: readTheme(),
  canvas: readCanvas(),
  setMode: (m) => {
    applyMode(m);
    set({ mode: m });
  },
  setCanvas: (c) => {
    try {
      localStorage.setItem(CANVAS_KEY, c);
    } catch {
      /* noop */
    }
    set({ canvas: c });
  },
  toggle: () => get().setMode(get().mode === "dark" ? "light" : "dark"),
}));

/** Call once at app bootstrap to sync <html> with the stored preference. */
export function initTheme(): void {
  applyMode(readTheme());
}

/** Effective canvas background for the editor. */
export function canvasBackground(
  mode: ThemeMode,
  pref: CanvasPref,
): string {
  if (pref === "white") return "#ffffff";
  if (pref === "black") return "#101012";
  return mode === "dark" ? "#101012" : "#ffffff";
}
