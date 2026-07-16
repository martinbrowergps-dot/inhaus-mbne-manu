import { describe, it, expect } from "vitest";
import { buildTagMap, assetLabel } from "@/lib/domain/tag-map";
import { extractObservations } from "@/lib/domain/observations";
import type { PlanoManutencaoRow, ProgramacaoRow } from "@/lib/sheets-types";

describe("buildTagMap", () => {
  const plano: PlanoManutencaoRow[] = [
    {
      Item: "1",
      Unidade: "CDNE",
      CodigoUnidade: "CDNE",
      LocalInstalacao: "Sala",
      EquipamentoMaquina: "Compressor",
      DescricaoAtividade: "Troca de óleo",
      Sistema: "Ar comprimido",
      TAG: "MB-01-COMP-001",
      Criticidade: "A",
      Tipo: "PREVENTIVA",
      Periodicidade: "90",
      Start: "01/01/2026",
      Cargo: "MECÂNICO",
      HHEstimado: "4",
      HHEquivalenteTempo: "4:00",
    },
    {
      Item: "2",
      Unidade: "CDNE",
      CodigoUnidade: "CDNE",
      LocalInstalacao: "Sala 2",
      EquipamentoMaquina: "Bomba",
      DescricaoAtividade: "Limpeza",
      Sistema: "Hidráulico",
      TAG: "MB-01-BOM-002",
      Criticidade: "B",
      Tipo: "PREVENTIVA",
      Periodicidade: "180",
      Start: "01/03/2026",
      Cargo: "ELETRICISTA",
      HHEstimado: "2",
      HHEquivalenteTempo: "2:00",
    },
  ];

  it("mapeia TAG para Equipamento/Máquina", () => {
    const map = buildTagMap(plano);
    expect(map.get("MB-01-COMP-001")).toBe("Compressor");
    expect(map.get("MB-01-BOM-002")).toBe("Bomba");
    expect(map.size).toBe(2);
  });

  it("ignora TAG vazia", () => {
    const withEmpty = [...plano, { ...plano[0], TAG: "", EquipamentoMaquina: "Test" }];
    const map = buildTagMap(withEmpty);
    expect(map.size).toBe(2);
  });

  it("primeiro vence em caso de TAG duplicada", () => {
    const dup = [
      { ...plano[0], TAG: "MB-01", EquipamentoMaquina: "Primeiro" },
      { ...plano[0], TAG: "MB-01", EquipamentoMaquina: "Segundo" },
    ];
    const map = buildTagMap(dup);
    expect(map.get("MB-01")).toBe("Primeiro");
  });
});

describe("assetLabel", () => {
  it("retorna Equipamento (TAG) quando mapeado", () => {
    const map = new Map([["MB-01", "Compressor"]]);
    expect(assetLabel("MB-01", map)).toBe("Compressor (MB-01)");
  });

  it("retorna só TAG quando não mapeado", () => {
    const map = new Map();
    expect(assetLabel("MB-99", map)).toBe("MB-99");
  });
});

describe("extractObservations", () => {
  const base: ProgramacaoRow = {
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
    LocalMacro: "",
    Localidade: "",
    Tipo: "",
    SolicitanteQuebra: "",
    DataCriacao: "",
    DataInicioExecucao: "",
    DataFimExecucao: "",
    ObservacoesExecucao: "",
    TemNaoConformidade: "",
    DescricaoNaoConformidade: "",
  };

  it("extrai observações quando existe ObservacoesExecucao", () => {
    const items = [{ ...base, ObservacoesExecucao: "Filtro sujo" }];
    const result = extractObservations(items);
    expect(result).toHaveLength(1);
    expect(result[0].obs).toBe("Filtro sujo");
  });

  it("extrai NC quando TemNaoConformidade é sim", () => {
    const items = [{
      ...base,
      TemNaoConformidade: "sim",
      DescricaoNaoConformidade: "Vazamento detectado",
    }];
    const result = extractObservations(items);
    expect(result).toHaveLength(1);
    expect(result[0].nc).toBe("Vazamento detectado");
  });

  it("ignora quando não tem obs nem NC", () => {
    const items = [{ ...base }];
    const result = extractObservations(items);
    expect(result).toHaveLength(0);
  });
});
