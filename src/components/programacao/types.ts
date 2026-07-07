import type { ProgramacaoRow } from "@/lib/sheets-types";
import type { ExecStatus } from "@/lib/status";

export type EnrichedRow = ProgramacaoRow & {
  _status: ExecStatus;
  _diasAtraso: number | null;
  _date: Date | null;
};

export function daysOverdue(d: Date | null): number | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - dd.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

export function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
