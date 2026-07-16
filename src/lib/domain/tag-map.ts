import type { PlanoManutencaoRow } from "@/lib/sheets-types";

export function buildTagMap(plano: PlanoManutencaoRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of plano) {
    const t = (r.TAG || "").trim();
    const e = (r.EquipamentoMaquina || "").trim();
    if (t && e && !map.has(t)) map.set(t, e);
  }
  return map;
}

export function assetLabel(tag: string, tagMap: Map<string, string>): string {
  const e = tagMap.get(tag);
  return e ? `${e} (${tag})` : tag;
}
