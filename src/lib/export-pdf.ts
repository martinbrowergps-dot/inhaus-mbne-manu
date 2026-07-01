import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type { CsvColumn } from "./export-csv";

interface ExportTableOpts<T> {
  filename: string;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: CsvColumn<T>[];
  orientation?: "landscape" | "portrait";
}

function drawHeader(pdf: jsPDF, title: string, subtitle: string | undefined, margin: number) {
  pdf.setFontSize(9);
  pdf.setTextColor(14, 78, 138);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margin, margin);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text(stamp, pdf.internal.pageSize.getWidth() - margin, margin, { align: "right" });

  // Separator line
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.3);
  pdf.line(margin, margin + 2, pdf.internal.pageSize.getWidth() - margin, margin + 2);

  pdf.setFontSize(13);
  pdf.setTextColor(2, 21, 45);
  pdf.text(title, margin, margin + 7);

  if (subtitle) {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, margin, margin + 12);
  }
}

function drawFooter(pdf: jsPDF, rowsCount: number, margin: number) {
  const pageH = pdf.internal.pageSize.getHeight();
  const pageCount = pdf.getNumberOfPages();
  const pageNum = pdf.getCurrentPageInfo().pageNumber;
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Martin Brower CDNE · ${rowsCount} registros`, margin, pageH - 4);
  pdf.text(`Página ${pageNum} de ${pageCount}`, pdf.internal.pageSize.getWidth() - margin, pageH - 4, { align: "right" });
}

export function exportTableToPdf<T>(opts: ExportTableOpts<T>) {
  const { filename, title, subtitle, rows, columns, orientation = "landscape" } = opts;
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;

  const head = [columns.map((c) => c.header)];
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.value(r);
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  const rowsCount = rows.length;

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
    didDrawPage: (data) => {
      drawHeader(pdf, title, subtitle, margin);
      drawFooter(pdf, rowsCount, margin);
    },
  });

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}

export async function exportVisualPdf(
  element: HTMLElement,
  filename: string,
  title: string,
  subtitle?: string,
) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;
  const contentY = margin + 16;
  const availH = pageH - contentY - margin - 4;

  if (typeof html2canvas !== "function" && typeof (html2canvas as any)?.default === "function") {
    throw new Error("html2canvas não está disponível");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (doc) => {
      // html2canvas não entende oklch/oklab; substitui no CSS clonado
      const sheets = doc.styleSheets;
      const rules: string[] = [];
      for (let i = 0; i < sheets.length; i++) {
        try {
          const sheet = sheets[i];
          if (!sheet) continue;
          for (let j = 0; j < sheet.cssRules.length; j++) {
            rules.push(sheet.cssRules[j].cssText);
          }
        } catch {
          // cross-origin sheet, ignorar
        }
      }
      const patchedCss = rules
        .join("\n")
        .replace(/oklch\([^)]+\)/g, "#0EA5FF")
        .replace(/oklab\([^)]+\)/g, "#0EA5FF");

      // Injeta CSS corrigido, remove links externos
      const style = doc.createElement("style");
      style.textContent = patchedCss;
      doc.head.appendChild(style);
      doc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
    },
  });
  return processCanvas(canvas, pdf, filename, title, subtitle, margin, pageW, pageH, contentW, contentY, availH);
}

async function processCanvas(
  canvas: HTMLCanvasElement,
  pdf: jsPDF,
  filename: string,
  title: string,
  subtitle: string | undefined,
  margin: number,
  pageW: number,
  pageH: number,
  contentW: number,
  contentY: number,
  availH: number,
) {
  let imgData: string;
  try {
    imgData = canvas.toDataURL("image/png");
  } catch {
    throw new Error("Falha ao gerar imagem — possível conteúdo cross-origin no canvas");
  }

  const imgW = contentW;
  const imgH = (canvas.height / canvas.width) * imgW;

  drawHeader(pdf, title, subtitle, margin);

  if (imgH <= availH) {
    pdf.addImage(imgData, "PNG", margin, contentY, imgW, imgH);
  } else {
    const scale = availH / imgH;
    pdf.addImage(imgData, "PNG", margin, contentY, imgW * scale, availH);
  }

  drawFooter(pdf, 0, margin);

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}

export async function exportExecutiveSummary(
  element: HTMLElement,
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
  let y = margin;

  // Header
  drawHeader(pdf, data.title, undefined, margin);
  y = margin + 16;

  // Section: KPIs
  pdf.setFontSize(10);
  pdf.setTextColor(14, 78, 138);
  pdf.text("INDICADORES", margin, y);
  y += 4;
  pdf.setDrawColor(14, 78, 138);
  pdf.setLineWidth(0.15);
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  // KPI boxes
  const cols = 3;
  const boxW = (pageW - margin * 2 - 8 * (cols - 1)) / cols;
  const boxH = 18;
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

  y += Math.ceil(data.kpis.length / cols) * (boxH + 4);

  // Section: Aderência
  y += 4;
  pdf.setFontSize(10);
  pdf.setTextColor(14, 78, 138);
  pdf.text("ADERÊNCIA À PROGRAMAÇÃO", margin, y);
  y += 4;
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  const ap = data.aderencia;
  pdf.setFontSize(9);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`Percentual: ${ap.pct.toFixed(1)}%`, margin + 2, y);
  y += 4;
  pdf.text(`Finalizadas no prazo: ${ap.finalizadasNoPrazo} de ${ap.totalProgramadas} programadas`, margin + 2, y);
  y += 3;
  pdf.text(`Meta: ≥ 95%`, margin + 2, y);
  y += 4;

  // Aderência bar
  const barW = pageW - margin * 2 - 4;
  const barH = 10;
  const fillW = Math.min(ap.pct, 100) / 100 * barW;
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin + 2, y, barW, barH, 3, 3, "F");
  const barColor = ap.pct >= 95 ? [34, 197, 94] as const : ap.pct >= 85 ? [234, 179, 8] as const : [239, 68, 68] as const;
  pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
  pdf.roundedRect(margin + 2, y, fillW, barH, 3, 3, "F");
  y += barH + 6;

  // Try to capture a screenshot of charts if available
  try {
    const chartsCanvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (doc) => {
        const sheets = doc.styleSheets;
        const rules: string[] = [];
        for (let i = 0; i < sheets.length; i++) {
          try {
            const sheet = sheets[i];
            if (!sheet) continue;
            for (let j = 0; j < sheet.cssRules.length; j++) {
              rules.push(sheet.cssRules[j].cssText);
            }
          } catch {
            // cross-origin sheet, ignorar
          }
        }
        const patchedCss = rules
          .join("\n")
          .replace(/oklch\([^)]+\)/g, "#0EA5FF")
          .replace(/oklab\([^)]+\)/g, "#0EA5FF");
        const style = doc.createElement("style");
        style.textContent = patchedCss;
        doc.head.appendChild(style);
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
      },
    });
    const imgData = chartsCanvas.toDataURL("image/png");
    const contentW = pageW - margin * 2;
    const imgW = contentW;
    const imgH = (chartsCanvas.height / chartsCanvas.width) * imgW;

    if (y + imgH + 10 < pageH) {
      pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
    } else {
      pdf.addPage();
      drawHeader(pdf, data.title, undefined, margin);
      const availH2 = pageH - margin - margin - 6;
      pdf.addImage(imgData, "PNG", margin, margin + 16, imgW, Math.min(imgH, availH2));
    }
  } catch {
    // Chart capture failed — just export text
  }

  // Footer
  const pageCount = pdf.getNumberOfPages();
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const curPageH = pdf.internal.pageSize.getHeight();
    pdf.text(`Martin Brower CDNE · ${data.kpis.length} indicadores`, margin, curPageH - 4);
    pdf.text(`Página ${i} de ${pageCount}`, pageW - margin, curPageH - 4, { align: "right" });
  }

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}
