import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useDateFilter } from "@/hooks/use-date-filter";
import type { ProgramacaoRow, SheetsData } from "@/lib/sheets-types";
import { deriveExecStatus, type ExecStatus } from "@/lib/status";

export type EnrichedRow = ProgramacaoRow & {
  _exec: ExecStatus;
  _equip: string;
};

export function enrichProgramacao(
  rows: ProgramacaoRow[],
  tagMap: Map<string, string>,
): EnrichedRow[] {
  return rows.map((p) => ({
    ...p,
    _exec: deriveExecStatus(p),
    _equip: tagMap.get((p.TAG || "").trim()) || "—",
  }));
}

export function filterByDate(
  rows: ProgramacaoRow[],
  filterFn: (date: string) => boolean,
): ProgramacaoRow[] {
  return rows.filter((p) => filterFn(p.DataReprogramada || p.DataProgramada));
}

export function useProgramacaoFilter() {
  const { data, isLoading, error } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();

  const plano = data?.planoManutencao ?? [];

  const tagMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of plano) {
      const t = (r.TAG || "").trim();
      const e = (r.EquipamentoMaquina || "").trim();
      if (t && e && !map.has(t)) map.set(t, e);
    }
    return map;
  }, [plano]);

  const raw = data?.programacao ?? [];

  const filtered = useMemo(
    () => filterByDate(raw, (d) => dateFilter.filterByDateRange(d)),
    [raw, dateFilter],
  );

  const enriched = useMemo(() => enrichProgramacao(filtered, tagMap), [filtered, tagMap]);

  return { data, isLoading, error, raw, filtered, enriched, tagMap, dateFilter };
}
