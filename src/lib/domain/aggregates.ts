import type { ProgramacaoRow } from "@/lib/sheets-types";
import { aggregate } from "@/lib/chart-utils";
import { parseBRDate } from "@/lib/format";

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
