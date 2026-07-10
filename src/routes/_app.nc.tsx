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

export const Route = createFileRoute("/_app/nc")({
  component: NcPage,
});

const columns: ColumnDef<NcRow>[] = [
  {
    accessorKey: "Codigo",
    header: "Código",
    cell: ({ getValue }) => <span className="id">{getValue() as string}</span>,
  },
  {
    accessorKey: "Data",
    header: "Data",
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const d = parseBRDate(v);
      return <span>{d ? formatBRDate(d) : v}</span>;
    },
  },
  { accessorKey: "Processo", header: "Processo" },
  {
    accessorKey: "DescricaoNC",
    header: "Descrição da NC",
    cell: ({ row }) => (
      <span className="max-w-xs truncate block" title={row.original.DescricaoNC}>
        {row.original.DescricaoNC}
      </span>
    ),
  },
  { accessorKey: "CausaRaiz", header: "Causa Raiz" },
  { accessorKey: "PlanoAcao", header: "Plano de Ação" },
  { accessorKey: "Prazo", header: "Prazo" },
  { accessorKey: "Responsavel", header: "Responsável" },
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
        {row.original.Status}
      </span>
    ),
  },
  { accessorKey: "DataFechamento", header: "Data Fechamento" },
];

function NcPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();

  const nc = useMemo(() => {
    const raw = data?.nc ?? [];
    if (!dateFilter.isActive) return raw;
    return raw.filter((r) => dateFilter.filterByDateRange(r.Data));
  }, [data?.nc, dateFilter]);

  const byProcesso = useMemo(() => {
    const m = new Map<string, number>();
    nc.forEach((r) => {
      const k = r.Processo || "—";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Não Conformidades</h1>
          <p className="fade-up text-xs text-muted-foreground">
            Registro de não conformidades com análise de causa raiz
          </p>
        </div>
        <ExportButton
          filename="nao-conformidades"
          rows={nc}
          columns={[
            { header: "Código", value: (r) => r.Codigo },
            { header: "Data", value: (r) => r.Data },
            { header: "Processo", value: (r) => r.Processo },
            { header: "Descrição", value: (r) => r.DescricaoNC },
            { header: "Contenção", value: (r) => r.Contencao },
            { header: "Causa Raiz", value: (r) => r.CausaRaiz },
            { header: "Plano de Ação", value: (r) => r.PlanoAcao },
            { header: "Prazo", value: (r) => r.Prazo },
            { header: "Responsável", value: (r) => r.Responsavel },
            { header: "Status", value: (r) => r.Status },
            { header: "Data Fechamento", value: (r) => r.DataFechamento },
          ]}
          pdfTitle="Não Conformidades · Centro de Controle"
        />
      </div>

      <SectionHeader
        label="Panorama"
        insight={`${total} NCs · ${abertas} abertas · ${fechadas} fechadas · ${byProcesso.length} processos`}
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
            label="Processos"
            value={byProcesso.length}
            icon={FileSearch}
            variant="neutral"
          />
        </div>
      </SectionHeader>

      <SectionHeader label="Análise" insight="NCs distribuídas por processo e status de fechamento">
        <div className="grid gap-4 lg:grid-cols-2">
          {byProcesso.length > 0 && (
            <Panel title="NC POR PROCESSO" glass>
              <div className="flex flex-wrap gap-2">
                {byProcesso.map(({ name, value }) => (
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
            "DescricaoNC",
            "Processo",
            "Responsavel",
            "CausaRaiz",
            "PlanoAcao",
          ]}
          searchPlaceholder="Buscar NC por código, processo, responsável, causa raiz…"
        />
      </SectionHeader>
    </div>
  );
}
