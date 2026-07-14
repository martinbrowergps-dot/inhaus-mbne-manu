import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Activity, Clock, ListFilter, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PreditivaRow } from "@/lib/sheets-types";
import { priorityBadge, statusBadge, aggregate } from "@/lib/chart-utils";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
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
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          priorityBadge(row.original.Prioridade),
        )}
      >
        {row.original.Prioridade}
      </span>
    ),
  },
  { accessorKey: "Titulo", header: "Título" },
  { accessorKey: "Area", header: "Área" },
  { accessorKey: "Setor", header: "Setor" },
  { accessorKey: "Conjunto", header: "Conjunto" },
  { accessorKey: "Servico", header: "Serviço" },
  { accessorKey: "Objetivo", header: "Objetivo" },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          statusBadge(row.original.Status),
        )}
      >
        {row.original.Status || "—"}
      </span>
    ),
  },
  {
    accessorKey: "Situacao",
    header: "Situação",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          statusBadge(row.original.Situacao),
        )}
      >
        {row.original.Situacao || "—"}
      </span>
    ),
  },
  { accessorKey: "HH", header: "HH" },
];

function PreditivasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const preditiva = useMemo(() => data?.preditiva ?? [], [data?.preditiva]);

  const byTipo = useMemo(() => aggregate(preditiva, (r) => r.Tipo), [preditiva]);
  const byArea = useMemo(() => aggregate(preditiva, (r) => r.Area), [preditiva]);
  const byStatus = useMemo(() => aggregate(preditiva, (r) => r.Status), [preditiva]);

  if (isLoading)
    return (
      <div className="space-y-4">
        <KpiSkeletonGrid count={4} className="sm:grid-cols-4" heightClass="h-24" />
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Manutenção Preditiva</h1>
          <p className="fade-up text-xs text-muted-foreground">
            Ações preditivas e corretivas-preditivas registradas
          </p>
        </div>
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
            { header: "Área", value: (r) => r.Area },
            { header: "Setor", value: (r) => r.Setor },
            { header: "Conjunto", value: (r) => r.Conjunto },
            { header: "Serviço", value: (r) => r.Servico },
            { header: "HH", value: (r) => r.HH },
            { header: "Status", value: (r) => r.Status },
            { header: "Situação", value: (r) => r.Situacao },
          ]}
          pdfTitle="Manutenção Preditiva · Centro de Controle"
        />
      </div>

      <SectionHeader
        label="Panorama"
        insight={`${total} ações preditivas · ${formatBRNumber(totalHH, 1)}h estimados · ${byTipo.length} tipos`}
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

      {byTipo.length > 0 && (
        <SectionHeader
          label="Distribuição"
          insight={`${byTipo.length} tipos de manutenção preditiva`}
        >
          <Panel title="AÇÕES POR TIPO" glass>
            <div className="flex flex-wrap gap-2">
              {byTipo.map(({ name, value }) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {name} <span className="num font-bold">{value}</span>
                </span>
              ))}
            </div>
          </Panel>
        </SectionHeader>
      )}

      {byArea.length > 0 && (
        <SectionHeader label="Áreas" insight={`${byArea.length} áreas atendidas`}>
          <Panel title="AÇÕES POR ÁREA" glass>
            <div className="flex flex-wrap gap-2">
              {byArea.map(({ name, value }) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {name} <span className="num font-bold text-foreground">{value}</span>
                </span>
              ))}
            </div>
          </Panel>
        </SectionHeader>
      )}

      {byStatus.length > 0 && (
        <SectionHeader label="Situação" insight="Status de execução das ações">
          <Panel title="AÇÕES POR STATUS" glass>
            <div className="flex flex-wrap gap-2">
              {byStatus.map(({ name, value }) => (
                <span
                  key={name}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider",
                    statusBadge(name),
                  )}
                >
                  {name} <span className="num font-bold">{value}</span>
                </span>
              ))}
            </div>
          </Panel>
        </SectionHeader>
      )}

      <SectionHeader
        label="Registro"
        insight={`${preditiva.length} ações cadastradas`}
      >
        <DataTable data={preditiva} columns={columns} pageSize={15} />
      </SectionHeader>
    </div>
  );
}
