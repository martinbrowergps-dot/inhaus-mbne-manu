import { Thermometer, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalSummary } from "@/lib/temperature";
import { getFaixa } from "@/lib/temperature";
import { formatBRDateTime, formatBRNumber } from "@/lib/format";

export function TempCard({ summary }: { summary: LocalSummary }) {
  const faixa = getFaixa(summary.tipo);
  const isCritico = summary.status === "critico";
  const isAlerta = summary.status === "alerta";

  const statusConfig = {
    normal: {
      color: "text-success",
      bg: "border-success/40 bg-success/5",
      Icon: CheckCircle2,
      label: "NORMAL",
    },
    alerta: {
      color: "text-warning",
      bg: "border-warning/50 bg-warning/5",
      Icon: AlertTriangle,
      label: "ALERTA",
    },
    critico: {
      color: "text-destructive",
      bg: "border-destructive/60 bg-destructive/10 pulse-critical",
      Icon: AlertOctagon,
      label: "CRÍTICO",
    },
  }[summary.status];
  const StatusIcon = statusConfig.Icon;

  return (
    <div
      className={cn(
        "fade-up rounded-xl border p-4 transition-all hover:-translate-y-0.5",
        statusConfig.bg,
        isCritico ? "panel-glass neon-glow-pulse" : "panel",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className={cn("h-4 w-4", statusConfig.color)} />
          <span className="text-xs font-bold tracking-wider text-foreground uppercase">
            {summary.local}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] font-bold tracking-wider",
            statusConfig.color,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div className={cn("num text-4xl font-bold", statusConfig.color)}>
          {summary.temperatura !== null ? `${formatBRNumber(summary.temperatura, 1)}°` : "—"}
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">C</span>
        </div>
        {faixa && (
          <div className="text-right text-[10px] text-muted-foreground">
            <div className="tracking-wider">FAIXA</div>
            <div className="num text-foreground">
              {faixa.min}° / {faixa.max}°
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
        <span className="truncate">{summary.tecnico || "—"}</span>
        <span className="num">{formatBRDateTime(summary.timestamp)}</span>
      </div>
    </div>
  );
}
