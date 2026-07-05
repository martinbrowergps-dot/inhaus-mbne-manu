import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
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

interface ExportTableOpts<T> {
  filename: string;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: CsvColumn<T>[];
  orientation?: "landscape" | "portrait";
}

const MARGIN = 10;

function drawHeader(pdf: jsPDF, title: string, subtitle: string | undefined, margin: number): number {
  let y = margin;
  pdf.setFontSize(9);
  pdf.setTextColor(14, 78, 138);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margin, y);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text(stamp, pdf.internal.pageSize.getWidth() - margin, y, { align: "right" });
  y += 2.5;
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y);
  y += 2;
  pdf.setFontSize(13);
  pdf.setTextColor(2, 21, 45);
  pdf.text(title, margin, y + 3);
  y += 7;
  if (subtitle) {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, margin, y);
    y += 4;
  }
  return y;
}

export function exportTableToPdf<T>(opts: ExportTableOpts<T>) {
  const { filename, title, subtitle, rows, columns, orientation = "landscape" } = opts;
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const margin = MARGIN;
  const rowsCount = rows.length;

  const head = [columns.map((c) => c.header)];
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.value(r);
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  autoTable(pdf, {
    head,
    body,
    startY: margin + 16,
    margin: { left: margin, right: margin, bottom: margin + 8 },
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
      drawHeader(pdf, title, subtitle, margin);
    },
  });

  // Post-process: fix page numbers on all pages
  const finalPageCount = pdf.getNumberOfPages();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  for (let i = 1; i <= finalPageCount; i++) {
    pdf.setPage(i);
    pdf.text("Martin Brower CDNE · " + rowsCount + " registros", margin, pageH - 4);
    pdf.text("Página " + i + " de " + finalPageCount, pageW - margin, pageH - 4, { align: "right" });
  }

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}

const HEADER_HEIGHT = 10;

function drawImagePageHeader(pdf: jsPDF, title: string, subtitle: string | undefined, margin: number, pageW: number) {
  let y = margin + 1.5;
  pdf.setFontSize(7);
  pdf.setTextColor(14, 78, 138);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margin, y);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.setFontSize(5.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(stamp, pageW - margin, y, { align: "right" });
  y += 2;
  pdf.setFontSize(10);
  pdf.setTextColor(2, 21, 45);
  pdf.text(title, margin, y + 1);
  y += 3.5;
  if (subtitle) {
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, margin, y);
    y += 2.5;
  }
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.25);
  pdf.line(margin, y + 0.5, pageW - margin, y + 0.5);
}

/**
 * Capture the full element as a single canvas using html2canvas,
 * then slice the image into page-sized chunks.
 * Header is drawn in reserved top area, image starts below it.
 */
export async function exportVisualPdf(
  element: HTMLElement,
  filename: string,
  title: string,
  subtitle?: string,
) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = MARGIN;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin - HEADER_HEIGHT - margin - 4;
  const scale = 2;

  const cleanLiveOverride = installLiveOverride();
  const cleanLiveInline = sanitizeLiveInlineColors(element);

  const fullCanvas = await html2canvas(element, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  cleanLiveOverride();
  cleanLiveInline();

  const imgW = fullCanvas.width;
  const imgH = fullCanvas.height;

  const cssW = imgW / scale;
  const cssH = imgH / scale;
  const pxPerMm = cssW / contentW;
  const pageCssH = Math.floor(contentH * pxPerMm);
  if (pageCssH < 1) throw new Error("Page content height too small");
  const pageImgH = pageCssH * scale;
  const totalPages = Math.ceil(cssH / pageCssH);
  if (!isFinite(totalPages) || totalPages < 1) throw new Error("Invalid page count");

  const sliceCanvas = document.createElement("canvas");
  const ctx = sliceCanvas.getContext("2d")!;
  const imgStartY = margin + HEADER_HEIGHT;

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();

    drawImagePageHeader(pdf, title, subtitle, margin, pageW);

    const sy = Math.round(i * pageImgH);
    const sh = Math.round(Math.min(pageImgH, imgH - sy));
    if (sh <= 0) continue;

    sliceCanvas.width = imgW;
    sliceCanvas.height = sh;
    ctx.drawImage(fullCanvas, 0, sy, imgW, sh, 0, 0, imgW, sh);

    const pageDataUrl = sliceCanvas.toDataURL("image/png");
    const imgMmH = sh / (pxPerMm * scale);
    pdf.addImage(pageDataUrl, "PNG", margin, imgStartY, contentW, imgMmH);
  }

  sliceCanvas.width = 0;
  sliceCanvas.height = 0;

  // Footer on all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(6);
    pdf.setTextColor(148, 163, 184);
    pdf.text("Martin Brower CDNE", margin, pageH - 3);
    pdf.text("Página " + i + " de " + pageCount, pageW - margin, pageH - 3, { align: "right" });
  }

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}

export async function exportExecutiveSummary(
  chartElement: HTMLElement | null,
  data: {
    title: string;
    aderencia: { pct: number; finalizadasNoPrazo: number; totalProgramadas: number };
    kpis: { label: string; value: string; variant?: string }[];
  },
  filename: string,
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const availH = pageH - margin - HEADER_HEIGHT - margin - 4;
  let y = margin;

  y = drawHeader(pdf, data.title, undefined, margin) + 2;

  // Section: KPIs
  pdf.setFontSize(10);
  pdf.setTextColor(14, 78, 138);
  pdf.text("INDICADORES", margin, y);
  y += 4;
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.15);
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  const cols = 3;
  const boxW = (pageW - margin * 2 - 8 * (cols - 1)) / cols;
  const boxH = 18;
  const kpiRows = Math.ceil(data.kpis.length / cols);
  const kpiTotalH = kpiRows * (boxH + 4);

  if (y + kpiTotalH > pageH - margin - 4) {
    pdf.addPage();
    y = margin + 4;
  }

  data.kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (boxW + 8);
    const by = y + row * (boxH + 4);
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(x, by, boxW, boxH, 2, 2, "FD");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(kpi.label, x + 3, by + 5);
    pdf.setFontSize(14);
    pdf.setTextColor(2, 21, 45);
    pdf.text(kpi.value, x + 3, by + boxH - 4);
  });

  y += kpiTotalH;

  // Section: Aderência
  y += 4;
  if (y + 30 > pageH - margin - 4) {
    pdf.addPage();
    y = margin + 4;
  }

  pdf.setFontSize(10);
  pdf.setTextColor(14, 78, 138);
  pdf.text("ADERÊNCIA À PROGRAMAÇÃO", margin, y);
  y += 4;
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  const ap = data.aderencia;
  pdf.setFontSize(9);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Percentual: " + ap.pct.toFixed(1) + "%", margin + 2, y);
  y += 4;
  pdf.text("Finalizadas no prazo: " + ap.finalizadasNoPrazo + " de " + ap.totalProgramadas + " programadas", margin + 2, y);
  y += 3;
  pdf.setTextColor(100, 116, 139);
  pdf.text("Meta: ≥ 95%", margin + 2, y);
  y += 5;

  // Aderência progress bar
  const barW = pageW - margin * 2 - 4;
  const barH = 10;
  const fillW = Math.min(ap.pct, 100) / 100 * barW;
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin + 2, y, barW, barH, 3, 3, "F");
  const barColor = ap.pct >= 95 ? [34, 197, 94] as const : ap.pct >= 85 ? [234, 179, 8] as const : [239, 68, 68] as const;
  pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
  pdf.roundedRect(margin + 2, y, fillW, barH, 3, 3, "F");
  y += barH + 6;

  // Charts — capture dedicated chartElement (if provided) and render on separate pages
  if (chartElement) {
    try {
      const cleanLiveOverride2 = installLiveOverride();
      const cleanLiveInline2 = sanitizeLiveInlineColors(chartElement);

      const fullCanvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      cleanLiveOverride2();
      cleanLiveInline2();

      const imgW = fullCanvas.width;
      const imgH = fullCanvas.height;
      const pr = imgW / chartElement.offsetWidth;

      const contentW = pageW - margin * 2;
      const pxPerMm = (imgW / pr) / contentW;
      const pagePxH = Math.floor(availH * pxPerMm * pr);
      const totalPages = Math.ceil(imgH / pagePxH);
      const sliceCanvas = document.createElement("canvas");
      const ctx = sliceCanvas.getContext("2d")!;
      const imgStartY = margin + HEADER_HEIGHT;

      for (let i = 0; i < totalPages; i++) {
        pdf.addPage();
        drawImagePageHeader(pdf, data.title, "Gráficos", margin, pageW);
        const sy = Math.round(i * pagePxH);
        const sh = Math.round(Math.min(pagePxH, imgH - sy));
        if (sh <= 0) continue;
        sliceCanvas.width = imgW;
        sliceCanvas.height = sh;
        ctx.drawImage(fullCanvas, 0, sy, imgW, sh, 0, 0, imgW, sh);
        const pageDataUrl = sliceCanvas.toDataURL("image/png");
        const imgMmH = sh / (pxPerMm * pr);
        pdf.addImage(pageDataUrl, "PNG", margin, imgStartY, contentW, imgMmH);
      }

      sliceCanvas.width = 0;
      sliceCanvas.height = 0;
    } catch {
      // Chart capture failed — text-only export is still valid
    }
  }

  // Footer on all pages
  const finalPageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= finalPageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(6);
    pdf.setTextColor(148, 163, 184);
    pdf.text("Martin Brower CDNE · " + data.kpis.length + " indicadores", margin, pdf.internal.pageSize.getHeight() - 3);
    pdf.text("Página " + i + " de " + finalPageCount, pageW - margin, pdf.internal.pageSize.getHeight() - 3, { align: "right" });
  }

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}
