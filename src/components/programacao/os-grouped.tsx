import { useMemo } from "react";
import { Calendar, Users } from "lucide-react";
import { formatBRNumber, parseBRDate } from "@/lib/format";
import { OsCard } from "./os-card";
import type { EnrichedRow } from "./types";

export function OsGroupedByDate({ rows, emptyLabel }: { rows: EnrichedRow[]; emptyLabel: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, EnrichedRow[]>();
    rows.forEach((r) => {
      const k = r.DataProgramada || "Sem data";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries()).sort((a, b) => {
      const da = parseBRDate(a[0])?.getTime() ?? 0;
      const db = parseBRDate(b[0])?.getTime() ?? 0;
      return da - db;
    });
  }, [rows]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="sticky top-0 z-10 mb-1.5 flex items-center justify-between rounded-md border border-border/40 bg-card/80 px-2 py-1 backdrop-blur">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-primary uppercase">
              <Calendar className="h-3 w-3" /> {date}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {items.length} OS ·{" "}
              {formatBRNumber(
                items.reduce((s, r) => s + (r.HH || 0), 0),
                1,
              )}
              h
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((r) => (
              <OsCard key={`${r.NumeroOS}-${r._status}`} row={r} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function OsGroupedByExecutante({ rows, emptyLabel }: { rows: EnrichedRow[]; emptyLabel: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, EnrichedRow[]>();
    rows.forEach((r) => {
      const k = r.Executante || "Sem executante";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
      {groups.map(([exe, items]) => (
        <div key={exe}>
          <div className="sticky top-0 z-10 mb-1.5 flex items-center justify-between rounded-md border border-border/40 bg-card/80 px-2 py-1 backdrop-blur">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-primary uppercase">
              <Users className="h-3 w-3" /> {exe}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {items.length} OS ·{" "}
              {formatBRNumber(
                items.reduce((s, r) => s + (r.HH || 0), 0),
                1,
              )}
              h
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((r) => (
              <OsCard key={`${r.NumeroOS}-${r._status}`} row={r} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
