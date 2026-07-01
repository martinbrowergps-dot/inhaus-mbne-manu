import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRNumber } from "@/lib/format";

function tone(pct: number) {
  if (pct >= 95)
    return { color: "#22C55E", cls: "text-success", ring: "border-success/40" };
  if (pct >= 85)
    return { color: "#EAB308", cls: "text-warning", ring: "border-warning/40" };
  return { color: "#EF4444", cls: "text-destructive", ring: "border-destructive/40" };
}

export function AderenciaCard({
  pct,
  finalizadasNoPrazo,
  finalizadasForaPrazo,
  canceladas,
  pendentes,
  totalProgramadas,
  className,
}: {
  pct: number;
  finalizadasNoPrazo: number;
  finalizadasForaPrazo: number;
  canceladas: number;
  pendentes: number;
  totalProgramadas: number;
  className?: string;
}) {
  const t = tone(pct);
  const data = [{ name: "aderencia", value: Math.max(0, Math.min(100, pct)), fill: t.color }];

  return (
    <div className={cn("panel fade-up rounded-xl border p-4", t.ring, className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Aderência à Programação
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> (finalizadas + canceladas) / programadas
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={data}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: "rgba(255,255,255,0.06)" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("num text-2xl font-bold", t.cls)}>{formatBRNumber(pct, 0)}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Finalizadas no prazo</span>
            <span className="num font-bold text-success">{finalizadasNoPrazo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Finalizadas c/ reprogramação</span>
            <span className="num font-bold text-warning">{finalizadasForaPrazo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Canceladas</span>
            <span className="num font-bold text-destructive">{canceladas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pendentes</span>
            <span className="num font-bold text-muted-foreground">{pendentes}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/40 pt-1">
            <span className="text-muted-foreground">Total programadas</span>
            <span className="num font-bold text-foreground">{totalProgramadas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Meta</span>
            <span className="num font-bold text-primary">≥ 95%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function computeAderencia(
  rows: {
    Status: string;
    StatusExecucao: string;
    DataProgramada: string;
    DataReprogramada: string;
  }[],
): {
  pct: number;
  finalizadasNoPrazo: number;
  finalizadasForaPrazo: number;
  canceladas: number;
  pendentes: number;
  totalProgramadas: number;
} {
  let total = 0;
  let okPrazo = 0;
  let foraPrazo = 0;
  let canceladas = 0;
  for (const r of rows) {
    if (!r.DataProgramada) continue;
    total++;
    const raw = (r.StatusExecucao || r.Status || "").toLowerCase();
    if (/cancel/.test(raw)) {
      canceladas++;
      continue;
    }
    const finalizada = /finaliz|conclu/.test(raw);
    if (finalizada) {
      const reprog = (r.DataReprogramada || "").trim();
      if (reprog) foraPrazo++;
      else okPrazo++;
    }
  }
  const pendentes = total - okPrazo - foraPrazo - canceladas;
  const realizadas = okPrazo + foraPrazo + canceladas;
  const pct = total > 0 ? (realizadas / total) * 100 : 0;
  return {
    pct,
    finalizadasNoPrazo: okPrazo,
    finalizadasForaPrazo: foraPrazo,
    canceladas,
    pendentes,
    totalProgramadas: total,
  };
}
