import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { UserCircle2 } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { TecnicoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";

export const Route = createFileRoute("/_app/equipe")({
  component: EquipePage,
});

const cols: ColumnDef<TecnicoRow>[] = [
  { accessorKey: "ID", header: "ID" },
  {
    accessorKey: "Nome",
    header: "Nome",
    cell: ({ getValue }) => (
      <span className="flex items-center gap-2">
        <UserCircle2 className="h-4 w-4 text-primary" />
        {getValue() as string}
      </span>
    ),
  },
  { accessorKey: "Cargo", header: "Cargo" },
];

function EquipePage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Equipe</h1>
          <p className="text-xs text-muted-foreground">
            Técnicos cadastrados no plano de manutenção
          </p>
        </div>
        <ExportButton
          filename="equipe"
          rows={data?.tecnicos ?? []}
          columns={[
            { header: "ID", value: (r) => r.ID },
            { header: "Nome", value: (r) => r.Nome },
            { header: "Cargo", value: (r) => r.Cargo },
          ]}
        />
      </div>
      <Panel
        title={`${data?.tecnicos.length ?? 0} TÉCNICOS ATIVOS`}
      >
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <DataTable
            data={data?.tecnicos ?? []}
            columns={cols}
            searchPlaceholder="Buscar por nome, cargo, ID…"
            pageSize={20}
          />
        )}
      </Panel>
    </div>
  );
}
