import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PassagemTurnoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
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
  const pdfRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={pdfRef} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>
          <h1 className="text-xl font-bold tracking-tight">Passagem de Turno</h1>
          <p className="text-xs text-muted-foreground">
            Registros de troca de turno • supervisores, equipes e pendências
          </p>
        </div>
        <ExportButton
          filename="passagem-turno"
          rows={data?.passagemTurno ?? []}
          columns={[
            { header: "Data", value: (r) => r.Data },
            { header: "Turno", value: (r) => r.Turno },
            { header: "Supervisor", value: (r) => r.Supervisor },
            { header: "Equipe Saída", value: (r) => r.EquipeSaida },
            { header: "Equipe Entrada", value: (r) => r.EquipeEntrada },
            { header: "Técnico Passa", value: (r) => r.TecnicoPassa },
            { header: "Técnico Recebe", value: (r) => r.TecnicoRecebe },
            { header: "Status", value: (r) => r.StatusGeral },
            { header: "Pendências", value: (r) => r.Pendencias },
            { header: "Observações", value: (r) => r.Observacoes },
          ]}
          pdfTargetRef={pdfRef}
          pdfTitle="Passagem de Turno · Centro de Controle"
        />
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
