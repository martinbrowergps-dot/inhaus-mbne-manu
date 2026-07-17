/**
 * Pure PDF layout validation — no heavy deps (jsPDF, html2canvas).
 * Extracted so light consumers (ExportButton) can import without pulling
 * the full export-pdf bundle into the static chunk.
 */
import type { PdfMargins } from "./pdf-css-patch";
import { resolveMargins } from "./pdf-css-patch";

export type { PdfMargins } from "./pdf-css-patch";

export type VisualPdfQuality = "low" | "medium" | "high";

export interface PdfLayoutOptions {
  margins?: Partial<PdfMargins>;
  showHeader?: boolean;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  /** Texto pequeno impresso à esquerda do rodapé. */
  footerLeft?: string;
}

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

const PAGE_MM: Record<string, [number, number]> = {
  a4: [210, 297],
  a3: [297, 420],
  letter: [215.9, 279.4],
};

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

  const headerReserve = showHeader ? m.top + 19 : 0;
  const footerReserve = showFooter ? 6 : 0;
  const contentW = pageW - m.left - m.right;
  const contentH = pageH - m.top - m.bottom - headerReserve - footerReserve;
  const marginTotalV = m.top + m.bottom;
  const marginTotalH = m.left + m.right;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (marginTotalV >= pageH - 10) {
    errors.push(
      `Margens verticais (${marginTotalV}mm) ocupam quase toda a página (${pageH}mm). Reduza topo/inferior.`,
    );
  }
  if (marginTotalH >= pageW - 20) {
    errors.push(
      `Margens horizontais (${marginTotalH}mm) ocupam quase toda a largura (${pageW}mm). Reduza laterais.`,
    );
  }
  if (contentH < 20) {
    errors.push(
      `Altura útil insuficiente (${contentH.toFixed(0)}mm). Reduza margens ou desative cabeçalho/rodapé.`,
    );
  }
  if (contentW < 40) {
    errors.push(`Largura útil insuficiente (${contentW.toFixed(0)}mm). Reduza margens laterais.`);
  }
  if (contentH < 40 && contentH >= 20) {
    warnings.push(`Altura útil baixa (${contentH.toFixed(0)}mm). Conteúdo pode ficar apertado.`);
  }
  if (headerReserve > pageH * 0.4) {
    warnings.push(
      `Cabeçalho ocupa ${headerReserve}mm (${((headerReserve / pageH) * 100).toFixed(0)}% da página).`,
    );
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
