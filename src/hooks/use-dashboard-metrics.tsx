import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useDateFilter } from "@/hooks/use-date-filter";
import { deriveExecStatus } from "@/lib/status";
import { summarizeLocais } from "@/lib/temperature";
import { computeAderencia } from "@/components/aderencia-card";
import {
  aggregateQuebrasBySolicitante,
  aggregateByDay,
  aggregateByDayAndStatus,
  computePrevDateRange,
} from "@/lib/domain/aggregates";
import { aggregate } from "@/lib/chart-utils";
import type { ProgramacaoRow, MedicaoRow } from "@/lib/sheets-types";

export function useDashboardMetrics() {

  const { data, isLoading, error } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();

  const metrics = useMemo(() => {
    if (!data) return null;

    const { programacao, tecnicos, medicoes } = data;
    
    // Filtro principal
    const programacaoFiltrada = (programacao ?? []).filter((p) =>
      dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
    );
    const medicoesFiltradas = (medicoes ?? []).filter((m) => dateFilter.filterByDateRange(m.DATA));
    
    // Enriquecimento e status
    const enriched = programacaoFiltrada.map((p) => ({ ...p, _execStatus: deriveExecStatus(p) }));
    
    // Contadores básicos
    const total = programacaoFiltrada.length;
    const programadas = enriched.filter((p) => p._execStatus === "Programada").length;
    const emAndamento = enriched.filter((p) => p._execStatus === "Em execução").length;
    const finalizadas = enriched.filter((p) => p._execStatus === "Finalizada").length;
    const canceladas = enriched.filter((p) => p._execStatus === "Cancelada").length;
    const atrasadas = enriched.filter((p) => p._execStatus === "Atrasada").length;
    const aa = programacaoFiltrada.filter((p) => p.Criticidade?.toUpperCase() === "AA").length;
    const totalHH = programacaoFiltrada.reduce((s, p) => s + (p.HH || 0), 0);

    // Temperatura
    const locais = summarizeLocais(medicoesFiltradas);
    const tempAlerta = locais.filter((l) => l.status !== "normal").length;

    // Agregações
    const bySistema = aggregate(programacaoFiltrada, (p: ProgramacaoRow) => p.Sistema || "—");
    const byCriticidade = aggregate(programacaoFiltrada, (p: ProgramacaoRow) => p.Criticidade || "—");
    const byDia = aggregateByDay(programacaoFiltrada);
    const byStatus = aggregate(enriched, (p: any) => p._execStatus);
    const aderencia = computeAderencia(programacaoFiltrada);

    const byPlanejamento = aggregate(programacaoFiltrada, (p: ProgramacaoRow) => {
      const s = (p.Status || "").trim();
      if (s === "Planejado") return "Planejado";
      if (s === "Não Planejado") return "Não Planejado";
      return s || "—";
    });
    const planejados = byPlanejamento.find((p) => p.name === "Planejado")?.value ?? 0;
    const naoPlanejados = byPlanejamento.find((p) => p.name === "Não Planejado")?.value ?? 0;


    const byPlanejamentoDia = aggregateByDayAndStatus(programacaoFiltrada);
    const quebras = aggregateQuebrasBySolicitante(programacaoFiltrada);

    // Período Anterior para Comparação
    const prevRange = computePrevDateRange(dateFilter.startDate, dateFilter.endDate);
    const programacaoPrev = prevRange
      ? (programacao ?? []).filter((p) => {
          const d = p.DataReprogramada || p.DataProgramada;
          if (!d) return false;
          let dt: Date | null = null;
          try {
            dt = new Date(String(d).split("/").reverse().join("-") + "T00:00:00");
          } catch { /* empty */ }
          if (!dt) return false;
          const pStart = new Date(prevRange.start + "T00:00:00");
          const pEnd = new Date(prevRange.end + "T00:00:00");
          return dt >= pStart && dt <= pEnd;
        })
      : [];

    const prevEnriched = programacaoPrev.map((p) => ({
      ...p,
      _execStatus: deriveExecStatus(p),
    }));

    return {
      raw: data,
      programacaoFiltrada,
      medicoesFiltradas,
      enriched,
      counts: {
        total,
        programadas,
        emAndamento,
        finalizadas,
        canceladas,
        atrasadas,
        aa,
        totalHH,
        tempAlerta,
        tecnicos: tecnicos.length,
      },
      charts: {
        bySistema,
        byCriticidade,
        byDia,
        byStatus,
        byPlanejamento,
        byPlanejamentoDia,
        quebras,
        planejados,
        naoPlanejados,
      },
      aderencia,
      prev: {
        total: programacaoPrev.length,
        programadas: prevEnriched.filter((p) => p._execStatus === "Programada").length,
        finalizadas: prevEnriched.filter((p) => p._execStatus === "Finalizada").length,
        canceladas: prevEnriched.filter((p) => p._execStatus === "Cancelada").length,
        atrasadas: prevEnriched.filter((p) => p._execStatus === "Atrasada").length,
        totalHH: programacaoPrev.reduce((s, p) => s + (p.HH || 0), 0),
      },
    };
  }, [data, dateFilter.startDate, dateFilter.endDate, dateFilter.filterByDateRange]);

  return {
    metrics,
    isLoading,
    error,
    dateFilter,
  };
}
