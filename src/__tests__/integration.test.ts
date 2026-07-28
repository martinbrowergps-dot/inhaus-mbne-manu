import { describe, it, expect } from "vitest";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { parseBRNumber } from "@/lib/format";
import { deriveExecStatus } from "@/lib/status";
import {
  aggregateByMonth,
  aggregateHHByCargo,
  aggregateQuebrasBySolicitante,
  aggregateByDay,
  aggregateByDayAndStatus,
} from "@/lib/domain/aggregates";

// Simula dados crus como viriam do Google Sheets CSV
// Datas em 15/08/2026+ para evitar que deriveExecStatus interprete como atrasada
const csvRaw: Record<string, string>[] = [
  {
    NumeroOS: "OS-001",
    DataProgramada: "15/08/2026",
    Sistema: "Ar comprimido",
    Descricao: "Troca filtro",
    Criticidade: "A",
    Cargo: "MECÂNICO",
    HH: "4",
    Status: "Planejado",
    Executante: "João",
    StatusExecucao: "Programada",
    Tipo: "PREVENTIVA",
    "Solicitante da Quebra de Programação": "",
  },
  {
    NumeroOS: "OS-002",
    DataProgramada: "16/08/2026",
    Sistema: "Hidráulico",
    Descricao: "Reparo bomba",
    Criticidade: "B",
    Cargo: "ELETRICISTA",
    HH: "8",
    Status: "Planejado",
    Executante: "Maria",
    StatusExecucao: "Finalizada",
    Tipo: "QUEBRA DE PROGRAMAÇÃO",
    "Solicitante da Quebra de Programação": "Produção",
  },
  {
    NumeroOS: "OS-003",
    DataProgramada: "15/08/2026",
    Sistema: "Ar comprimido",
    Descricao: "Lubrificação",
    Criticidade: "A",
    Cargo: "MECÂNICO",
    HH: "2,5",
    Status: "Não Planejado",
    Executante: "João",
    StatusExecucao: "Programada",
    Tipo: "PREVENTIVA",
    "Solicitante da Quebra de Programação": "",
  },
];

function parseRaw(r: Record<string, string>): ProgramacaoRow {
  return {
    NumeroOS: r["NumeroOS"] ?? "",
    IDPlano: r["IDPlano"] ?? "",
    DataProgramada: r["DataProgramada"] ?? "",
    DataReprogramada: r["DataReprogramada"] ?? "",
    TAG: r["TAG"] ?? "",
    Descricao: r["Descricao"] ?? "",
    Sistema: r["Sistema"] ?? "",
    Criticidade: r["Criticidade"] ?? "",
    Cargo: r["Cargo"] ?? "",
    HH: parseBRNumber(r["HH"]),
    Status: r["Status"] ?? "",
    Executante: r["Executante"] ?? "",
    StatusExecucao: r["StatusExecucao"] ?? r["Status"] ?? "",
    LocalMacro: r["LocalMacro"] ?? "",
    Localidade: r["Localidade"] ?? "",
    Tipo: r["Tipo"] ?? "",
    SolicitanteQuebra: r["Solicitante da Quebra de Programação"] ?? r["SolicitanteQuebra"] ?? "",
  };
}

describe("integração sheets → domain", () => {
  const rows = csvRaw.map(parseRaw);

  it("parseia HH com vírgula decimal (BR)", () => {
    expect(rows[0].HH).toBe(4);
    expect(rows[2].HH).toBe(2.5);
  });

  it("deriveExecStatus funciona após parse", () => {
    const enriched = rows.map((r) => ({ ...r, _execStatus: deriveExecStatus(r) }));
    expect(enriched[0]._execStatus).toBe("Programada");
    expect(enriched[1]._execStatus).toBe("Finalizada");
  });

  it("aggregateByMonth agrupa datas parseadas", () => {
    const result = aggregateByMonth(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("08/2026");
    expect(result[0].value).toBe(3);
  });

  it("aggregateHHByCargo soma HH corretamente", () => {
    const result = aggregateHHByCargo(rows);
    const mec = result.find((r) => r.name === "MECÂNICO");
    expect(mec?.value).toBe(6.5); // 4 + 2.5
  });

  it("aggregateByDay agrupa por dia (últimos 14)", () => {
    const result = aggregateByDay(rows);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const dia = result.find((r) => r.label === "15/08");
    expect(dia?.value).toBe(2);
  });

  it("aggregateByDayAndStatus separa planejado/não planejado", () => {
    const result = aggregateByDayAndStatus(rows);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const dia = result.find((r) => r.label === "15/08");
    expect(dia?.planejado).toBe(1);
    expect(dia?.naoPlanejado).toBe(1);
  });

  it("aggregateQuebrasBySolicitante filtra quebras", () => {
    const result = aggregateQuebrasBySolicitante(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Produção");
    expect(result[0].value).toBe(1);
  });
});
