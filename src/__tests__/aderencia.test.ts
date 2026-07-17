import { describe, it, expect } from "vitest";
import { computeAderencia } from "@/lib/domain/aderencia";

function row(overrides: {
  Status?: string;
  StatusExecucao?: string;
  DataProgramada?: string;
  DataReprogramada?: string;
} = {}) {
  return {
    Status: overrides.Status ?? "",
    StatusExecucao: overrides.StatusExecucao ?? "",
    DataProgramada: overrides.DataProgramada ?? "15/07/2026",
    DataReprogramada: overrides.DataReprogramada ?? "",
  };
}

describe("computeAderencia", () => {
  it("100% quando todas finalizadas no prazo", () => {
    const rows = [
      row({ StatusExecucao: "Finalizada" }),
      row({ StatusExecucao: "Finalizada" }),
      row({ StatusExecucao: "Finalizada" }),
    ];
    const result = computeAderencia(rows);
    expect(result.pct).toBe(100);
    expect(result.finalizadasNoPrazo).toBe(3);
    expect(result.canceladas).toBe(0);
    expect(result.pendentes).toBe(0);
    expect(result.totalProgramadas).toBe(3);
  });

  it("canceladas contam como realizadas (neutras)", () => {
    const rows = [
      row({ StatusExecucao: "Finalizada" }),
      row({ StatusExecucao: "Cancelada" }),
      row({ StatusExecucao: "Cancelada" }),
    ];
    const result = computeAderencia(rows);
    // realizadas = 1 finalizada + 2 canceladas = 3 / 3 = 100%
    expect(result.pct).toBe(100);
    expect(result.canceladas).toBe(2);
    expect(result.pendentes).toBe(0);
  });

  it("finalizadas fora do prazo (com DataReprogramada)", () => {
    const rows = [
      row({ StatusExecucao: "Finalizada", DataReprogramada: "20/07/2026" }),
      row({ StatusExecucao: "Finalizada" }),
    ];
    const result = computeAderencia(rows);
    expect(result.finalizadasForaPrazo).toBe(1);
    expect(result.finalizadasNoPrazo).toBe(1);
    expect(result.pct).toBe(100);
  });

  it("ignora linhas sem DataProgramada", () => {
    const rows = [
      row({ DataProgramada: "" }),
      row({ StatusExecucao: "Finalizada" }),
    ];
    const result = computeAderencia(rows);
    expect(result.totalProgramadas).toBe(1);
    expect(result.finalizadasNoPrazo).toBe(1);
  });

  it("0% quando nenhuma finalizada nem cancelada", () => {
    const rows = [
      row({ StatusExecucao: "" }), // programada → pendente
      row({ StatusExecucao: "Em execução" }),
      row({ StatusExecucao: "Atrasada" }),
    ];
    const result = computeAderencia(rows);
    expect(result.pct).toBe(0);
    expect(result.pendentes).toBe(3);
  });

  it("usa Status como fallback quando StatusExecucao vazio", () => {
    const rows = [
      row({ Status: "Finalizada", StatusExecucao: "" }),
      row({ Status: "", StatusExecucao: "Cancelada" }),
    ];
    const result = computeAderencia(rows);
    expect(result.finalizadasNoPrazo).toBe(1);
    expect(result.canceladas).toBe(1);
    expect(result.pct).toBe(100);
  });

  it("0% para array vazio", () => {
    const result = computeAderencia([]);
    expect(result.pct).toBe(0);
    expect(result.totalProgramadas).toBe(0);
    expect(result.pendentes).toBe(0);
  });

  it("pct parcial com mix de status", () => {
    const rows = [
      row({ StatusExecucao: "Finalizada" }),
      row({ StatusExecucao: "Cancelada" }),
      row({ StatusExecucao: "Em execução" }),
      row({ StatusExecucao: "Finalizada" }),
      row({ StatusExecucao: "" }), // programada
    ];
    const result = computeAderencia(rows);
    // realizadas: 2 finalizadas + 1 cancelada = 3 / 5 = 60%
    expect(result.pct).toBe(60);
    expect(result.finalizadasNoPrazo).toBe(2);
    expect(result.canceladas).toBe(1);
    expect(result.pendentes).toBe(2);
    expect(result.totalProgramadas).toBe(5);
  });

  it("concluída reconhecida como finalizada", () => {
    const rows = [
      row({ StatusExecucao: "Concluída" }),
    ];
    const result = computeAderencia(rows);
    expect(result.finalizadasNoPrazo).toBe(1);
    expect(result.pct).toBe(100);
  });
});
