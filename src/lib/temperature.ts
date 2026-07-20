import type { MedicaoRow } from "./sheets-types";
import { parseBRDate } from "./format";

export type LocalTipo = "ANTECAMARA" | "CONGELADOS" | "RESFRIADOS" | "OUTRO";
export type TempStatus = "normal" | "alerta" | "critico";
export type TempRange = "24h" | "7d" | "30d";
export type SensorKey = "TEMPERATURA_01" | "TEMPERATURA_02";
export const SENSOR_KEYS: SensorKey[] = ["TEMPERATURA_01", "TEMPERATURA_02"];

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
  return r.TEMPERATURA_01 ?? r.TEMPERATURA_02;
}

export function allReadings(r: MedicaoRow): { key: SensorKey; temp: number | null }[] {
  return SENSOR_KEYS.map((k) => ({ key: k, temp: r[k] }));
}

export function allValidTemps(r: MedicaoRow): number[] {
  return SENSOR_KEYS.map((k) => r[k]).filter((t): t is number => t !== null);
}

export interface LocalSummary {
  local: string;
  tipo: LocalTipo;
  temperatura: number | null;
  status: TempStatus;
  tecnico: string;
  timestamp: Date | null;
  outlier?: boolean;
  readings: { key: SensorKey; temp: number | null; status: TempStatus }[];
}

export function computeOutlierMap(medicoes: MedicaoRow[]): Map<string, boolean> {
  const byLocal = new Map<string, number[]>();
  for (const m of medicoes) {
    if (!m.LOCAL) continue;
    const arr = byLocal.get(m.LOCAL) ?? [];
    const t = latestTemp(m);
    if (t !== null) arr.push(t);
    byLocal.set(m.LOCAL, arr);
  }

  const result = new Map<string, boolean>();
  for (const [local, temps] of byLocal) {
    if (temps.length < 3) { result.set(local, false); continue; }

    const faixa = getFaixa(classifyLocal(local));
    let has = false;

    for (const t of temps) {
      if (faixa) {
        const rw = faixa.max - faixa.min || 1;
        if (t < faixa.min - rw * 3 || t > faixa.max + rw * 3) { has = true; break; }
      }
    }

    if (!has && temps.length >= 5) {
      const mean = temps.reduce((s, v) => s + v, 0) / temps.length;
      const variance = temps.reduce((s, v) => s + (v - mean) ** 2, 0) / temps.length;
      const stddev = Math.sqrt(variance);
      if (stddev > 0.5) {
        for (const t of temps) {
          const outsideFaixa = !faixa || t < faixa.min || t > faixa.max;
          if (outsideFaixa && Math.abs(t - mean) > 3 * stddev) { has = true; break; }
        }
      }
    }

    result.set(local, has);
  }
  return result;
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
  const outlierMap = computeOutlierMap(medicoes);
  return Array.from(byLocal.values()).map((m) => {
    const tipo = classifyLocal(m.LOCAL);
    const readings = allReadings(m).map((r) => ({
      ...r,
      status: tempStatus(r.temp, tipo),
    }));
    // pick worst reading as representative
    const worst = readings.reduce<{ key: SensorKey; temp: number | null; status: TempStatus }>((w, r) => {
      if (r.status === "critico") return r;
      if (r.status === "alerta" && w.status !== "critico") return r;
      return w;
    }, readings[0] ?? { key: "TEMPERATURA_01" as SensorKey, temp: null, status: "normal" as TempStatus });
    return {
      local: m.LOCAL,
      tipo,
      temperatura: worst.temp,
      status: worst.status,
      readings,
      tecnico: m.TECNICO,
      timestamp: getRowTimestamp(m),
      outlier: outlierMap.get(m.LOCAL) ?? false,
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

export interface MultiSeriesPoint {
  t: number;
  tecnico: string;
  TEMPERATURA_01: number | null;
  TEMPERATURA_02: number | null;
}

export function buildMultiSeries(
  medicoes: MedicaoRow[],
  local: string,
): MultiSeriesPoint[] {
  return medicoes
    .filter((m) => m.LOCAL === local)
    .map((m) => {
      const t = getRowTimestamp(m);
      if (!t) return null;
      return {
        t: t.getTime(),
        tecnico: m.TECNICO,
        TEMPERATURA_01: m.TEMPERATURA_01,
        TEMPERATURA_02: m.TEMPERATURA_02,
      } as MultiSeriesPoint;
    })
    .filter((x): x is MultiSeriesPoint => x !== null)
    .sort((a, b) => a.t - b.t);
}

export function buildSensorSeries(
  medicoes: MedicaoRow[],
  local: string,
  sensorKey: SensorKey,
  tipo?: LocalTipo,
): SeriesPoint[] {
  const lt = tipo ?? classifyLocal(local);
  return medicoes
    .filter((m) => m.LOCAL === local)
    .map((m) => {
      const t = getRowTimestamp(m);
      const temp = m[sensorKey];
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

export function computeMultiRangeKpis(
  series: MultiSeriesPoint[],
  tipo: LocalTipo,
) {
  const faixa = getFaixa(tipo);
  if (series.length === 0 || !faixa) {
    return { count: 0, pctNaFaixa: 0, criticos: 0, desvioMax: 0, media: null };
  }
  let dentro = 0;
  let criticos = 0;
  let desvioMax = 0;
  let soma = 0;
  let total = 0;
  for (const p of series) {
    for (const sk of SENSOR_KEYS) {
      const temp = p[sk];
      if (temp === null) continue;
      total++;
      soma += temp;
      const st = tempStatus(temp, tipo);
      if (st === "critico") criticos++;
      if (temp >= faixa.min && temp <= faixa.max) dentro++;
      const desvio =
        temp < faixa.min ? faixa.min - temp : temp > faixa.max ? temp - faixa.max : 0;
      if (desvio > desvioMax) desvioMax = desvio;
    }
  }
  return {
    count: total,
    pctNaFaixa: total > 0 ? (dentro / total) * 100 : 0,
    criticos,
    desvioMax,
    media: total > 0 ? soma / total : null,
  };
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

const GRACE_PERIOD_MS = 4 * 3_600_000;

export interface DurationAlert {
  currentDurationMs: number;
  currentDurationLabel: string;
  excessDurationMs: number;
  excessDurationLabel: string;
  violations: number;
  isViolation: boolean;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0min";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function computeOutOfRangeDuration(
  series: SeriesPoint[],
  faixa: { min: number; max: number } | null,
): DurationAlert {
  if (series.length === 0 || !faixa) {
    return { currentDurationMs: 0, currentDurationLabel: "0min", excessDurationMs: 0, excessDurationLabel: "0min", violations: 0, isViolation: false };
  }

  let streakStart: number | null = null;
  let streakEnd: number | null = null;
  let violations = 0;

  const isOutside = (p: SeriesPoint) => p.temp < faixa.min || p.temp > faixa.max;

  for (const p of series) {
    if (isOutside(p)) {
      if (streakStart === null) streakStart = p.t;
      streakEnd = p.t;
    } else if (streakStart !== null) {
      const dur = streakEnd! - streakStart;
      if (dur > GRACE_PERIOD_MS) violations++;
      streakStart = null;
      streakEnd = null;
    }
  }

  const currentDuration =
    streakStart !== null && streakEnd !== null ? streakEnd - streakStart : 0;

  if (currentDuration > GRACE_PERIOD_MS) violations++;

  const excessMs = Math.max(0, currentDuration - GRACE_PERIOD_MS);

  return {
    currentDurationMs: currentDuration,
    currentDurationLabel: formatDuration(currentDuration),
    excessDurationMs: excessMs,
    excessDurationLabel: formatDuration(excessMs),
    violations,
    isViolation: currentDuration > GRACE_PERIOD_MS,
  };
}

export function computeDurationAlerts(
  medicoes: MedicaoRow[],
): Map<string, DurationAlert> {
  const locais = uniqueLocais(medicoes);
  const map = new Map<string, DurationAlert>();
  for (const local of locais) {
    const tipo = classifyLocal(local);
    const faixa = getFaixa(tipo);
    if (!faixa) continue;
    const multi = buildMultiSeries(medicoes, local);
    let worst: DurationAlert = { currentDurationMs: 0, currentDurationLabel: "0min", excessDurationMs: 0, excessDurationLabel: "0min", violations: 0, isViolation: false };
    for (const sk of SENSOR_KEYS) {
      const sensorSeries: SeriesPoint[] = multi
        .map((p) => {
          const temp = p[sk];
          if (temp === null) return null;
          return { t: p.t, temp, tecnico: p.tecnico, status: tempStatus(temp, tipo) } as SeriesPoint;
        })
        .filter((x): x is SeriesPoint => x !== null);
      if (sensorSeries.length === 0) continue;
      const alert = computeOutOfRangeDuration(sensorSeries, faixa);
      if (alert.currentDurationMs > worst.currentDurationMs) worst = alert;
    }
    map.set(local, worst);
  }
  return map;
}
