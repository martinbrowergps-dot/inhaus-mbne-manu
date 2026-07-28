import type { ProgramacaoRow } from "@/lib/sheets-types";
import { aggregate } from "@/lib/chart-utils";
import { parseBRDate, fmtISO } from "@/lib/format";

export function aggregateByMonth(rows: ProgramacaoRow[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const p of rows) {
    const d = parseBRDate(p.DataProgramada);
    if (!d) continue;
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const [ma, ya] = a.name.split("/").map(Number);
      const [mb, yb] = b.name.split("/").map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    });
}

export function aggregateHHByCargo(
  rows: ProgramacaoRow[],
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const p of rows) {
    map.set(p.Cargo || "—", (map.get(p.Cargo || "—") ?? 0) + (p.HH || 0));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateStatus(
  enriched: { _exec: string }[],
): { name: string; value: number }[] {
  return aggregate(enriched, (p) => p._exec);
}

export function aggregateCriticidade(
  rows: ProgramacaoRow[],
): { name: string; value: number }[] {
  return aggregate(rows, (p) => p.Criticidade || "—");
}

export function aggregateQuebrasBySolicitante(
  rows: ProgramacaoRow[],
): { name: string; value: number }[] {
  return rows
    .filter((p) => (p.Tipo || "").toUpperCase() === "QUEBRA DE PROGRAMAÇÃO")
    .reduce<{ name: string; value: number }[]>((acc, p) => {
      const name = p.SolicitanteQuebra || "Não informado";
      const existing = acc.find((a) => a.name === name);
      if (existing) existing.value++;
      else acc.push({ name, value: 1 });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);
}

// ── HH aggregate ──

export function aggregateHH(rows: { Cargo: string; HH: number }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.Cargo || "—";
    map.set(k, (map.get(k) ?? 0) + (r.HH || 0));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
    .sort((a, b) => b.value - a.value);
}

// ── Day aggregates ──

export function aggregateByDay(rows: { DataProgramada: string }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = parseBRDate(r.DataProgramada);
    if (!d) continue;
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      const [da, ma] = a[0].split("/").map(Number);
      const [db, mb] = b[0].split("/").map(Number);
      return ma - mb || da - db;
    })
    .slice(0, 14)
    .map(([label, value]) => ({ label, value }));
}
export function aggregateByDayAndStatus(rows: { DataProgramada: string; Status: string }[]) {
  const map = new Map<string, { planejado: number; naoPlanejado: number; label: string }>();
  for (const r of rows) {
    const d = parseBRDate(r.DataProgramada);
    if (!d) continue;
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const e = map.get(key) ?? { planejado: 0, naoPlanejado: 0, label: key };
    const status = (r.Status || "").trim();
    const isPlanejado = status === "Planejado";
    if (isPlanejado) e.planejado++;
    else e.naoPlanejado++;
    map.set(key, e);
  }
  return Array.from(map.values())
    .sort((a, b) => {
      const [da, ma] = a.label.split("/").map(Number);
      const [db, mb] = b.label.split("/").map(Number);
      return ma - mb || da - db;
    })
    .slice(-14);
}

// ── Trend helpers ──

export function computePrevDateRange(startDate: string, endDate: string): { start: string; end: string } | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diffDays = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return null;
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays - 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  return { start: fmtISO(prevStart), end: fmtISO(prevEnd) };
}

export function computeTrend(
  current: number,
  previous: number,
): { direction: "up" | "down" | "flat"; pct: string } | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return { direction: "up", pct: "+100%" };
  const change = ((current - previous) / previous) * 100;
  const pct = `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
  if (Math.abs(change) < 1) return { direction: "flat", pct };
  return { direction: change > 0 ? "up" : "down", pct };
}


