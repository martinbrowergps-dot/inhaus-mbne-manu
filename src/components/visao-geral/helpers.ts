import { parseBRDate } from "@/lib/format";

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
