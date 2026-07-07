import { useState } from "react";
import { AlertTriangle, Clock, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatBRNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnrichedRow } from "./types";

export function OsCard({ row: r }: { row: EnrichedRow }) {
  const isAtrasada = r._status === "Atrasada" && r._diasAtraso !== null;
  const [expanded, setExpanded] = useState(false);

  return (
    <li
      className={cn(
        "rounded-lg border border-border/50 bg-card/40 p-2.5 transition-all",
        isAtrasada ? "neon-glow-pulse border-destructive/40" : "hover:border-primary/40 hover:bg-primary/5",
        "md:cursor-default cursor-pointer",
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="id text-[11px] font-bold text-primary">{r.NumeroOS}</span>
            <span className="text-[10px] text-muted-foreground">{r.Sistema}</span>
            {isAtrasada && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-destructive/50 bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                <AlertTriangle className="h-2.5 w-2.5" /> {r._diasAtraso}d atrasada
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-foreground">{r.Descricao}</p>
        </div>
        <StatusBadge status={r._status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/30 pt-1.5 text-[10px] text-muted-foreground">
        {r.DataReprogramada && (
          <span>
            <Clock className="mr-0.5 inline h-2.5 w-2.5" /> <span className="num text-warning">{r.DataReprogramada}</span>
          </span>
        )}
          <span className="inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {r.Executante || "—"}</span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" /> <span className="num text-foreground">{formatBRNumber(r.HH || 0, 1)}h</span>
        </span>
        {r.Criticidade && (
          <span
            className={
              r.Criticidade.toUpperCase() === "AA"
                ? "font-bold text-destructive"
                : "text-foreground"
            }
          >
            {r.Criticidade}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-border/30 pt-2 text-[10px] text-muted-foreground md:hidden">
          {r.LocalMacro && (
            <p><span className="font-semibold text-foreground">Local:</span> {r.LocalMacro}</p>
          )}
          {r.Tipo && (
            <p><span className="font-semibold text-foreground">Tipo:</span> {r.Tipo}</p>
          )}
          {r.Cargo && (
            <p><span className="font-semibold text-foreground">Cargo:</span> {r.Cargo}</p>
          )}
          {r.DataProgramada && (
            <p><span className="font-semibold text-foreground">Data Prog.:</span> <span className="num">{r.DataProgramada}</span></p>
          )}
          {r.Criticidade && (
            <p><span className="font-semibold text-foreground">Criticidade:</span> {r.Criticidade}</p>
          )}
          {r.ObservacoesExecucao && (
            <p className="line-clamp-3"><span className="font-semibold text-foreground">Obs.:</span> {r.ObservacoesExecucao}</p>
          )}
        </div>
      )}
    </li>
  );
}
