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
  "--background": "#082F49",
  "--foreground": "#E0F7FF",
  "--card": "#0C4A6E",
  "--card-foreground": "#FFFFFF",
  "--popover": "#0C4A6E",
  "--popover-foreground": "#E0F7FF",
  "--primary": "#06B6D4",
  "--primary-foreground": "#042033",
  "--secondary": "#0E5A82",
  "--secondary-foreground": "#FFFFFF",
  "--muted": "#0A3A55",
  "--muted-foreground": "#93C5D8",
  "--accent": "#115E83",
  "--accent-foreground": "#FFFFFF",
  "--destructive": "#EF4444",
  "--destructive-foreground": "#FFFFFF",
  "--success": "#10B981",
  "--success-foreground": "#042033",
  "--warning": "#F59E0B",
  "--warning-foreground": "#042033",
  "--border": "rgba(6, 182, 212, 0.12)",
  "--input": "#0A3A55",
  "--ring": "#06B6D4",
  "--sidebar": "#042033",
  "--sidebar-foreground": "#B8D9E8",
  "--sidebar-primary": "#06B6D4",
  "--sidebar-primary-foreground": "#042033",
  "--sidebar-accent": "#0A3A55",
  "--sidebar-accent-foreground": "#E0F7FF",
  "--sidebar-border": "rgba(6, 182, 212, 0.12)",
  "--sidebar-ring": "#06B6D4",
  "--chart-1": "#06B6D4",
  "--chart-2": "#10B981",
  "--chart-3": "#F59E0B",
  "--chart-4": "#EF4444",
  "--chart-5": "#A855F7",
};

const OKLCH_FALLBACK = "#06B6D4";
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
    `.glass, .panel-glass { backdrop-filter: none !important; background: #0C4A6E !important; }`,
    `.panel { isolation: auto !important; }`,
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
