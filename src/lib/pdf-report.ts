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
import { waitForChartsReady } from "./chart-utils";
import { validateLayout, type PdfLayoutOptions } from "./export-pdf";

// ─── Types ────────────────────────────────────────────────────────

export interface ReportMetric {
  label: string;
  value: string;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
}

export interface ReportTable<T = unknown> {
  title: string;
  subtitle?: string;
  columns: CsvColumn<T>[];
  rows: T[];
}

export interface ReportAderencia {
  pct: number;
  finalizadasNoPrazo: number;
  totalProgramadas: number;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  metrics: ReportMetric[];
  aderencia?: ReportAderencia;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tables: ReportTable<any>[];
}

export interface ReportOpts {
  filename: string;
  orientation?: "portrait" | "landscape";
  layout?: PdfLayoutOptions;
}

type Rgb = readonly [number, number, number];

// ─── Branding constants ────────────────────────────────────────────

const BRAND = "MARTIN BROWER · IN HAUS INDUSTRIAL";

const C: Record<string, Rgb> = {
  primary: [14, 78, 138],
  primaryLight: [14, 165, 233],
  text: [2, 21, 45],
  muted: [100, 116, 139],
  light: [241, 245, 249],
  border: [203, 213, 225],
  footer: [148, 163, 184],
  white: [255, 255, 255],
  success: [34, 197, 94],
  warning: [234, 179, 8],
  danger: [239, 68, 68],
  neutral: [100, 116, 139],
};

const VARIANT_MAP: Record<string, Rgb> = {
  primary: C.primaryLight,
  success: C.success,
  warning: C.warning,
  danger: C.danger,
  neutral: C.neutral,
};

// ─── Chart capture ─────────────────────────────────────────────────

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * html-to-image renders Recharts bars/slices fine but silently drops
 * SVG <text> labels (numbers). Fix: capture the panel normally for
 * background/title/legend/geometry, then overlay the chart SVG with
 * geometry made transparent so only the numeric labels paint on top.
 */
async function captureChartElement(element: HTMLElement): Promise<string> {
  await waitForChartsReady(element);

  const cleanInline = sanitizeInlineColors(element);
  let panelDataUrl: string;
  try {
    panelDataUrl = await toPng(element, {
      pixelRatio: 1.5,
      backgroundColor: "#0C4A6E",
      cacheBust: true,
    });
  } finally {
    cleanInline();
  }

  const svg = element.querySelector<SVGSVGElement>("svg.recharts-surface");
  if (!svg) return panelDataUrl;

  const panelRect = element.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const scale = 1.5;

  // Crop the panel's outer padding so the chart fills the image.
  const cs = window.getComputedStyle(element);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padT = parseFloat(cs.paddingTop) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;

  // Clone SVG, inline text styles, hide geometry so only labels remain.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineSvgTextStyles(clone);
  clone
    .querySelectorAll<SVGElement>("path, rect, circle, line, polygon, polyline, .recharts-sector")
    .forEach((el) => el.setAttribute("opacity", "0"));
  clone.setAttribute("width", String(Math.round(svgRect.width)));
  clone.setAttribute("height", String(Math.round(svgRect.height)));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  const encoded = btoa(unescape(encodeURIComponent(xml)));
  const svgDataUrl = `data:image/svg+xml;base64,${encoded}`;

  const panelImg = await loadImage(panelDataUrl);
  const svgImg = await loadImage(svgDataUrl);

  // Output canvas = panel minus padding, at scale.
  const outW = Math.max(1, Math.round((panelRect.width - padL - padR) * scale));
  const outH = Math.max(1, Math.round((panelRect.height - padT - padB) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return panelDataUrl;

  // Source crop region inside the full panel image.
  const sx = padL * scale;
  const sy = padT * scale;
  const sw = Math.max(1, Math.round((panelRect.width - padL - padR) * scale));
  const sh = Math.max(1, Math.round((panelRect.height - padT - padB) * scale));
  ctx.drawImage(panelImg, sx, sy, sw, sh, 0, 0, outW, outH);

  // SVG overlay: relative to panel, also shifted by padding crop.
  const offsetX = (svgRect.left - panelRect.left - padL) * scale;
  const offsetY = (svgRect.top - panelRect.top - padT) * scale;
  const svgW = svgRect.width * scale;
  const svgH = svgRect.height * scale;
  ctx.drawImage(svgImg, offsetX, offsetY, svgW, svgH);

  return canvas.toDataURL("image/png");
}

/** Inline only text-relevant computed styles so the standalone SVG labels render. */
function inlineSvgTextStyles(svg: SVGSVGElement) {
  const keep = [
    "fill",
    "stroke",
    "stroke-width",
    "font-size",
    "font-family",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "opacity",
  ];
  svg.querySelectorAll<SVGElement>("*").forEach((el) => {
    const computed = window.getComputedStyle(el);
    let style = "";
    for (const prop of keep) {
      const value = computed.getPropertyValue(prop);
      if (value) style += `${prop}:${value};`;
    }
    if (style) el.setAttribute("style", style);
  });
}

// ─── PDF building ──────────────────────────────────────────────────

function drawPageHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string | undefined,
  margins: PdfMargins,
): number {
  const pageW = pdf.internal.pageSize.getWidth();
  const m = margins;
  let y = m.top;
  pdf.setFontSize(9);
  pdf.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
  pdf.text(BRAND, m.left, y);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.setFontSize(7);
  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.text(stamp, pageW - m.right, y, { align: "right" });
  y += 5;
  pdf.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
  pdf.setLineWidth(0.3);
  pdf.line(m.left, y, pageW - m.right, y);
  y += 4;
  pdf.setFontSize(13);
  pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
  pdf.text(title, m.left, y + 4);
  y += 9;
  if (subtitle) {
    pdf.setFontSize(8);
    pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    pdf.text(subtitle, m.left, y);
    y += 5;
  }
  return y;
}

function drawFooter(
  pdf: jsPDF,
  pageNum: number,
  totalPages: number,
  margins: PdfMargins,
  opts: { showPageNumbers: boolean; extraText?: string },
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const m = margins;
  const y = pageH - Math.max(4, m.bottom / 2);
  pdf.setFontSize(6);
  pdf.setTextColor(C.footer[0], C.footer[1], C.footer[2]);
  const left = BRAND + (opts.extraText ? ` · ${opts.extraText}` : "");
  pdf.text(left, m.left, y);
  if (opts.showPageNumbers) {
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageW - m.right, y, { align: "right" });
  }
}

function drawMetrics(pdf: jsPDF, y: number, metrics: ReportMetric[], margins: PdfMargins): number {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const m = margins;
  const cols = 4;
  const gap = 3;
  const boxW = (pageW - m.left - m.right - gap * (cols - 1)) / cols;
  const boxH = 16;
  const rows = Math.ceil(metrics.length / cols);
  const totalH = rows * (boxH + gap);

  if (y + totalH > pageH - m.bottom - 4) {
    pdf.addPage();
    y = m.top + 4;
  }

  metrics.forEach((metric, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = m.left + col * (boxW + gap);
    const by = y + row * (boxH + gap);
    pdf.setFillColor(C.light[0], C.light[1], C.light[2]);
    pdf.setDrawColor(C.border[0], C.border[1], C.border[2]);
    pdf.roundedRect(x, by, boxW, boxH, 2, 2, "FD");
    pdf.setFontSize(6.5);
    pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    pdf.text(metric.label, x + 2.5, by + 4.5);
    pdf.setFontSize(13);
    const vc = metric.variant ? (VARIANT_MAP[metric.variant] ?? C.text) : C.text;
    pdf.setTextColor(vc[0], vc[1], vc[2]);
    pdf.text(metric.value, x + 2.5, by + boxH - 3);
  });

  return y + totalH + 2;
}

function drawAderencia(pdf: jsPDF, y: number, ad: ReportAderencia, margins: PdfMargins): number {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const m = margins;

  if (y + 30 > pageH - m.bottom - 4) {
    pdf.addPage();
    y = m.top + 4;
  }

  pdf.setFontSize(9);
  pdf.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
  pdf.text("ADERÊNCIA À PROGRAMAÇÃO", m.left, y);
  y += 3.5;
  pdf.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
  pdf.setLineWidth(0.15);
  pdf.line(m.left, y, pageW - m.right, y);
  y += 3.5;

  pdf.setFontSize(8);
  pdf.setTextColor(C.text[0], C.text[1], C.text[2]);
  pdf.text(`Percentual: ${ad.pct.toFixed(1)}%`, m.left + 2, y);
  y += 3.5;
  pdf.text(
    `Finalizadas no prazo: ${ad.finalizadasNoPrazo} de ${ad.totalProgramadas} programadas`,
    m.left + 2,
    y,
  );
  y += 3;
  pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  pdf.text("Meta: ≥ 95%", m.left + 2, y);
  y += 4;

  const barW = pageW - m.left - m.right - 4;
  const barH = 8;
  const fillW = (Math.min(ad.pct, 100) / 100) * barW;
  pdf.setFillColor(C.light[0], C.light[1], C.light[2]);
  pdf.roundedRect(m.left + 2, y, barW, barH, 2, 2, "F");
  const barColor = ad.pct >= 95 ? C.success : ad.pct >= 85 ? C.warning : C.danger;
  pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
  pdf.roundedRect(m.left + 2, y, fillW, barH, 2, 2, "F");
  return y + barH + 5;
}

function drawTables(
  pdf: jsPDF,
  y: number,
  tables: ReportTable[],
  margins: PdfMargins,
  showHeader: boolean,
): number {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const m = margins;

  for (const table of tables) {
    if (table.rows.length === 0) continue;

    const availH = pageH - y - m.bottom - 4;
    const head = [table.columns.map((c) => c.header)];
    const body = table.rows.map((r) =>
      table.columns.map((c) => {
        const v = c.value(r);
        return v === null || v === undefined ? "" : String(v);
      }),
    );

    if (availH < 20) {
      pdf.addPage();
      y = m.top + 4;
    }

    // Section title
    pdf.setFontSize(9);
    pdf.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
    pdf.text(table.title, m.left, y);
    y += 2.5;
    if (table.subtitle) {
      pdf.setFontSize(7);
      pdf.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      pdf.text(table.subtitle, m.left, y);
      y += 2;
    }

    let didDrawFirstPage = false;
    autoTable(pdf, {
      head,
      body,
      startY: y + 2,
      margin: { top: m.top + 19, left: m.left, right: m.right, bottom: m.bottom + 6 },
      tableLineColor: [C.border[0], C.border[1], C.border[2]],
      tableLineWidth: 0.1,
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 1.2,
        overflow: "linebreak",
        textColor: [C.text[0], C.text[1], C.text[2]],
        lineColor: [C.border[0], C.border[1], C.border[2]],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [C.primary[0], C.primary[1], C.primary[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "left",
      },
      alternateRowStyles: { fillColor: [C.light[0], C.light[1], C.light[2]] },
      didDrawPage: () => {
        if (!didDrawFirstPage) {
          didDrawFirstPage = true;
          return;
        }
        if (showHeader) drawPageHeader(pdf, table.title, table.subtitle, margins);
      },
    });

    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  return y;
}

// ─── Public API ────────────────────────────────────────────────────

export async function renderReportPdf(
  data: ReportData,
  chartElements: HTMLElement[],
  opts: ReportOpts,
): Promise<void> {
  const { filename, orientation = "portrait", layout = {} } = opts;
  const margins = resolveMargins(layout.margins);
  const showHeader = layout.showHeader !== false;
  const showFooter = layout.showFooter !== false;
  const showPageNumbers = layout.showPageNumbers !== false;

  const val = validateLayout(orientation, margins, { showHeader, showFooter });
  if (!val.valid) {
    const msg = val.errors.join(". ");
    throw new Error(`Layout inválido: ${msg}`);
  }
  if (val.warnings.length > 0) {
    console.warn(`[renderReportPdf] Avisos de layout:\n${val.warnings.join("\n")}`);
  }

  // ── Capture charts (with CSS overrides active) ──
  const cleanGlobal = installLiveOverride();
  const chartDataUrls: string[] = [];
  try {
    for (const el of chartElements) {
      chartDataUrls.push(await captureChartElement(el));
    }
  } finally {
    cleanGlobal();
  }

  // ── Build PDF ──
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margins.left - margins.right;

  // Page 1: header + metrics + aderência + tables
  let y = showHeader ? drawPageHeader(pdf, data.title, data.subtitle, margins) : margins.top;
  y = drawMetrics(pdf, y, data.metrics, margins);
  if (data.aderencia) {
    y = drawAderencia(pdf, y, data.aderencia, margins);
  }
  y = drawTables(pdf, y, data.tables, margins, showHeader);

  // ── Chart pages ──
  if (chartDataUrls.length > 0) {
    const chartTitles = chartElements.map((el) => {
      const h = el.querySelector("h2");
      const t = h?.textContent?.trim();
      return t && t.length > 0 ? t : "Gráficos";
    });
    // drawPageHeader with subtitle consumes ~33mm from margins.top
    const chartHeaderEndY = showHeader ? margins.top + 5 + 4 + 9 + 5 : margins.top;
    const imgStartY = chartHeaderEndY + 2;
    const imgAvailH = pageH - imgStartY - margins.bottom - (showFooter ? 6 : 0);

    for (let i = 0; i < chartDataUrls.length; i++) {
      pdf.addPage();
      if (showHeader) drawPageHeader(pdf, data.title, chartTitles[i] ?? "Gráficos", margins);

      const img = new Image();
      img.src = chartDataUrls[i];
      await img.decode();

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const ratio = imgW / imgH;
      // Fill full width (charts read best wide); cap only by height.
      let renderW = contentW;
      let renderH = contentW / ratio;
      if (renderH > imgAvailH) {
        renderH = imgAvailH;
        renderW = imgAvailH * ratio;
      }
      const cx = margins.left + (contentW - renderW) / 2;
      const cy = imgStartY + (imgAvailH - renderH) / 2;
      pdf.addImage(chartDataUrls[i], "PNG", cx, cy, renderW, renderH);
    }
  }

  // ── Footers on all pages ──
  if (showFooter) {
    const totalPages = pdf.getNumberOfPages();
    const extraText =
      `${data.metrics.length} indicadores` +
      (data.aderencia ? ` · ${data.aderencia.pct.toFixed(1)}% aderência` : "") +
      ` · ${data.tables.reduce((s, t) => s + t.rows.length, 0)} registros`;

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      drawFooter(pdf, i, totalPages, margins, { showPageNumbers, extraText });
    }
  }

  // ── Save ──
  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}
