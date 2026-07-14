import { Calendar, Play, CheckCircle2, Ban, AlertOctagon, Clock } from "lucide-react";
import { KpiStrip } from "@/components/kpi-carousel";
import { formatBRNumber } from "@/lib/format";
import type { EnrichedRow } from "./types";

export function SummaryCards({
  filtered,
  sumHH,
}: {
  filtered: EnrichedRow[];
  sumHH: (rows: EnrichedRow[]) => number;
}) {
  const prog = filtered.filter((r) => r._status === "Programada").length;
  const exec = filtered.filter((r) => r._status === "Em execução").length;
  const atr = filtered.filter((r) => r._status === "Atrasada").length;
  const fin = filtered.filter((r) => r._status === "Finalizada").length;
  const can = filtered.filter((r) => r._status === "Cancelada").length;
  const hh = sumHH(filtered);
  return (
    <KpiStrip
      items={[
        { label: "Programadas", value: prog, icon: Calendar, variant: "primary" },
        { label: "Em Execução", value: exec, icon: Play, variant: "warning" },
        {
          label: "Atrasadas",
          value: atr,
          icon: AlertOctagon,
          variant: atr > 0 ? "danger" : "neutral",
        },
        { label: "Finalizadas", value: fin, icon: CheckCircle2, variant: "success" },
        { label: "Canceladas", value: can, icon: Ban, variant: "neutral" },
        {
          label: "HH Total",
          value: `${formatBRNumber(hh, 1)}h`,
          icon: Clock,
          variant: "neutral",
        },
      ]}
    />
  );
}
