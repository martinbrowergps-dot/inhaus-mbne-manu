import { describe, it, expect } from "vitest";
import { validateLayout } from "@/lib/pdf-layout";
import { DEFAULT_MARGINS } from "@/lib/pdf-css-patch";

describe("validateLayout", () => {
  const defaults = { ...DEFAULT_MARGINS };

  it("válido com landscape A4 margens padrão", () => {
    const result = validateLayout("landscape", defaults, { showHeader: false, showFooter: false });
    expect(result.valid).toBe(true);
    expect(result.metrics.contentW).toBeGreaterThan(250);
    expect(result.metrics.contentH).toBeGreaterThan(140);
  });

  it("warnings para margens muito pequenas", () => {
    const result = validateLayout("portrait", { top: 4, bottom: 4, left: 5, right: 5 }, { showHeader: true, showFooter: true });
    expect(result.valid).toBe(true); // ainda cabe
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("superior"))).toBe(true);
  });

  // resolveMargins clampa top/bottom/left/right a [5..40] mm.
// Margens extremas são corrigidas automaticamente. Testar warnings.
  it("margens dentro do clamp produzem layout válido", () => {
    // Mesmo com valor extremo (top=200), resolveMargins corrige para 40.
    const r = validateLayout("portrait", { top: 200, bottom: 200, left: 50, right: 50 }, { showHeader: false, showFooter: false });
    expect(r.valid).toBe(true);
    expect(r.metrics.marginTotalV).toBeLessThanOrEqual(80);
    expect(r.metrics.marginTotalH).toBeLessThanOrEqual(80);
  });

  it("margens pequenas (< 8mm) geram warnings", () => {
    const r = validateLayout("portrait", { top: 5, bottom: 5, left: 5, right: 5 }, {});
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("superior"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("inferior"))).toBe(true);
  });

  it("warnings se cabeçalho ocupa mais de 40% da página (A4 portrait)", () => {
    // headerReserve = top + 19 = 40 + 19 = 59, pageH=297 → 19.9% — não gera warning pelo 40%.
    // Para headerReserve > 40% * 297 = 118.8 não é possível com top max 40.
    // Logo, este warning nunca é disparado com clamp. Testar que é verdade.
    const r = validateLayout("portrait", { top: 40, bottom: 5, left: 10, right: 10 }, { showHeader: true });
    expect(r.warnings.some((w) => w.includes("Cabeçalho"))).toBe(false);
  });

  it("métricas calculadas corretamente", () => {
    const result = validateLayout("landscape", defaults, { showHeader: true, showFooter: true, format: "a4" });
    expect(result.metrics.pageWidth).toBe(297);
    expect(result.metrics.pageHeight).toBe(210);
    expect(result.metrics.headerReserve).toBeGreaterThan(0);
    expect(result.metrics.footerReserve).toBeGreaterThan(0);
  });
});