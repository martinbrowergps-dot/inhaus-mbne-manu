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
  "--background": "#ffffff",
  "--foreground": "#0f172a",
  "--card": "#ffffff",
  "--card-foreground": "#0f172a",
  "--popover": "#ffffff",
  "--popover-foreground": "#0f172a",
  "--primary": "#0ea5ff",
  "--primary-foreground": "#ffffff",
  "--secondary": "#f1f5f9",
  "--secondary-foreground": "#0f172a",
  "--muted": "#f1f5f9",
  "--muted-foreground": "#64748b",
  "--accent": "#e0f2fe",
  "--accent-foreground": "#0f172a",
  "--destructive": "#ef4444",
  "--destructive-foreground": "#ffffff",
  "--success": "#22c55e",
  "--success-foreground": "#ffffff",
  "--warning": "#eab308",
  "--warning-foreground": "#0f172a",
  "--border": "#e2e8f0",
  "--input": "#e2e8f0",
  "--ring": "#0ea5ff",
  "--sidebar": "#f8fafc",
  "--sidebar-foreground": "#0f172a",
  "--sidebar-primary": "#0ea5ff",
  "--sidebar-primary-foreground": "#ffffff",
  "--sidebar-accent": "#e0f2fe",
  "--sidebar-accent-foreground": "#0f172a",
  "--sidebar-border": "#e2e8f0",
  "--sidebar-ring": "#0ea5ff",
  "--chart-1": "#0ea5ff",
  "--chart-2": "#22c55e",
  "--chart-3": "#eab308",
  "--chart-4": "#ef4444",
  "--chart-5": "#8b5cf6",
};

const OKLCH_FALLBACK = "#0ea5ff";
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
    `.glass, .panel-glass { backdrop-filter: none !important; background: #ffffff !important; }`,
    `.panel { isolation: auto !important; }`,
  ].join("\n");
  document.head.appendChild(styleEl);
  restored.push(() => { styleEl.remove(); });
  return () => { restored.forEach((fn) => fn()); };
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
  top: number;    // mm
  bottom: number; // mm
  left: number;   // mm
  right: number;  // mm
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
