import { describe, it, expect } from "vitest";
import { deriveExecStatus } from "@/lib/status";
import type { ProgramacaoRow } from "@/lib/sheets-types";

function row(overrides: Partial<ProgramacaoRow> = {}): ProgramacaoRow {
  return {
    NumeroOS: "OS001",
    IDPlano: "",
    DataProgramada: "15/07/2026",
    DataReprogramada: "",
    TAG: "MB-01",
    Descricao: "Teste",
    Sistema: "Sistema A",
    Criticidade: "B",
    Cargo: "MECÂNICO",
    HH: 4,
    Status: "",
    Executante: "João",
    StatusExecucao: "",
    ...overrides,
  };
}

describe("deriveExecStatus", () => {
  it("status Finalizada quando StatusExecucao contém finaliz", () => {
    expect(deriveExecStatus(row({ StatusExecucao: "Finalizada" }))).toBe("Finalizada");
    expect(deriveExecStatus(row({ StatusExecucao: "finalizada" }))).toBe("Finalizada");
    expect(deriveExecStatus(row({ StatusExecucao: "Concluída" }))).toBe("Finalizada");
  });

  it("status Cancelada quando contém cancel", () => {
    expect(deriveExecStatus(row({ StatusExecucao: "Cancelada" }))).toBe("Cancelada");
  });

  it("status Em execução quando contém execu/andamento", () => {
    expect(deriveExecStatus(row({ StatusExecucao: "Em execução" }))).toBe("Em execução");
    expect(deriveExecStatus(row({ StatusExecucao: "Em andamento" }))).toBe("Em execução");
  });

  it("status Pausada quando contém pausa", () => {
    expect(deriveExecStatus(row({ StatusExecucao: "Pausada" }))).toBe("Pausada");
  });

  it("status Reprogramada quando tem DataReprogramada", () => {
    expect(deriveExecStatus(row({ DataReprogramada: "20/07/2026" }))).toBe("Reprogramada");
  });

  it("status Programada quando não tem indicadores", () => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // futuro
    const data = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    expect(deriveExecStatus(row({ DataProgramada: data, StatusExecucao: "" }))).toBe("Programada");
  });

  it("status Atrasada quando data passou", () => {
    expect(deriveExecStatus(row({ DataProgramada: "01/01/2020" }))).toBe("Atrasada");
  });

  it("usa Status como fallback se StatusExecucao vazio", () => {
    expect(deriveExecStatus(row({ Status: "Finalizada", StatusExecucao: "" }))).toBe("Finalizada");
  });
});
