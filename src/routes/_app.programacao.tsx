import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatBRNumber } from "@/lib/format";

export const Route = createFileRoute("/_app/programacao")({
  component: ProgramacaoPage,
});

const cols: ColumnDef<ProgramacaoRow>[] = [
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
    accessorKey: "StatusExecucao",
    header: "Status",
    cell: ({ getValue }) => {
      const v = String(getValue() ?? "");
      const cls = /finaliz|conclu/i.test(v) ? "bg-success/15 text-success border-success/30"
        : /andamento/i.test(v) ? "bg-warning/15 text-warning border-warning/30"
        : "bg-primary/10 text-primary border-primary/30";
      return <Badge variant="outline" className={`${cls} text-[10px]`}>{v || "—"}</Badge>;
    },
  },
];

function ProgramacaoPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Programação Semanal</h1>
        <p className="text-xs text-muted-foreground">
          Todas as Ordens de Serviço com status, criticidade e alocação
        </p>
      </div>
      <Panel>
        {isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <DataTable
            data={data?.programacao ?? []}
            columns={cols}
            searchPlaceholder="Buscar por OS, TAG, descrição…"
            searchKeys={["NumeroOS", "TAG", "Descricao", "Sistema", "Executante", "Cargo"]}
            pageSize={15}
          />
        )}
      </Panel>
    </div>
  );
}
