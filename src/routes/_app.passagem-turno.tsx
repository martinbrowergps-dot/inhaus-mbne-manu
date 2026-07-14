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
import { useDateFilter } from "@/hooks/use-date-filter";
import { formatDateBR } from "@/lib/format";
import { SectionHeader } from "@/components/section-header";

export const Route = createFileRoute("/_app/passagem-turno")({
  component: PassagemPage,
});

const cols: ColumnDef<PassagemTurnoRow>[] = [
  { accessorKey: "Data", header: "Data/Hora" },
  { accessorKey: "Turno", header: "Turno" },
  { accessorKey: "Supervisor", header: "Supervisor" },
  { accessorKey: "EquipeSaida", header: "Equipe Saída" },
  { accessorKey: "EquipeEntrada", header: "Equipe Entrada" },
  { accessorKey: "TecnicoPassa", header: "Técnico Passa" },
  { accessorKey: "TecnicoRecebe", header: "Técnico Recebe" },
  {
    accessorKey: "HorarioInicio",
    header: "Início",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{(getValue() as string) || "—"}</span>
    ),
  },
  {
    accessorKey: "HorarioTermino",
    header: "Término",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{(getValue() as string) || "—"}</span>
    ),
  },
  { accessorKey: "Aprovador", header: "Aprovador" },
  {
    accessorKey: "StatusGeral",
    header: "Status",
    cell: ({ getValue }) => {
      const v = String(getValue() ?? "");
      if (!v) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary text-[10px]"
        >
          {v}
        </Badge>
      );
    },
  },
  {
    accessorKey: "Pendencias",
    header: "Pendências",
    cell: ({ getValue }) => (
      <span className="line-clamp-1 max-w-[200px] text-muted-foreground">
        {(getValue() as string) || "—"}
      </span>
    ),
  },
  {
    accessorKey: "ResumoOcorrencias",
    header: "Ocorrências",
    cell: ({ getValue }) => (
      <span className="line-clamp-1 max-w-[200px] text-muted-foreground">
        {(getValue() as string) || "—"}
      </span>
    ),
  },
  {
    accessorKey: "ResumoOSAbertas",
    header: "OS Abertas",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{(getValue() as string) || "—"}</span>
    ),
  },
  {
    accessorKey: "ResumoOSConcluidas",
    header: "OS Concluídas",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{(getValue() as string) || "—"}</span>
    ),
  },
  { accessorKey: "AssinadoPor", header: "Assinado Por" },
];

function PassagemPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Passagem de Turno</h1>
          <p className="text-xs text-muted-foreground">
            Registros de troca de turno • supervisores, equipes e pendências
          </p>
        </div>
        <ExportButton
          filename="passagem-turno"
          rows={(data?.passagemTurno ?? []).filter((r) => dateFilter.filterByDateRange(r.Data))}
          columns={[
            { header: "Data", value: (r) => r.Data },
            { header: "Turno", value: (r) => r.Turno },
            { header: "Supervisor", value: (r) => r.Supervisor },
            { header: "Equipe Saída", value: (r) => r.EquipeSaida },
            { header: "Equipe Entrada", value: (r) => r.EquipeEntrada },
            { header: "Técnico Passa", value: (r) => r.TecnicoPassa },
            { header: "Técnico Recebe", value: (r) => r.TecnicoRecebe },
            { header: "Horário Início", value: (r) => r.HorarioInicio ?? "" },
            { header: "Horário Término", value: (r) => r.HorarioTermino ?? "" },
            { header: "Aprovador", value: (r) => r.Aprovador ?? "" },
            { header: "Status", value: (r) => r.StatusGeral },
            { header: "Pendências", value: (r) => r.Pendencias },
            { header: "Ocorrências", value: (r) => r.ResumoOcorrencias ?? "" },
            { header: "OS Abertas", value: (r) => r.ResumoOSAbertas ?? "" },
            { header: "OS Concluídas", value: (r) => r.ResumoOSConcluidas ?? "" },
            { header: "Assinado Por", value: (r) => r.AssinadoPor ?? "" },
            { header: "Observações", value: (r) => r.Observacoes },
          ]}
          pdfTitle="Passagem de Turno · Centro de Controle"
          pdfSubtitle={
            dateFilter.isActive
              ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
              : undefined
          }
        />
      </div>
      <SectionHeader
        label="Registro"
        insight={`${data?.passagemTurno?.length ?? 0} passagens de turno registradas`}
      >
        <Panel>
          {isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <DataTable
              data={(data?.passagemTurno ?? []).filter((r) => dateFilter.filterByDateRange(r.Data))}
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
                "Aprovador",
                "Pendencias",
                "ResumoOcorrencias",
                "AssinadoPor",
              ]}
              pageSize={15}
              detailTitle={(r) => `${r.Data} · ${r.Turno}`}
              detailSubtitle={(r) => `Supervisor: ${r.Supervisor}`}
            />
          )}
        </Panel>
      </SectionHeader>
    </div>
  );
}
