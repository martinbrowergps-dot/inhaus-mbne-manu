import type { MedicaoRow } from "./sheets-types";
import { parseBRDate } from "./format";

export type LocalTipo = "ANTECAMARA" | "CONGELADOS" | "RESFRIADOS" | "OUTRO";
export type TempStatus = "normal" | "alerta" | "critico";

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
