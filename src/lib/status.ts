import type { ProgramacaoRow } from "./sheets-types";
import { parseBRDate } from "./format";

export type ExecStatus =
  | "Programada"
  | "Em execução"
  | "Pausada"
  | "Finalizada"
  | "Cancelada"
  | "Atrasada"
  | "Reprogramada";

export const EXEC_STATUSES: ExecStatus[] = [
  "Programada",
  "Em execução",
  "Pausada",
  "Atrasada",
  "Reprogramada",
  "Finalizada",
  "Cancelada",
];

export const PROGRAMADO_STATUSES: ExecStatus[] = [
  "Programada",
  "Em execução",
  "Pausada",
  "Atrasada",
  "Reprogramada",
];

export const EXECUTADO_STATUSES: ExecStatus[] = ["Finalizada", "Cancelada"];

export function deriveExecStatus(row: ProgramacaoRow): ExecStatus {
  const raw = (row.StatusExecucao || row.Status || "").toLowerCase();

  if (/finaliz|conclu/.test(raw)) return "Finalizada";
  if (/cancel/.test(raw)) return "Cancelada";
  if (/pausa/.test(raw)) return "Pausada";
  if (/execu|andamento/.test(raw)) return "Em execução";

  // derived
  const reprog = (row.DataReprogramada || "").trim();
  if (reprog) return "Reprogramada";

  const dProg = parseBRDate(row.DataProgramada);
  if (dProg) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dProg < today) return "Atrasada";
  }
  return "Programada";
}

export interface StatusStyle {
  label: string;
  badgeClass: string;
  dotClass: string;
  pulse?: boolean;
}

export const STATUS_STYLES: Record<ExecStatus, StatusStyle> = {
  Programada: {
    label: "Programada",
    badgeClass: "border-primary/40 bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  "Em execução": {
    label: "Em execução",
    badgeClass: "border-warning/40 bg-warning/10 text-warning",
    dotClass: "bg-warning",
  },
  Pausada: {
    label: "Pausada",
    badgeClass: "border-muted-foreground/40 bg-muted/40 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  Finalizada: {
    label: "Finalizada",
    badgeClass: "border-success/40 bg-success/10 text-success",
    dotClass: "bg-success",
  },
  Cancelada: {
    label: "Cancelada",
    badgeClass: "border-destructive/40 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
  Atrasada: {
    label: "Atrasada",
    badgeClass: "border-destructive/50 bg-destructive/15 text-destructive",
    dotClass: "bg-destructive",
    pulse: true,
  },
  Reprogramada: {
    label: "Reprogramada",
    badgeClass: "border-secondary/50 bg-secondary/15 text-secondary-foreground",
    dotClass: "bg-secondary",
  },
};
