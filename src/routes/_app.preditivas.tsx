import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Activity, Clock, ListFilter, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PreditivaRow } from "@/lib/sheets-types";
import { priorityBadge } from "@/lib/chart-utils";
import { StatusBadge } from "@/components/status-badge";
import type { ExecStatus } from "@/lib/status";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { formatBRNumber, parseBRDate, formatBRDate } from "@/lib/format";

export const Route = createFileRoute("/_app/preditivas")({
  component: PreditivasPage,
});

const columns: ColumnDef<PreditivaRow>[] = [
  {
    accessorKey: "CodigoReferencia",
    header: "Código",
    cell: ({ getValue }) => <span className="id">{getValue() as string}</span>,
  },
  {
    accessorKey: "Data",
    header: "Data",
    cell: ({ getValue }) => {
      const d = parseBRDate(getValue() as string);
      return <span className="num">{d ? formatBRDate(d) : ((getValue() as string) || "—")}</span>;
    },
  },
  { accessorKey: "Tipo", header: "Tipo" },
  { accessorKey: "Categoria", header: "Categoria" },
  {
    accessorKey: "Prioridade",
    header: "Prioridade",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
          priorityBadge(row.original.Prioridade),
        )}
      >
        {row.original.Prioridade}
      </span>
    ),
  },
  { accessorKey: "Titulo", header: "Título" },
  {
    accessorKey: "DescricaoAtividade",
    header: "Descrição",
    cell: ({ getValue }) => (
      <span className="line-clamp-1 max-w-[280px]">{getValue() as string}</span>
    ),
  },
  { accessorKey: "Setor", header: "Setor" },
  {
    accessorKey: "HH",
    header: "HH",
    cell: ({ getValue }) => <span className="num">{formatBRNumber(Number(getValue() || 0), 2)}</span>,
  },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={(row.original.Status || "Programada") as ExecStatus} />,
  },
  { accessorKey: "Situacao", header: "Situação" },
];

function PreditivasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const preditiva = useMemo(
    () => data?.preditiva ?? [],
    [data?.preditiva],
  );

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );

  if (!data) return null;

  if (preditiva.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="fade-up text-xl font-bold tracking-tight">Manutenção Preditiva</h1>
        <EmptyState
          icon={TrendingUp}
          title="Nenhuma ação preditiva cadastrada"
          description="Não há registros na planilha de manutenção preditiva."
        />
      </div>
    );
  }

  const total = preditiva.length;
  const totalHH = preditiva.reduce((s, r) => s + Number(r.HH || 0), 0);
  const finalizadas = preditiva.filter((r) =>
    /finaliz|conclu|fechado/i.test(r.Status || ""),
  ).length;
  const pendentes = total - finalizadas;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preditivas"
        subtitle="Ações preditivas e corretivas-preditivas registradas"
        exportButton={
          <ExportButton
            filename="preditivas"
            rows={preditiva}
            columns={[
              { header: "Código", value: (r) => r.CodigoReferencia },
              { header: "Data", value: (r) => r.Data },
              { header: "Tipo", value: (r) => r.Tipo },
              { header: "Categoria", value: (r) => r.Categoria },
              { header: "Prioridade", value: (r) => r.Prioridade },
              { header: "Título", value: (r) => r.Titulo },
              { header: "Descrição", value: (r) => r.DescricaoAtividade },
              { header: "Setor", value: (r) => r.Setor },
              { header: "Status", value: (r) => r.Status },
              { header: "Situação", value: (r) => r.Situacao },
              { header: "HH", value: (r) => r.HH },
            ]}
            pdfTitle="Preditivas"
          />
        }
      />

      <SectionHeader
        label="Panorama"
        insight={`${total} ações preditivas · ${formatBRNumber(totalHH, 1)}h estimados`}
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="Total de ações" value={total} icon={Activity} variant="primary" />
          <KpiCard
            label="HH Estimado"
            value={`${formatBRNumber(totalHH, 1)}h`}
            icon={Clock}
            variant="neutral"
          />
          <KpiCard
            label="Finalizadas"
            value={finalizadas}
            icon={TrendingUp}
            variant="success"
          />
          <KpiCard label="Pendentes" value={pendentes} icon={ListFilter} variant="warning" />
        </div>
      </SectionHeader>

      <SectionHeader
        label="Atividades"
        insight={`${preditiva.length} ações cadastradas`}
      >
        <Panel title="LISTA DE AÇÕES PREDITIVAS">
          <DataTable
            data={preditiva}
            columns={columns}
            pageSize={15}
            searchKeys={["CodigoReferencia", "Titulo", "DescricaoAtividade", "Tipo", "Categoria", "Setor"]}
            detailTitle={(r) => r.CodigoReferencia}
            detailSubtitle={(r) => `${r.Titulo} — ${r.Objetivo}`}
          />
        </Panel>
      </SectionHeader>
    </div>
  );
}
