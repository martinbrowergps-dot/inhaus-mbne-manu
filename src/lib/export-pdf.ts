import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CsvColumn } from "./export-csv";

interface ExportTableOpts<T> {
  filename: string;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: CsvColumn<T>[];
  /** Optional landscape (default) or portrait */
  orientation?: "landscape" | "portrait";
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

  const stamp = new Date().toLocaleString("pt-BR");

  autoTable(pdf, {
    head,
    body,
    startY: margin + 16,
    margin: { left: margin, right: margin, bottom: margin + 8 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [14, 78, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    didDrawPage: () => {
      // Header
      pdf.setFontSize(9);
      pdf.setTextColor(14, 78, 138);
      pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margin, margin);
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(stamp, pageW - margin, margin, { align: "right" });

      pdf.setFontSize(13);
      pdf.setTextColor(2, 21, 45);
      pdf.text(title, margin, margin + 7);

      if (subtitle) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(subtitle, margin, margin + 12);
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      const pageNum = pdf.getCurrentPageInfo().pageNumber;
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Martin Brower CDNE · ${rows.length} registros`,
        margin,
        pageH - 4,
      );
      pdf.text(
        `Página ${pageNum} de ${pageCount}`,
        pageW - margin,
        pageH - 4,
        { align: "right" },
      );
    },
  });

  const stampFile = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stampFile}.pdf`);
}
