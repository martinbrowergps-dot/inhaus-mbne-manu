import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatBRNumber } from "@/lib/format";
import {
  deriveExecStatus,
  EXECUTADO_STATUSES,
  PROGRAMADO_STATUSES,
  type ExecStatus,
} from "@/lib/status";

export const Route = createFileRoute("/_app/programacao")({
  component: ProgramacaoPage,
});

const fullCols: ColumnDef<ProgramacaoRow & { _status: ExecStatus }>[] = [
  { accessorKey: "NumeroOS", header: "Nº OS" },
  { accessorKey: "DataProgramada", header: "Data" },
  { accessorKey: "Sistema", header: "Sistema" },
  {
    accessorKey: "Descricao",
    header: "Descrição",
    cell: ({ getValue }) => <span className="line-clamp-1 max-w-[280px]">{getValue() as string}</span>,
  },
  {
    accessorKey: "Criticidade",
    header: "Crit.",
    cell: ({ getValue }) => {
      const v = (getValue() as string)?.toUpperCase();
      const color =
        v === "AA" ? "bg-destructive/20 text-destructive border-destructive/40"
        : v === "A" ? "bg-warning/20 text-warning border-warning/40"
        : "bg-primary/15 text-primary border-primary/30";
      return <Badge variant="outline" className={`${color} text-[10px] font-bold`}>{v || "—"}</Badge>;
    },
  },
  { accessorKey: "Cargo", header: "Cargo" },
  {
    accessorKey: "HH",
    header: "HH",
    cell: ({ getValue }) => <span className="num">{formatBRNumber(getValue() as number, 2)}</span>,
  },
  { accessorKey: "Executante", header: "Executante" },
  {
    accessorKey: "_status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue() as ExecStatus} />,
  },
];

function ProgramacaoPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const [q, setQ] = useState("");

  const enriched = useMemo(
    () => (data?.programacao ?? []).map((p) => ({ ...p, _status: deriveExecStatus(p) })),
    [data],
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return enriched;
    const lower = q.toLowerCase();
    return enriched.filter((r) =>
      [r.NumeroOS, r.TAG, r.Descricao, r.Sistema, r.Executante, r.Cargo]
        .some((v) => String(v ?? "").toLowerCase().includes(lower)),
    );
  }, [enriched, q]);

  const programado = filtered.filter((r) => PROGRAMADO_STATUSES.includes(r._status));
  const executado = filtered.filter((r) => EXECUTADO_STATUSES.includes(r._status));

  const sumHH = (rows: typeof filtered) =>
    rows.reduce((s, r) => s + (r.HH || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Programação Semanal</h1>
        <p className="text-xs text-muted-foreground">
          Compare lado a lado o que está programado vs o que foi executado
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="comparativo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
              <TabsTrigger value="tabela">Tabela completa</TabsTrigger>
            </TabsList>
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar OS, TAG, descrição, executante…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 border-border/60 bg-card/50 pl-8 text-xs"
              />
            </div>
          </div>

          <TabsContent value="comparativo" className="m-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title={`PROGRAMADO · ${programado.length} OS`}
                subtitle={`${formatBRNumber(sumHH(programado), 1)} HH alocados`}
              >
                <OsList rows={programado} emptyLabel="Nenhuma OS em aberto" />
              </Panel>
              <Panel
                title={`EXECUTADO · ${executado.length} OS`}
                subtitle={`${formatBRNumber(sumHH(executado), 1)} HH realizados`}
              >
                <OsList rows={executado} emptyLabel="Nenhuma OS finalizada/cancelada" />
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="tabela" className="m-0">
            <Panel>
              <DataTable
                data={filtered}
                columns={fullCols}
                searchPlaceholder="Refinar nesta tabela…"
                pageSize={15}
              />
            </Panel>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OsList({
  rows,
  emptyLabel,
}: {
  rows: (ProgramacaoRow & { _status: ExecStatus })[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
      {rows.map((r) => (
        <li
          key={`${r.NumeroOS}-${r._status}`}
          className="rounded-lg border border-border/50 bg-card/40 p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="num text-[11px] font-bold text-primary">{r.NumeroOS}</span>
                <span className="text-[10px] text-muted-foreground">{r.Sistema}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-foreground">{r.Descricao}</p>
            </div>
            <StatusBadge status={r._status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/30 pt-1.5 text-[10px] text-muted-foreground">
            <span>📅 <span className="num text-foreground">{r.DataProgramada || "—"}</span></span>
            {r.DataReprogramada && (
              <span>↻ <span className="num text-warning">{r.DataReprogramada}</span></span>
            )}
            <span>👤 {r.Executante || "—"}</span>
            <span>⏱ <span className="num text-foreground">{formatBRNumber(r.HH || 0, 1)}h</span></span>
            {r.Criticidade && (
              <span className={r.Criticidade.toUpperCase() === "AA" ? "font-bold text-destructive" : "text-foreground"}>
                {r.Criticidade}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
