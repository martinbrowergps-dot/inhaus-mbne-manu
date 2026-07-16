import { describe, it, expect } from "vitest";
import { aggregate } from "@/lib/chart-utils";
import {
  aggregateByMonth,
  aggregateHHByCargo,
  aggregateQuebrasBySolicitante,
} from "@/lib/domain/aggregates";
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

describe("aggregate", () => {
  it("conta ocorrências por chave", () => {
    const items = [
      row({ Criticidade: "A" }),
      row({ Criticidade: "B" }),
      row({ Criticidade: "A" }),
    ];
    const result = aggregate(items, (r) => r.Criticidade);
    expect(result).toEqual([
      { name: "A", value: 2 },
      { name: "B", value: 1 },
    ]);
  });

  it("usa — para chave vazia", () => {
    const items = [row({ Criticidade: "" })];
    const result = aggregate(items, (r) => r.Criticidade || "");
    expect(result[0].name).toBe("—");
  });

  it("ordena decrescente por valor", () => {
    const items = [
      row({ Criticidade: "C" }),
      row({ Criticidade: "A" }),
      row({ Criticidade: "A" }),
      row({ Criticidade: "B" }),
      row({ Criticidade: "B" }),
      row({ Criticidade: "B" }),
    ];
    const result = aggregate(items, (r) => r.Criticidade);
    expect(result.map((r) => r.name)).toEqual(["B", "A", "C"]);
  });
});

describe("aggregateByMonth", () => {
  it("agrupa por mês/ano", () => {
    const items = [
      row({ DataProgramada: "15/01/2026" }),
      row({ DataProgramada: "20/01/2026" }),
      row({ DataProgramada: "05/02/2026" }),
    ];
    const result = aggregateByMonth(items);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.name === "01/2026")?.value).toBe(2);
    expect(result.find((r) => r.name === "02/2026")?.value).toBe(1);
  });

  it("ignora data inválida", () => {
    const items = [row({ DataProgramada: "" })];
    const result = aggregateByMonth(items);
    expect(result).toHaveLength(0);
  });

  it("ordena cronologicamente", () => {
    const items = [
      row({ DataProgramada: "01/03/2026" }),
      row({ DataProgramada: "01/01/2026" }),
      row({ DataProgramada: "01/02/2026" }),
    ];
    const result = aggregateByMonth(items);
    expect(result.map((r) => r.name)).toEqual(["01/2026", "02/2026", "03/2026"]);
  });
});

describe("aggregateHHByCargo", () => {
  it("soma HH por cargo", () => {
    const items = [
      row({ Cargo: "MECÂNICO", HH: 4 }),
      row({ Cargo: "ELETRICISTA", HH: 8 }),
      row({ Cargo: "MECÂNICO", HH: 6 }),
    ];
    const result = aggregateHHByCargo(items);
    const mec = result.find((r) => r.name === "MECÂNICO");
    expect(mec?.value).toBe(10);
  });
});

describe("aggregateQuebrasBySolicitante", () => {
  it("agrupa quebras por solicitante", () => {
    const items = [
      row({ Tipo: "QUEBRA DE PROGRAMAÇÃO", SolicitanteQuebra: "João" }),
      row({ Tipo: "QUEBRA DE PROGRAMAÇÃO", SolicitanteQuebra: "Maria" }),
      row({ Tipo: "QUEBRA DE PROGRAMAÇÃO", SolicitanteQuebra: "João" }),
      row({ Tipo: "PREVENTIVA" }),
    ];
    const result = aggregateQuebrasBySolicitante(items);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("João");
    expect(result[0].value).toBe(2);
  });
});
