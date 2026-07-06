import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";
import type { CsvColumn } from "./export-csv";

const COLOR_OVERRIDES: Record<string, string> = {
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

function stripModern(str: string): string {
  return str.replace(OKLCH_RE, OKLCH_FALLBACK).replace(OKLAB_RE, OKLCH_FALLBACK);
}

function installLiveOverride(): () => void {
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
  styleEl.setAttribute("data-pdf-live-override", "true");
  styleEl.textContent = [
    `.glass, .panel-glass { backdrop-filter: none !important; background: #ffffff !important; }`,
    `.panel { isolation: auto !important; }`,
  ].join("\n");
  document.head.appendChild(styleEl);
  restored.push(() => { styleEl.remove(); });
  return () => { restored.forEach((fn) => fn()); };
}

function sanitizeLiveInlineColors(root: HTMLElement): () => void {
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

export interface PdfLayoutOptions {
  margins?: Partial<PdfMargins>;
  showHeader?: boolean;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  /** Texto pequeno impresso à esquerda do rodapé. */
  footerLeft?: string;
}

export const DEFAULT_MARGINS: PdfMargins = { top: 10, bottom: 12, left: 10, right: 10 };

function resolveMargins(m?: Partial<PdfMargins>): PdfMargins {
  return {
    top: Math.max(5, Math.min(40, m?.top ?? DEFAULT_MARGINS.top)),
    bottom: Math.max(5, Math.min(40, m?.bottom ?? DEFAULT_MARGINS.bottom)),
    left: Math.max(5, Math.min(40, m?.left ?? DEFAULT_MARGINS.left)),
    right: Math.max(5, Math.min(40, m?.right ?? DEFAULT_MARGINS.right)),
  };
}

interface ExportTableOpts<T> {
  filename: string;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: CsvColumn<T>[];
  orientation?: "landscape" | "portrait";
  layout?: PdfLayoutOptions;
}

/**
 * Desenha o cabeçalho no topo da página respeitando `margins.top`.
 * Retorna o Y (mm) onde o conteúdo pode começar.
 */
function drawHeader(pdf: jsPDF, title: string, subtitle: string | undefined, margins: PdfMargins): number {
  const pageW = pdf.internal.pageSize.getWidth();
  let y = margins.top;
  pdf.setFontSize(9);
  pdf.setTextColor(14, 78, 138);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margins.left, y);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text(stamp, pageW - margins.right, y, { align: "right" });
  y += 2.5;
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.3);
  pdf.line(margins.left, y, pageW - margins.right, y);
  y += 2;
  pdf.setFontSize(13);
  pdf.setTextColor(2, 21, 45);
  pdf.text(title, margins.left, y + 3);
  y += 7;
  if (subtitle) {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, margins.left, y);
    y += 4;
  }
  return y + 2;
}

/** Altura reservada (em mm) para o cabeçalho, com ou sem subtítulo. */
function headerReserve(subtitle: string | undefined): number {
  return subtitle ? 18 : 14;
}

function drawFooter(
  pdf: jsPDF,
  pageIndex: number,
  pageCount: number,
  margins: PdfMargins,
  opts: { showPageNumbers: boolean; footerLeft?: string },
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const y = pageH - Math.max(4, margins.bottom / 2);
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  if (opts.footerLeft) pdf.text(opts.footerLeft, margins.left, y);
  if (opts.showPageNumbers) {
    pdf.text(`Página ${pageIndex} de ${pageCount}`, pageW - margins.right, y, { align: "right" });
  }
}

export function exportTableToPdf<T>(opts: ExportTableOpts<T>) {
  const { filename, title, subtitle, rows, columns, orientation = "landscape", layout = {} } = opts;
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const margins = resolveMargins(layout.margins);
  const showHeader = layout.showHeader !== false;
  const showFooter = layout.showFooter !== false;
  const showPageNumbers = layout.showPageNumbers !== false;
  const rowsCount = rows.length;

  const head = [columns.map((c) => c.header)];
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.value(r);
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  const topReserve = showHeader ? margins.top + headerReserve(subtitle) : margins.top;
  const bottomReserve = showFooter ? margins.bottom + 4 : margins.bottom;

  autoTable(pdf, {
    head,
    body,
    startY: topReserve,
    margin: { left: margins.left, right: margins.right, top: topReserve, bottom: bottomReserve },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.1,
    styles: {
      font: "helvetica",
      fontSize: rowsCount > 100 ? 6.5 : 7.5,
      cellPadding: 1.5,
      overflow: "linebreak",
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [14, 78, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: rowsCount > 100 ? 6.5 : 7.5,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    didDrawPage: () => {
      if (showHeader) drawHeader(pdf, title, subtitle, margins);
    },
  });

  const finalPageCount = pdf.getNumberOfPages();
  if (showFooter) {
    for (let i = 1; i <= finalPageCount; i++) {
      pdf.setPage(i);
      drawFooter(pdf, i, finalPageCount, margins, {
        showPageNumbers,
        footerLeft: layout.footerLeft ?? `Martin Brower CDNE · ${rowsCount} registros`,
      });
    }
  }

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}

function drawImagePageHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string | undefined,
  margins: PdfMargins,
): number {
  const pageW = pdf.internal.pageSize.getWidth();
  let y = margins.top + 1.5;
  pdf.setFontSize(7);
  pdf.setTextColor(14, 78, 138);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margins.left, y);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.setFontSize(5.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(stamp, pageW - margins.right, y, { align: "right" });
  y += 2;
  pdf.setFontSize(10);
  pdf.setTextColor(2, 21, 45);
  pdf.text(title, margins.left, y + 1);
  y += 3.5;
  if (subtitle) {
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, margins.left, y);
    y += 2.5;
  }
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.25);
  pdf.line(margins.left, y + 0.5, pageW - margins.right, y + 0.5);
  return y + 2.5;
}

/** Altura reservada (mm) para o cabeçalho visual — casa com drawImagePageHeader. */
function visualHeaderReserve(subtitle: string | undefined): number {
  return subtitle ? 11 : 8;
}

export type VisualPdfQuality = "low" | "medium" | "high";

export interface VisualPdfOptions extends PdfLayoutOptions {
  /** Escala do PNG (pixelRatio). Alta = mais nitidez, arquivo maior. */
  quality?: VisualPdfQuality;
  /** Override manual da escala (1–3). Sobrepõe `quality`. */
  scale?: number;
  /** Qualidade JPEG das páginas (0.5–1). Sobrepõe `quality`. */
  jpegQuality?: number;
  /** Habilita quebras inteligentes evitando cortar tabelas/gráficos. Default: true. */
  smartBreaks?: boolean;
  /** Orientação da página. Default: landscape. */
  orientation?: "landscape" | "portrait";
}

const QUALITY_PRESETS: Record<VisualPdfQuality, { scale: number; jpeg: number }> = {
  low:    { scale: 1.0, jpeg: 0.72 },
  medium: { scale: 1.5, jpeg: 0.85 },
  high:   { scale: 2.2, jpeg: 0.92 },
};

function collectBreakCandidates(root: HTMLElement): number[] {
  const rootRect = root.getBoundingClientRect();
  const sel = [
    "table",
    ".recharts-wrapper",
    ".recharts-responsive-container",
    "[data-pdf-block]",
    ".panel",
    ".kpi-card",
    "svg",
  ].join(",");
  const set = new Set<number>();
  set.add(0);
  root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height <= 0) return;
    set.add(Math.max(0, r.top - rootRect.top));
    set.add(Math.max(0, r.bottom - rootRect.top));
  });
  set.add(root.scrollHeight);
  return Array.from(set).sort((a, b) => a - b);
}

function pickSplit(cursor: number, maxHeight: number, total: number, candidates: number[]): number {
  const hardStop = Math.min(cursor + maxHeight, total);
  if (hardStop >= total) return total;
  const minStop = cursor + maxHeight * 0.55;
  let best = hardStop;
  for (const c of candidates) {
    if (c > cursor && c <= hardStop && c >= minStop) best = c;
  }
  return best;
}

/**
 * Captura o elemento como PNG (html-to-image) e pagina evitando cortes
 * em tabelas/gráficos. Suporta controle de margens, cabeçalho, rodapé,
 * numeração e escala/qualidade.
 */
export async function exportVisualPdf(
  element: HTMLElement,
  filename: string,
  title: string,
  subtitle?: string,
  options: VisualPdfOptions = {},
) {
  const preset = QUALITY_PRESETS[options.quality ?? "medium"];
  const scale = Math.max(0.8, Math.min(3, options.scale ?? preset.scale));
  const jpegQuality = Math.max(0.5, Math.min(1, options.jpegQuality ?? preset.jpeg));
  const smartBreaks = options.smartBreaks !== false;
  const showHeader = options.showHeader !== false;
  const showFooter = options.showFooter !== false;
  const showPageNumbers = options.showPageNumbers !== false;
  const margins = resolveMargins(options.margins);
  const orientation = options.orientation ?? "landscape";

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margins.left - margins.right;
  const headerH = showHeader ? visualHeaderReserve(subtitle) : 0;
  const footerH = showFooter ? 6 : 0;
  const contentH = pageH - margins.top - margins.bottom - headerH - footerH;
  if (contentH < 20 || contentW < 40) {
    throw new Error("Margens muito grandes: reduza para caber conteúdo");
  }

  const cleanLiveOverride = installLiveOverride();
  const cleanLiveInline = sanitizeLiveInlineColors(element);
  const candidatesCss = smartBreaks ? collectBreakCandidates(element) : [];

  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  cleanLiveOverride();
  cleanLiveInline();

  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const cssW = imgW / scale;
  const cssH = imgH / scale;
  const pxPerMm = cssW / contentW;
  const pageCssH = Math.floor(contentH * pxPerMm);
  if (pageCssH < 1) throw new Error("Altura útil da página muito pequena");

  const cuts: number[] = [0];
  let cursor = 0;
  const guard = 500;
  let iter = 0;
  while (cursor < cssH && iter++ < guard) {
    const next = smartBreaks
      ? pickSplit(cursor, pageCssH, cssH, candidatesCss)
      : Math.min(cursor + pageCssH, cssH);
    if (next <= cursor) break;
    cuts.push(next);
    cursor = next;
  }
  if (cuts[cuts.length - 1] < cssH) cuts.push(cssH);

  const sliceCanvas = document.createElement("canvas");
  const ctx = sliceCanvas.getContext("2d")!;

  for (let i = 0; i < cuts.length - 1; i++) {
    if (i > 0) pdf.addPage();
    const imgStartY = showHeader
      ? drawImagePageHeader(pdf, title, subtitle, margins)
      : margins.top;

    const sy = Math.round(cuts[i] * scale);
    const sh = Math.round((cuts[i + 1] - cuts[i]) * scale);
    if (sh <= 0) continue;

    sliceCanvas.width = imgW;
    sliceCanvas.height = sh;
    ctx.drawImage(img, 0, sy, imgW, sh, 0, 0, imgW, sh);

    const pageDataUrl = sliceCanvas.toDataURL("image/jpeg", jpegQuality);
    const imgMmH = sh / (pxPerMm * scale);
    // Trava a altura no espaço disponível para nunca invadir o rodapé.
    const availH = pageH - imgStartY - margins.bottom - footerH;
    const finalH = Math.min(imgMmH, availH);
    pdf.addImage(pageDataUrl, "JPEG", margins.left, imgStartY, contentW, finalH);
  }

  sliceCanvas.width = 0;
  sliceCanvas.height = 0;

  if (showFooter) {
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      drawFooter(pdf, i, pageCount, margins, {
        showPageNumbers,
        footerLeft: options.footerLeft ?? "Martin Brower CDNE",
      });
    }
  }

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}



