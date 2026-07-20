import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PreditivaRow } from "@/lib/sheets-types";
import { priorityBadge, statusBadge } from "@/lib/chart-utils";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { parseBRDate, formatBRDate } from "@/lib/format";

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
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
          statusBadge(row.original.Status),
        )}
      >
        {row.original.Status || "—"}
      </span>
    ),
  },
  { accessorKey: "HH", header: "HH" },
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

  return (
    <div className="space-y-4">
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
              { header: "Status", value: (r) => r.Status },
              { header: "HH", value: (r) => r.HH },
            ]}
            pdfTitle="Preditivas"
          />
        }
      />

      <SectionHeader
        label="Atividades"
        insight={`${preditiva.length} ações cadastradas`}
      >
        <DataTable
          data={preditiva}
          columns={columns}
          pageSize={15}
          searchKeys={["CodigoReferencia", "Titulo", "Tipo", "Categoria"]}
          detailTitle={(r) => r.CodigoReferencia}
          detailSubtitle={(r) => `${r.Titulo} — ${r.Objetivo}`}
        />
      </SectionHeader>
    </div>
  );
}
