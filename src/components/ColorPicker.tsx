// Full-featured color picker: saturation/value area, hue + alpha sliders,
// hex field, EyeDropper API support, and quick swatches. Zero new deps —
// built on native range inputs so it inherits the app's slider styling.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- color space helpers ---------------- */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  h = h.slice(0, 6);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/* ---------------- component ---------------- */

export interface ColorPickerProps {
  value: string; // hex (#rgb, #rrggbb, or #rrggbbaa)
  onChange: (hex: string) => void;
  swatches?: string[];
  compact?: boolean;
  className?: string;
}

export function ColorPicker({
  value,
  onChange,
  swatches = [],
  compact = false,
  className,
}: ColorPickerProps) {
  const parsed = useMemo(() => hexToRgb(value), [value]);
  const alpha = useMemo(() => {
    const m = /^#[0-9a-f]{8}$/i.exec(value.trim());
    return m ? parseInt(value.slice(7, 9), 16) / 255 : 1;
  }, [value]);

  const [hsv, setHsv] = useState(() =>
    parsed ? rgbToHsv(parsed.r, parsed.g, parsed.b) : { h: 262, s: 0.83, v: 0.96 },
  );
  const [draftHex, setDraftHex] = useState(value);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  // External value changes (undo, AI, collab) resync the sliders.
  useEffect(() => {
    const p = hexToRgb(value);
    if (p) setHsv(rgbToHsv(p.r, p.g, p.b));
    setDraftHex(value);
  }, [value]);

  const emit = useCallback(
    (h: number, s: number, v: number, a: number) => {
      const { r, g, b } = hsvToRgb(h, s, v);
      const hex = rgbToHex(r, g, b);
      onChange(a >= 1 ? hex : `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`);
    },
    [onChange],
  );

  const handleArea = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      const el = areaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const vv = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
      setHsv((prev) => {
        const next = { ...prev, s, v: vv };
        emit(next.h, next.s, next.v, alpha);
        return next;
      });
    },
    [alpha, emit],
  );

  useEffect(() => {
    if (!dragging.current) return;
    const move = (e: PointerEvent) => handleArea(e);
    const up = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging.current, handleArea]);

  const supportsEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in window;

  const pickFromScreen = async () => {
    if (!supportsEyeDropper) return;
    try {
      const EyeDropperCtor = (
        window as unknown as {
          EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
        }
      ).EyeDropper;
      if (!EyeDropperCtor) return;
      const result = await new EyeDropperCtor().open();
      onChange(result.sRGBHex);
    } catch {
      // user cancelled
    }
  };

  const svBg = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hsvToRgb(hsv.h, 1, 1) && `hsl(${hsv.h} 100% 50%)`}`;

  return (
    <div className={cn("space-y-2.5", className)}>
      {/* SV gradient area */}
      <div
        ref={areaRef}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuetext={value}
        tabIndex={0}
        className="relative h-32 w-full cursor-crosshair touch-none overflow-hidden rounded-lg border border-white/10"
        style={{ background: svBg }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          dragging.current = true;
          handleArea(e);
        }}
      >
        <div
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: value,
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(hsv.h)}
          aria-label="Hue"
          className="h-2.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow"
          style={{
            background:
              "linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)",
          }}
          onChange={(e) => {
            const h = Number(e.target.value);
            setHsv((prev) => {
              const next = { ...prev, h };
              emit(h, next.s, next.v, alpha);
              return next;
            });
          }}
        />
      </div>

      {/* Alpha slider */}
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-full rounded-full border border-white/10"
          style={{
            background:
              "linear-gradient(to right, transparent, " +
              (() => {
                const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
                return rgbToHex(r, g, b);
              })() +
              ")"
          }}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(alpha * 100)}
            aria-label="Opacity"
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-transparent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow"
            onChange={(e) => {
              const a = Number(e.target.value) / 100;
              emit(hsv.h, hsv.s, hsv.v, a);
            }}
          />
        </div>
        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-zinc-500">
          {Math.round(alpha * 100)}%
        </span>
      </div>

      {/* Hex + eyedropper */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-7 flex-1 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2">
          <span
            className="size-3.5 shrink-0 rounded-sm border border-white/20"
            style={{ background: value }}
          />
          <input
            value={draftHex}
            onChange={(e) => {
              setDraftHex(e.target.value);
              const p = hexToRgb(e.target.value);
              if (p) {
                setHsv(rgbToHsv(p.r, p.g, p.b));
                onChange(e.target.value.trim().toLowerCase());
              }
            }}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-[11px] text-zinc-200 outline-none"
            placeholder="#8b5cf6"
          />
        </div>
        {supportsEyeDropper && (
          <button
            className="rounded-md border border-white/10 p-1.5 text-zinc-400 transition-colors hover:border-violet-400/40 hover:text-violet-300"
            title="Pick color from screen"
            onClick={pickFromScreen}
          >
            <Pipette className="size-3.5" />
          </button>
        )}
      </div>

      {/* Swatches */}
      {swatches.length > 0 && (
        <div className={cn("grid gap-1", compact ? "grid-cols-8" : "grid-cols-6")}>
          {swatches.map((c) => (
            <button
              key={c}
              className={cn(
                "size-5 rounded border border-white/15 transition-transform hover:scale-110",
                value.toLowerCase() === c.toLowerCase() && "ring-2 ring-violet-400",
              )}
              style={{ backgroundColor: c }}
              title={c}
              onClick={() => onChange(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
