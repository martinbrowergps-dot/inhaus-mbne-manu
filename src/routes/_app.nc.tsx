import { useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, ClipboardList, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { NcRow } from "@/lib/sheets-types";
import { statusBadge } from "@/lib/chart-utils";
import { parseBRDate, formatBRDate } from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/nc")({
  component: NcPage,
});

const columns: ColumnDef<NcRow>[] = [
  {
    accessorKey: "Codigo",
    header: "Nº NC",
    cell: ({ getValue }) => <span className="id">{getValue() as string}</span>,
  },
  {
    accessorKey: "Ocorrencia",
    header: "Ocorrência",
    cell: ({ row }) => (
      <span className="max-w-xs truncate block" title={row.original.Ocorrencia}>
        {row.original.Ocorrencia}
      </span>
    ),
  },
  {
    accessorKey: "MedidasCorretivas",
    header: "Medidas Corretivas",
    cell: ({ row }) => (
      <span className="max-w-xs truncate block" title={row.original.MedidasCorretivas}>
        {row.original.MedidasCorretivas}
      </span>
    ),
  },
  { accessorKey: "Responsavel", header: "Resp. Medida" },
  {
    accessorKey: "DataConclusao",
    header: "Data Conclusão",
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const d = parseBRDate(v);
      return <span>{d ? formatBRDate(d) : v || "—"}</span>;
    },
  },
  { accessorKey: "Andamento", header: "Andamento" },
  {
    accessorKey: "OQueFazer",
    header: "O que fazer",
    cell: ({ row }) => (
      <span className="max-w-xs truncate block" title={row.original.OQueFazer}>
        {row.original.OQueFazer}
      </span>
    ),
  },
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
        {row.original.Status}
      </span>
    ),
  },
];

function NcPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();

  const nc = useMemo(() => {
    const raw = data?.nc ?? [];
    if (!dateFilter.isActive) return raw;
    return raw.filter((r) => dateFilter.filterByDateRange(r.DataConclusao));
  }, [data?.nc, dateFilter]);

  const byResponsavel = useMemo(() => {
    const m = new Map<string, number>();
    nc.forEach((r) => {
      const k = r.Responsavel || "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [nc]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    nc.forEach((r) => {
      const k = r.Status || "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [nc]);

  if (isLoading)
    return (
      <div className="space-y-4">
        <KpiSkeletonGrid count={3} className="sm:grid-cols-3" heightClass="h-24" />
        <Skeleton className="h-96" />
      </div>
    );

  if (!data) return null;

  if (nc.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="fade-up text-xl font-bold tracking-tight">Não Conformidades</h1>
        <EmptyState
          icon={FileSearch}
          title="Nenhuma NC no período"
          description={
            dateFilter.isActive
              ? "Tente ampliar o filtro de datas para ver mais registros."
              : "Nenhuma não conformidade cadastrada na planilha."
          }
        />
      </div>
    );
  }

  const total = nc.length;
  const abertas = nc.filter((r) => !/conclu|finaliz|fechado/i.test(r.Status)).length;
  const fechadas = nc.filter((r) => /conclu|finaliz|fechado/i.test(r.Status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Não Conformidades"
        subtitle="Registro de não conformidades com análise de causa raiz"
        exportButton={
          <ExportButton
            filename="nao-conformidades"
            rows={nc}
            columns={[
              { header: "Nº NC", value: (r) => r.Codigo },
              { header: "Ocorrência", value: (r) => r.Ocorrencia },
              { header: "Medidas Corretivas", value: (r) => r.MedidasCorretivas },
              { header: "Resp. Medida", value: (r) => r.Responsavel },
              { header: "Data Conclusão", value: (r) => r.DataConclusao },
              { header: "Andamento", value: (r) => r.Andamento },
              { header: "O que fazer", value: (r) => r.OQueFazer },
              { header: "Status", value: (r) => r.Status },
            ]}
            pdfTitle="Não Conformidades · Centro de Controle"
          />
        }
      />

      <SectionHeader
        label="Panorama"
        insight={`${total} NCs · ${abertas} abertas · ${fechadas} fechadas · ${byResponsavel.length} responsáveis`}
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="Total de NCs" value={total} icon={ClipboardList} variant="primary" />
          <KpiCard
            label="Abertas"
            value={abertas}
            icon={AlertTriangle}
            variant={abertas > 0 ? "warning" : "success"}
          />
          <KpiCard label="Fechadas" value={fechadas} icon={CheckCircle2} variant="success" />
          <KpiCard
            label="Responsáveis"
            value={byResponsavel.length}
            icon={FileSearch}
            variant="neutral"
          />
        </div>
      </SectionHeader>

      <SectionHeader label="Análise" insight="NCs distribuídas por responsável e status de fechamento">
        <div className="grid gap-4 lg:grid-cols-2">
          {byResponsavel.length > 0 && (
            <Panel title="NC POR RESPONSÁVEL" glass>
              <div className="flex flex-wrap gap-2">
                {byResponsavel.map(({ name, value }) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {name} <span className="num font-bold">{value}</span>
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {byStatus.length > 0 && (
            <Panel title="NC POR STATUS" glass>
              <div className="flex flex-wrap gap-2">
                {byStatus.map(({ name, value }) => (
                  <span
                    key={name}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                      statusBadge(name),
                    )}
                  >
                    {name} <span className="num font-bold">{value}</span>
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </SectionHeader>

      <SectionHeader label="Registro" insight={`${nc.length} não conformidades cadastradas`}>
        <DataTable
          data={nc}
          columns={columns}
          pageSize={15}
          searchKeys={[
            "Codigo",
            "Ocorrencia",
            "Responsavel",
            "OQueFazer",
            "Status",
          ]}
          searchPlaceholder="Buscar NC por código, ocorrência, responsável, status…"
          detailTitle={(r) => r.Codigo}
          detailSubtitle={(r) => r.Ocorrencia}
        />
      </SectionHeader>
    </div>
  );
}
