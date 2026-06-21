import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  title?: string,
) {
  // Capture the element with current dark theme as-is
  const canvas = await html2canvas(element, {
    backgroundColor: "#02152D",
    scale: 2,
    useCORS: true,
    windowWidth: element.scrollWidth,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  // A4 landscape: 297 x 210 mm
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const headerH = title ? 12 : 0;

  // Fit image preserving aspect ratio to page width
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - headerH;
  const imgRatio = canvas.height / canvas.width;
  let drawW = availW;
  let drawH = drawW * imgRatio;

  // If image is taller than one page, paginate vertically
  if (drawH <= availH) {
    if (title) drawHeader(pdf, title, margin, pageW);
    pdf.addImage(imgData, "JPEG", margin, margin + headerH, drawW, drawH);
  } else {
    // Slice the canvas into page-height chunks
    const pxPerMm = canvas.width / drawW;
    const pageContentPx = Math.floor(availH * pxPerMm);
    const totalPages = Math.ceil(canvas.height / pageContentPx);
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      if (title) drawHeader(pdf, `${title} (${i + 1}/${totalPages})`, margin, pageW);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      const sliceH = Math.min(pageContentPx, canvas.height - i * pageContentPx);
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0,
        i * pageContentPx,
        canvas.width,
        sliceH,
        0,
        0,
        canvas.width,
        sliceH,
      );
      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
      const sliceDrawH = (sliceH / canvas.width) * drawW;
      pdf.addImage(sliceData, "JPEG", margin, margin + headerH, drawW, sliceDrawH);
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stamp}.pdf`);
}

function drawHeader(pdf: jsPDF, title: string, margin: number, pageW: number) {
  pdf.setFontSize(11);
  pdf.setTextColor(14, 165, 255);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margin, margin + 4);
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.text(stamp, pageW - margin, margin + 4, { align: "right" });
  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, margin, margin + 10);
}
