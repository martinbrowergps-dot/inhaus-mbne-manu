import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  title?: string,
) {
  // Render the element to a PNG data URL — html-to-image supports modern CSS (oklch, etc.)
  const dataUrl = await toPng(element, {
    backgroundColor: "#02152D",
    pixelRatio: 2,
    cacheBust: true,
    style: { transform: "none" },
  });

  // Measure image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao carregar imagem para PDF"));
    img.src = dataUrl;
  });

  // A4 landscape: 297 x 210 mm
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const headerH = title ? 14 : 0;

  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - headerH;
  const drawW = availW;
  const imgRatio = img.height / img.width;
  const drawH = drawW * imgRatio;

  if (drawH <= availH) {
    if (title) drawHeader(pdf, title, margin, pageW);
    pdf.addImage(dataUrl, "PNG", margin, margin + headerH, drawW, drawH);
  } else {
    // Slice vertically across multiple pages
    const pxPerMm = img.width / drawW;
    const pageSlicePx = Math.floor(availH * pxPerMm);
    const totalPages = Math.ceil(img.height / pageSlicePx);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      if (title) drawHeader(pdf, `${title} (${i + 1}/${totalPages})`, margin, pageW);

      const slice = document.createElement("canvas");
      slice.width = img.width;
      const sh = Math.min(pageSlicePx, img.height - i * pageSlicePx);
      slice.height = sh;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#02152D";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(img, 0, i * pageSlicePx, img.width, sh, 0, 0, img.width, sh);
      const sliceData = slice.toDataURL("image/png");
      const sliceDrawH = (sh / img.width) * drawW;
      pdf.addImage(sliceData, "PNG", margin, margin + headerH, drawW, sliceDrawH);
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}_${stamp}.pdf`);
}

function drawHeader(pdf: jsPDF, title: string, margin: number, pageW: number) {
  pdf.setFontSize(10);
  pdf.setTextColor(14, 165, 255);
  pdf.text("MARTIN BROWER · IN HAUS INDUSTRIAL", margin, margin + 4);
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  const stamp = new Date().toLocaleString("pt-BR");
  pdf.text(stamp, pageW - margin, margin + 4, { align: "right" });
  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, margin, margin + 11);
}
