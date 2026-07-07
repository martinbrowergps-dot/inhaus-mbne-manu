import { Calendar, Play, CheckCircle2, Ban, AlertOctagon, Clock } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { formatBRNumber } from "@/lib/format";
import type { EnrichedRow } from "./types";

export function SummaryCards({ filtered, sumHH }: { filtered: EnrichedRow[]; sumHH: (rows: EnrichedRow[]) => number }) {
  const prog = filtered.filter((r) => r._status === "Programada").length;
  const exec = filtered.filter((r) => r._status === "Em execução").length;
  const atr  = filtered.filter((r) => r._status === "Atrasada").length;
  const fin  = filtered.filter((r) => r._status === "Finalizada").length;
  const can  = filtered.filter((r) => r._status === "Cancelada").length;
  const hh   = sumHH(filtered);
  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Programadas" value={prog} icon={Calendar} variant="primary" />
      <KpiCard label="Em Execução" value={exec} icon={Play} variant="warning" />
      <KpiCard label="Atrasadas" value={atr} icon={AlertOctagon} variant={atr > 0 ? "danger" : "neutral"} />
      <KpiCard label="Finalizadas" value={fin} icon={CheckCircle2} variant="success" />
      <KpiCard label="Canceladas" value={can} icon={Ban} variant="neutral" />
      <KpiCard label="HH Total" value={`${formatBRNumber(hh, 1)}h`} icon={Clock} variant="neutral" />
    </div>
  );
}
