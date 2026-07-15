import { Thermometer, AlertTriangle, AlertOctagon, CheckCircle2, Timer, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalSummary, DurationAlert, TempStatus } from "@/lib/temperature";
import { getFaixa } from "@/lib/temperature";
import { formatBRDateTime, formatBRNumber } from "@/lib/format";

const SENSOR_LABEL: Record<string, string> = {
  TEMPERATURA_01: "01",
  TEMPERATURA_02: "02",
  TEMPERATURA_03: "03",
  TEMPERATURA_04: "04",
};

function sensorStatusConfig(status: TempStatus) {
  switch (status) {
    case "critico":
      return { color: "text-destructive", bg: "bg-destructive/15 border-destructive/40", dot: "bg-destructive" };
    case "alerta":
      return { color: "text-warning", bg: "bg-warning/10 border-warning/30", dot: "bg-warning" };
    default:
      return { color: "text-success", bg: "bg-success/10 border-success/20", dot: "bg-success" };
  }
}

export function TempCard({ summary, durationInfo }: { summary: LocalSummary; durationInfo?: DurationAlert }) {
  const faixa = getFaixa(summary.tipo);
  const isCritico = summary.status === "critico";

  const overallConfig = {
    normal: { color: "text-success", bg: "border-success/40 bg-success/5", Icon: CheckCircle2, label: "NORMAL" },
    alerta: { color: "text-warning", bg: "border-warning/50 bg-warning/5", Icon: AlertTriangle, label: "ALERTA" },
    critico: { color: "text-destructive", bg: "border-destructive/60 bg-destructive/10 pulse-critical", Icon: AlertOctagon, label: "CRÍTICO" },
  }[summary.status];
  const OverallIcon = overallConfig.Icon;

  const validReadings = summary.readings.filter((r) => r.temp !== null);
  const media = validReadings.length > 0
    ? validReadings.reduce((s, r) => s + r.temp!, 0) / validReadings.length
    : null;

  return (
    <div
      className={cn(
        "fade-up rounded-xl border p-4 transition-all hover:-translate-y-0.5",
        overallConfig.bg,
        isCritico ? "panel-glass neon-glow-pulse" : "panel",
      )}
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Thermometer className={cn("h-4 w-4 shrink-0", overallConfig.color)} />
          <span className="truncate text-xs font-bold tracking-wider text-foreground uppercase">
            {summary.local}
          </span>
        </div>
        <div className={cn("flex items-center gap-1 text-[10px] font-bold tracking-wider shrink-0", overallConfig.color)}>
          <OverallIcon className="h-3 w-3" />
          {overallConfig.label}
        </div>
      </div>

      {/* 4 sensors grid */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {summary.readings.map((r) => {
          const sc = sensorStatusConfig(r.status);
          const label = SENSOR_LABEL[r.key] ?? r.key;
          return (
            <div
              key={r.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                r.temp === null ? "opacity-40" : sc.bg,
              )}
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", r.temp === null ? "bg-muted" : sc.dot)} />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                  {label}
                </div>
                <div className={cn("num text-sm font-bold leading-tight", r.temp === null ? "text-muted-foreground" : sc.color)}>
                  {r.temp !== null ? `${formatBRNumber(r.temp, 1)}°` : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* worst temperature + faixa + media inline */}
      <div className="mt-3 flex items-end justify-between">
        <div className="flex items-baseline gap-3">
          <div className={cn("num text-3xl font-bold", overallConfig.color)}>
            {summary.temperatura !== null ? `${formatBRNumber(summary.temperatura, 1)}°` : "—"}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">C (pior)</span>
          </div>
          {media !== null && (
            <div className="num text-xs text-muted-foreground">
              Ø {formatBRNumber(media, 1)}°
            </div>
          )}
        </div>
        {faixa && (
          <div className="text-right text-[10px] text-muted-foreground">
            <div className="tracking-wider">FAIXA</div>
            <div className="num text-foreground">{faixa.min}° / {faixa.max}°</div>
          </div>
        )}
      </div>

      {/* outlier / duration alerts */}
      {durationInfo?.isViolation && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] font-bold tracking-wider text-destructive">
          <Timer className="h-3 w-3 shrink-0" />
          HÁ {durationInfo.currentDurationLabel} FORA DA FAIXA
        </div>
      )}
      {summary.outlier && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md border border-warning/50 bg-warning/10 px-2 py-1 text-[10px] font-bold tracking-wider text-warning">
          <Bug className="h-3 w-3 shrink-0" />
          MEDIÇÃO SUSPEITA — VERIFICAR LEITURA
        </div>
      )}

      {/* footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
        <span className="truncate">{summary.tecnico || "—"}</span>
        <span className="num shrink-0">{formatBRDateTime(summary.timestamp)}</span>
      </div>
    </div>
  );
}
