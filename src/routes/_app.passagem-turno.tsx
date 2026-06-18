import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PassagemTurnoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/passagem-turno")({
  component: PassagemPage,
});

const cols: ColumnDef<PassagemTurnoRow>[] = [
  { accessorKey: "Data", header: "Data" },
  { accessorKey: "Turno", header: "Turno" },
  { accessorKey: "Supervisor", header: "Supervisor" },
  { accessorKey: "EquipeSaida", header: "Equipe Saída" },
  { accessorKey: "EquipeEntrada", header: "Equipe Entrada" },
  {
    accessorKey: "StatusGeral",
    header: "Status",
    cell: ({ getValue }) => {
      const v = String(getValue() ?? "");
      if (!v) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
          {v}
        </Badge>
      );
    },
  },
  {
    accessorKey: "Pendencias",
    header: "Pendências",
    cell: ({ getValue }) => (
      <span className="line-clamp-1 max-w-[260px] text-muted-foreground">
        {(getValue() as string) || "—"}
      </span>
    ),
  },
];

function PassagemPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Passagem de Turno</h1>
        <p className="text-xs text-muted-foreground">
          Registros de troca de turno • supervisores, equipes e pendências
        </p>
      </div>
      <Panel>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <DataTable
            data={data?.passagemTurno ?? []}
            columns={cols}
            searchPlaceholder="Buscar supervisor, turno, equipe…"
            searchKeys={[
              "Data",
              "Turno",
              "Supervisor",
              "EquipeSaida",
              "EquipeEntrada",
              "TecnicoPassa",
              "TecnicoRecebe",
              "Pendencias",
            ]}
            pageSize={15}
          />
        )}
      </Panel>
    </div>
  );
}
