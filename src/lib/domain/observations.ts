import type { ProgramacaoRow } from "@/lib/sheets-types";
import { parseBRDate, formatBRDate } from "@/lib/format";

export interface Observation {
  os: string;
  data: string;
  obs: string;
  nc: string;
  dataFormatted: string;
}

export function extractObservations(rows: ProgramacaoRow[]): Observation[] {
  return rows
    .filter((p) => {
      const obs = (p.ObservacoesExecucao || "").trim();
      const nc = (p.DescricaoNaoConformidade || "").trim();
      return obs || (nc && /sim|s|não conform/i.test(p.TemNaoConformidade || "sim"));
    })
    .map((p) => {
      const d = parseBRDate(p.DataProgramada);
      return {
        os: p.NumeroOS,
        data: p.DataProgramada,
        obs: (p.ObservacoesExecucao || "").trim(),
        nc: (p.DescricaoNaoConformidade || "").trim(),
        dataFormatted: d ? formatBRDate(d) : p.DataProgramada,
      };
    });
}
