import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";
import type { CsvColumn } from "./export-csv";
import {
  installLiveOverride,
  sanitizeInlineColors,
  resolveMargins,
  type PdfMargins,
} from "./pdf-css-patch";

export type { PdfMargins } from "./pdf-css-patch";
export { DEFAULT_MARGINS, resolveMargins } from "./pdf-css-patch";

export interface PdfLayoutOptions {
  margins?: Partial<PdfMargins>;
  showHeader?: boolean;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  /** Texto pequeno impresso à esquerda do rodapé. */
  footerLeft?: string;
}

// ─── Layout validation ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    pageHeight: number;
    pageWidth: number;
    contentW: number;
    contentH: number;
    headerReserve: number;
    footerReserve: number;
    marginTotalV: number;
    marginTotalH: number;
  };
}

const PAGE_MM: Record<string, [number, number]> = { a4: [210, 297], a3: [297, 420], letter: [215.9, 279.4] };

export function validateLayout(
  orientation: "portrait" | "landscape",
  margins: PdfMargins,
  opts: { showHeader?: boolean; showFooter?: boolean; format?: string },
): ValidationResult {
  const fmt = opts.format ?? "a4";
  const [pw, ph] = PAGE_MM[fmt] ?? PAGE_MM.a4;
  const pageW = orientation === "landscape" ? ph : pw;
  const pageH = orientation === "landscape" ? pw : ph;
  const m = resolveMargins(margins);
  const showHeader = opts.showHeader !== false;
  const showFooter = opts.showFooter !== false;

  const headerReserve = showHeader ? (m.top + 19) : 0;
  const footerReserve = showFooter ? 6 : 0;
  const contentW = pageW - m.left - m.right;
  const contentH = pageH - m.top - m.bottom - headerReserve - footerReserve;
  const marginTotalV = m.top + m.bottom;
  const marginTotalH = m.left + m.right;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (marginTotalV >= pageH - 10) {
    errors.push(`Margens verticais (${marginTotalV}mm) ocupam quase toda a página (${pageH}mm). Reduza topo/inferior.`);
  }
  if (marginTotalH >= pageW - 20) {
    errors.push(`Margens horizontais (${marginTotalH}mm) ocupam quase toda a largura (${pageW}mm). Reduza laterais.`);
  }
  if (contentH < 20) {
    errors.push(`Altura útil insuficiente (${contentH.toFixed(0)}mm). Reduza margens ou desative cabeçalho/rodapé.`);
  }
  if (contentW < 40) {
    errors.push(`Largura útil insuficiente (${contentW.toFixed(0)}mm). Reduza margens laterais.`);
  }
  if (contentH < 40 && contentH >= 20) {
    warnings.push(`Altura útil baixa (${contentH.toFixed(0)}mm). Conteúdo pode ficar apertado.`);
  }
  if (headerReserve > pageH * 0.4) {
    warnings.push(`Cabeçalho ocupa ${headerReserve}mm (${(headerReserve / pageH * 100).toFixed(0)}% da página).`);
  }
  if (m.top < 8) {
    warnings.push(`Margem superior muito pequena (${m.top}mm). Cabeçalho pode ficar cortado.`);
  }
  if (m.bottom < 8) {
    warnings.push(`Margem inferior muito pequena (${m.bottom}mm). Rodapé pode ficar cortado.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      pageHeight: pageH,
      pageWidth: pageW,
      contentW: Math.max(0, contentW),
      contentH: Math.max(0, contentH),
      headerReserve,
      footerReserve,
      marginTotalV,
      marginTotalH,
    },
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
  const margins = resolveMargins(layout.margins);
  const showHeader = layout.showHeader !== false;
  const showFooter = layout.showFooter !== false;
  const showPageNumbers = layout.showPageNumbers !== false;
  const rowsCount = rows.length;

  const val = validateLayout(orientation, margins, { showHeader, showFooter });
  if (!val.valid) {
    const msg = val.errors.join(". ");
    throw new Error(`Layout inválido: ${msg}`);
  }
  if (val.warnings.length > 0) {
    console.warn(`[exportTableToPdf] Avisos de layout:\n${val.warnings.join("\n")}`);
  }

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

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

  const val = validateLayout(orientation, margins, { showHeader, showFooter });
  if (!val.valid) {
    const msg = val.errors.join(". ");
    throw new Error(`Layout inválido: ${msg}`);
  }
  if (val.warnings.length > 0) {
    console.warn(`[exportVisualPdf] Avisos de layout:\n${val.warnings.join("\n")}`);
  }

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margins.left - margins.right;
  const headerH = showHeader ? visualHeaderReserve(subtitle) : 0;
  const footerH = showFooter ? 6 : 0;
  const contentH = pageH - margins.top - margins.bottom - headerH - footerH;

  const cleanLiveOverride = installLiveOverride();
  const cleanLiveInline = sanitizeInlineColors(element);
  const candidatesCss = smartBreaks ? collectBreakCandidates(element) : [];

  let dataUrl: string;
  try {
    dataUrl = await toPng(element, {
      pixelRatio: scale,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
  } finally {
    cleanLiveOverride();
    cleanLiveInline();
  }

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



