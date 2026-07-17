import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { computeAderencia } from "@/lib/domain/aderencia";
export { computeAderencia };

function tone(pct: number) {
if (pct >= 95)
    return { color: "#10B981", cls: "text-success", ring: "border-success/40" };
  if (pct >= 85)
    return { color: "#F59E0B", cls: "text-warning", ring: "border-warning/40" };
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
  loading,
}: {
  pct: number;
  finalizadasNoPrazo: number;
  finalizadasForaPrazo: number;
  canceladas: number;
  pendentes: number;
  totalProgramadas: number;
  className?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={cn("panel fade-up rounded-xl border border-border/40 p-4", className)}>
        <Skeleton className="mb-3 h-3 w-44" />
        <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
          <div className="flex-1 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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

      <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative h-24 w-24 sm:h-32 sm:w-32 shrink-0">
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
            <span className={cn("num text-2xl font-bold whitespace-nowrap", t.cls)}>{formatBRNumber(pct, 0)}%</span>
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


