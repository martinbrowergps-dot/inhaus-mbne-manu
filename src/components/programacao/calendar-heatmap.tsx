import { formatBRNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { sameDay } from "./types";

export function CalendarHeatmap({
  days,
  today,
}: {
  days: { date: Date; total: number; prog: number; exec: number; hh: number }[];
  today: Date;
}) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div className="grid grid-cols-7 gap-1 sm:grid-cols-14 md:grid-cols-[repeat(16,minmax(0,1fr))]">
      {days.map((d) => {
        const intensity = d.total / max;
        const isToday = sameDay(d.date, today);
        return (
          <div
            key={d.date.toISOString()}
            title={`${d.date.toLocaleDateString("pt-BR")} · ${d.total} OS · ${formatBRNumber(d.hh, 1)}h`}
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded border text-[10px]",
              isToday ? "border-primary" : "border-border/40",
            )}
            style={{
              background:
                d.total === 0 ? "transparent" : `rgba(7,89,179,${0.15 + intensity * 0.65})`,
            }}
          >
            <span className="font-bold text-foreground">{d.date.getDate()}</span>
            {d.total > 0 && <span className="num text-[9px] text-muted-foreground">{d.total}</span>}
          </div>
        );
      })}
    </div>
  );
}
