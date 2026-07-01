import { useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, parseISO } from "date-fns";
import type {
  BacklogRow,
  MedicaoRow,
  ProgramacaoRow,
  SheetsData,
} from "./sheets-types";
import { parseBRDate } from "./format";
import { normalize, normalizeTipo, type TipoCanonico } from "./normalize";
import { deriveExecStatus, type ExecStatus } from "./status";

/* ────────────────────────────────────────────────────────────────
   URL Search Schema — inherited by every /_app/* route.
   ──────────────────────────────────────────────────────────────── */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoWeek = z.string().regex(/^\d{4}-W\d{2}$/);

export const filtersSearchSchema = z.object({
  dataInicial: fallback(isoDate.optional(), undefined),
  dataFinal: fallback(isoDate.optional(), undefined),
  semana: fallback(isoWeek.optional(), undefined),
  sistema: fallback(z.array(z.string()), []).default([]),
  tipo: fallback(z.array(z.string()), []).default([]),
  status: fallback(z.array(z.string()), []).default([]),
  responsavel: fallback(z.array(z.string()), []).default([]),
  criticidade: fallback(z.array(z.string()), []).default([]),
});

export const filtersSearchValidator = zodValidator(filtersSearchSchema);
export type FiltersSearch = z.infer<typeof filtersSearchSchema>;

/* ────────────────────────────────────────────────────────────────
   Hook: useFilters — read raw + resolved date range, and mutate.
   ──────────────────────────────────────────────────────────────── */

export interface ResolvedRange {
  start: Date;
  end: Date;
  isDefault: boolean;
}

export function useFilters() {
  const raw = useSearch({ strict: false }) as Partial<FiltersSearch>;
  const navigate = useNavigate();

  const setFilter = <K extends keyof FiltersSearch>(key: K, value: FiltersSearch[K]) => {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, [key]: value }),
    });
  };

  const setRange = (start: Date | undefined, end: Date | undefined) => {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        dataInicial: start ? format(start, "yyyy-MM-dd") : undefined,
        dataFinal: end ? format(end, "yyyy-MM-dd") : undefined,
      }),
    });
  };

  const reset = () => {
    navigate({
      to: ".",
      search: () => ({}),
    });
  };

  const range: ResolvedRange = useMemo(() => {
    const start = raw.dataInicial ? startOfDay(parseISO(raw.dataInicial)) : null;
    const end = raw.dataFinal ? endOfDay(parseISO(raw.dataFinal)) : null;
    if (start && end) return { start, end, isDefault: false };
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
      isDefault: true,
    };
  }, [raw.dataInicial, raw.dataFinal]);

  const filters = useMemo(
    () => ({
      dataInicial: raw.dataInicial,
      dataFinal: raw.dataFinal,
      semana: raw.semana,
      sistema: raw.sistema ?? [],
      tipo: raw.tipo ?? [],
      status: raw.status ?? [],
      responsavel: raw.responsavel ?? [],
      criticidade: raw.criticidade ?? [],
    }),
    [raw],
  );

  const hasActive =
    !!raw.dataInicial ||
    !!raw.dataFinal ||
    (raw.sistema?.length ?? 0) > 0 ||
    (raw.tipo?.length ?? 0) > 0 ||
    (raw.status?.length ?? 0) > 0 ||
    (raw.responsavel?.length ?? 0) > 0 ||
    (raw.criticidade?.length ?? 0) > 0;

  return { filters, range, setFilter, setRange, reset, hasActive };
}

/* ────────────────────────────────────────────────────────────────
   Row predicates — shared with /programação filters.
   ──────────────────────────────────────────────────────────────── */

export function osDataEfetiva(row: ProgramacaoRow): Date | null {
  return parseBRDate(row.DataReprogramada) ?? parseBRDate(row.DataProgramada);
}

interface FilterOptions {
  /** Skip period filter — for pages like HH Semanal that use their own week. */
  ignorePeriodo?: boolean;
}

export function applyFilters(
  rows: ProgramacaoRow[],
  filters: FiltersSearch,
  range: ResolvedRange,
  opts: FilterOptions = {},
): ProgramacaoRow[] {
  return rows.filter((row) => {
    if (!opts.ignorePeriodo) {
      const d = osDataEfetiva(row);
      if (!d) return false;
      if (d < range.start || d > range.end) return false;
    }
    if (filters.sistema.length && !filters.sistema.includes(row.Sistema || "—")) return false;
    if (filters.criticidade.length && !filters.criticidade.includes(row.Criticidade || "—"))
      return false;
    if (filters.responsavel.length && !filters.responsavel.includes(row.Executante || "—"))
      return false;
    if (filters.tipo.length) {
      const tipo = normalizeTipo(row.Tipo);
      if (!filters.tipo.includes(tipo)) return false;
    }
    if (filters.status.length) {
      const st = deriveExecStatus(row);
      if (!filters.status.includes(st)) return false;
    }
    return true;
  });
}

/* ────────────────────────────────────────────────────────────────
   Derived hooks — every page should read from these.
   ──────────────────────────────────────────────────────────────── */

export function useFilteredProgramacao(
  data: SheetsData | undefined,
  opts?: FilterOptions,
): ProgramacaoRow[] {
  const { filters, range } = useFilters();
  return useMemo(
    () => (data ? applyFilters(data.programacao, filters as FiltersSearch, range, opts) : []),
    [data, filters, range, opts],
  );
}

export function useFilteredBacklog(data: SheetsData | undefined): BacklogRow[] {
  const { filters, range } = useFilters();
  return useMemo(() => {
    if (!data) return [];
    return data.backlog.filter((row) => {
      const d = parseBRDate(row.DataCriacao);
      if (!d) return true; // keep undated backlog entries
      if (d < range.start || d > range.end) return false;
      if (filters.responsavel.length && !filters.responsavel.includes(row.Tecnico || "—"))
        return false;
      if (filters.criticidade.length && !filters.criticidade.includes(row.Prioridade || "—"))
        return false;
      return true;
    });
  }, [data, filters, range]);
}

export function useFilteredMedicoes(data: SheetsData | undefined): MedicaoRow[] {
  const { range } = useFilters();
  return useMemo(() => {
    if (!data) return [];
    return data.medicoes.filter((m) => {
      const d = parseBRDate(m.DATA);
      if (!d) return true;
      return d >= range.start && d <= range.end;
    });
  }, [data, range]);
}

/* ────────────────────────────────────────────────────────────────
   Facet extraction — for populating multi-selects.
   ──────────────────────────────────────────────────────────────── */

export interface Facets {
  sistemas: string[];
  tipos: TipoCanonico[];
  statuses: ExecStatus[];
  responsaveis: string[];
  criticidades: string[];
}

export function buildFacets(rows: ProgramacaoRow[]): Facets {
  const sistemas = new Set<string>();
  const tipos = new Set<TipoCanonico>();
  const statuses = new Set<ExecStatus>();
  const responsaveis = new Set<string>();
  const criticidades = new Set<string>();
  for (const r of rows) {
    if (r.Sistema) sistemas.add(r.Sistema);
    tipos.add(normalizeTipo(r.Tipo));
    statuses.add(deriveExecStatus(r));
    if (r.Executante) responsaveis.add(r.Executante);
    if (r.Criticidade) criticidades.add(r.Criticidade);
  }
  const sortStr = (a: string, b: string) => normalize(a).localeCompare(normalize(b));
  return {
    sistemas: [...sistemas].sort(sortStr),
    tipos: [...tipos].sort(sortStr),
    statuses: [...statuses].sort(sortStr),
    responsaveis: [...responsaveis].sort(sortStr),
    criticidades: [...criticidades].sort(sortStr),
  };
}
