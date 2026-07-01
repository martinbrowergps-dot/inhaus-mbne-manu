import type { MedicaoRow } from "./sheets-types";
import { parseBRDate } from "./format";

export type LocalTipo = "ANTECAMARA" | "CONGELADOS" | "RESFRIADOS" | "OUTRO";
export type TempStatus = "normal" | "alerta" | "critico";
export type TempRange = "24h" | "7d" | "30d";

const FAIXAS: Record<Exclude<LocalTipo, "OUTRO">, { min: number; max: number }> = {
  ANTECAMARA: { min: 1, max: 7 },
  CONGELADOS: { min: -23, max: -20 },
  RESFRIADOS: { min: 1, max: 4 },
};

export function classifyLocal(local: string): LocalTipo {
  const u = (local || "").toUpperCase();
  if (u.includes("ANTEC")) return "ANTECAMARA";
  if (u.includes("CONGEL")) return "CONGELADOS";
  if (u.includes("RESFR")) return "RESFRIADOS";
  return "OUTRO";
}

export function getFaixa(tipo: LocalTipo) {
  if (tipo === "OUTRO") return null;
  return FAIXAS[tipo];
}

export function tempStatus(temp: number | null, tipo: LocalTipo): TempStatus {
  if (temp === null || tipo === "OUTRO") return "normal";
  const f = FAIXAS[tipo];
  if (temp < f.min - 1 || temp > f.max + 1) return "critico";
  if (temp < f.min || temp > f.max) return "alerta";
  return "normal";
}

export function getRowTimestamp(r: MedicaoRow): Date | null {
  const d = parseBRDate(r.DATA);
  if (!d) return null;
  if (r.HORA) {
    const m = r.HORA.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (m) {
      d.setHours(Number(m[1]), Number(m[2]), Number(m[3] ?? 0));
    }
  }
  return d;
}

export function latestTemp(r: MedicaoRow): number | null {
  return r.TEMPERATURA_01 ?? r.TEMPERATURA_02 ?? r.TEMPERATURA_03 ?? r.TEMPERATURA_04;
}

export interface LocalSummary {
  local: string;
  tipo: LocalTipo;
  temperatura: number | null;
  status: TempStatus;
  tecnico: string;
  timestamp: Date | null;
}

export function summarizeLocais(medicoes: MedicaoRow[]): LocalSummary[] {
  const byLocal = new Map<string, MedicaoRow>();
  for (const m of medicoes) {
    if (!m.LOCAL) continue;
    const prev = byLocal.get(m.LOCAL);
    const t = getRowTimestamp(m);
    const prevT = prev ? getRowTimestamp(prev) : null;
    if (!prev || (t && (!prevT || t > prevT))) byLocal.set(m.LOCAL, m);
  }
  return Array.from(byLocal.values()).map((m) => {
    const tipo = classifyLocal(m.LOCAL);
    const temp = latestTemp(m);
    return {
      local: m.LOCAL,
      tipo,
      temperatura: temp,
      status: tempStatus(temp, tipo),
      tecnico: m.TECNICO,
      timestamp: getRowTimestamp(m),
    };
  });
}

const RANGE_MS: Record<TempRange, number> = {
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "30d": 30 * 24 * 60 * 60_000,
};

export function filterByRange(medicoes: MedicaoRow[], range: TempRange): MedicaoRow[] {
  const cutoff = Date.now() - RANGE_MS[range];
  return medicoes.filter((m) => {
    const t = getRowTimestamp(m);
    return t !== null && t.getTime() >= cutoff;
  });
}

export interface SeriesPoint {
  t: number;
  temp: number;
  tecnico: string;
  status: TempStatus;
}

export function buildSeries(
  medicoes: MedicaoRow[],
  local: string,
  tipo?: LocalTipo,
): SeriesPoint[] {
  const lt = tipo ?? classifyLocal(local);
  return medicoes
    .filter((m) => m.LOCAL === local)
    .map((m) => {
      const t = getRowTimestamp(m);
      const temp = latestTemp(m);
      if (!t || temp === null) return null;
      return {
        t: t.getTime(),
        temp,
        tecnico: m.TECNICO,
        status: tempStatus(temp, lt),
      } as SeriesPoint;
    })
    .filter((x): x is SeriesPoint => x !== null)
    .sort((a, b) => a.t - b.t);
}

export interface RangeKpis {
  count: number;
  pctNaFaixa: number;
  criticos: number;
  desvioMax: number;
  media: number | null;
}

export function computeRangeKpis(
  series: SeriesPoint[],
  faixa: { min: number; max: number } | null,
): RangeKpis {
  if (series.length === 0) {
    return { count: 0, pctNaFaixa: 0, criticos: 0, desvioMax: 0, media: null };
  }
  let dentro = 0;
  let criticos = 0;
  let desvioMax = 0;
  let soma = 0;
  for (const p of series) {
    soma += p.temp;
    if (p.status === "critico") criticos++;
    if (faixa) {
      if (p.temp >= faixa.min && p.temp <= faixa.max) dentro++;
      const desvio =
        p.temp < faixa.min ? faixa.min - p.temp : p.temp > faixa.max ? p.temp - faixa.max : 0;
      if (desvio > desvioMax) desvioMax = desvio;
    } else {
      dentro++;
    }
  }
  return {
    count: series.length,
    pctNaFaixa: (dentro / series.length) * 100,
    criticos,
    desvioMax,
    media: soma / series.length,
  };
}

export function uniqueLocais(medicoes: MedicaoRow[]): string[] {
  const set = new Set<string>();
  for (const m of medicoes) if (m.LOCAL) set.add(m.LOCAL);
  return Array.from(set).sort();
}
