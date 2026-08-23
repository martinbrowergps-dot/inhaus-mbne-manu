/**
 * CSS patching utilities for PDF export.
 *
 * html2canvas and html-to-image do NOT support modern CSS color functions
 * such as oklch() and oklab(). This module provides:
 *  - COLOR_OVERRIDES mapping CSS custom properties → hex fallbacks
 *  - installLiveOverride()  patches the live DOM before capture
 *  - sanitizeInlineColors() patches inline style/fill/stroke on a subtree
 *  - stripModern()          replaces oklch/oklab in a string with a hex fallback
 *  - PdfMargins / resolveMargins / DEFAULT_MARGINS
 */

export const COLOR_OVERRIDES: Record<string, string> = {
  "--background": "#02152D",
  "--foreground": "#E0F7FF",
  "--card": "#05254A",
  "--card-foreground": "#FFFFFF",
  "--popover": "#05254A",
  "--popover-foreground": "#E0F7FF",
  "--primary": "#0EA5FF",
  "--primary-foreground": "#02152D",
  "--secondary": "#05254A",
  "--secondary-foreground": "#FFFFFF",
  "--muted": "#0A3A55",
  "--muted-foreground": "#93C5D8",
  "--accent": "#0EA5FF",
  "--accent-foreground": "#FFFFFF",
  "--destructive": "#EF4444",
  "--destructive-foreground": "#FFFFFF",
  "--success": "#10B981",
  "--success-foreground": "#02152D",
  "--warning": "#F59E0B",
  "--warning-foreground": "#02152D",
  "--border": "rgba(14, 165, 255, 0.12)",
  "--input": "#0A3A55",
  "--ring": "#0EA5FF",
  "--sidebar": "#02152D",
  "--sidebar-foreground": "#B8D9E8",
  "--sidebar-primary": "#0EA5FF",
  "--sidebar-primary-foreground": "#02152D",
  "--sidebar-accent": "#0A3A55",
  "--sidebar-accent-foreground": "#E0F7FF",
  "--sidebar-border": "rgba(14, 165, 255, 0.12)",
  "--sidebar-ring": "#0EA5FF",
  "--chart-1": "#0EA5FF",
  "--chart-2": "#10B981",
  "--chart-3": "#F59E0B",
  "--chart-4": "#EF4444",
  "--chart-5": "#A855F7",
};

const OKLCH_FALLBACK = "#0EA5FF";
const OKLCH_RE = /oklch\([^)]*\)/gi;
const OKLAB_RE = /oklab\([^)]*\)/gi;

export function stripModern(str: string): string {
  return str.replace(OKLCH_RE, OKLCH_FALLBACK).replace(OKLAB_RE, OKLCH_FALLBACK);
}

export function installLiveOverride(tag?: string): () => void {
  const root = document.documentElement;
  const restored: Array<() => void> = [];
  for (const [key, value] of Object.entries(COLOR_OVERRIDES)) {
    const prev = root.style.getPropertyValue(key);
    const priority = root.style.getPropertyPriority(key);
    root.style.setProperty(key, value, "important");
    restored.push(() => {
      if (prev) root.style.setProperty(key, prev, priority);
      else root.style.removeProperty(key);
    });
  }
  const styleEl = document.createElement("style");
  const attr = tag ?? "pdf-override";
  styleEl.setAttribute(`data-${attr}`, "true");
  styleEl.textContent = [
    `.glass, .panel-glass { backdrop-filter: none !important; background: #05254A !important; }`,
    `.panel { background: #05254A !important; isolation: auto !important; }`,
  ].join("\n");
  document.head.appendChild(styleEl);
  restored.push(() => {
    styleEl.remove();
  });
  return () => {
    restored.forEach((fn) => fn());
  };
}

export function sanitizeInlineColors(root: HTMLElement): () => void {
  const restores: Array<() => void> = [];
  const all = root.querySelectorAll<HTMLElement>("*");
  const check = (val: string | null) => val && (val.includes("oklch(") || val.includes("oklab("));
  all.forEach((el) => {
    const inline = el.getAttribute("style");
    if (check(inline)) {
      const orig = inline!;
      el.setAttribute("style", stripModern(orig));
      restores.push(() => el.setAttribute("style", orig));
    }
    const fill = el.getAttribute("fill");
    if (check(fill)) {
      const orig = fill!;
      el.setAttribute("fill", stripModern(orig));
      restores.push(() => el.setAttribute("fill", orig));
    }
    const stroke = el.getAttribute("stroke");
    if (check(stroke)) {
      const orig = stroke!;
      el.setAttribute("stroke", stripModern(orig));
      restores.push(() => el.setAttribute("stroke", orig));
    }
  });
  return () => restores.forEach((fn) => fn());
}

export interface PdfMargins {
  top: number; // mm
  bottom: number; // mm
  left: number; // mm
  right: number; // mm
}

export const DEFAULT_MARGINS: PdfMargins = { top: 10, bottom: 12, left: 10, right: 10 };

export function resolveMargins(m?: Partial<PdfMargins>): PdfMargins {
  return {
    top: Math.max(5, Math.min(40, m?.top ?? DEFAULT_MARGINS.top)),
    bottom: Math.max(5, Math.min(40, m?.bottom ?? DEFAULT_MARGINS.bottom)),
    left: Math.max(5, Math.min(40, m?.left ?? DEFAULT_MARGINS.left)),
    right: Math.max(5, Math.min(40, m?.right ?? DEFAULT_MARGINS.right)),
  };
}

export interface VisualPdfQualityOptions {
  scale: number;
  jpeg: number;
}

export type VisualPdfQuality = "low" | "medium" | "high";

export const QUALITY_PRESETS: Record<VisualPdfQuality, VisualPdfQualityOptions> = {
  low: { scale: 1.0, jpeg: 0.72 },
  medium: { scale: 1.5, jpeg: 0.85 },
  high: { scale: 2.2, jpeg: 0.92 },
};
