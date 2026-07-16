import { useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Activity, Clock, ListFilter, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PreditivaRow } from "@/lib/sheets-types";
import { priorityBadge, statusBadge, aggregate, SERIES_COLORS } from "@/lib/chart-utils";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import { ChartDonut } from "@/components/visao-geral/chart-donut";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { formatBRNumber, parseBRDate, formatBRDate, formatDateBR } from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";

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
  { accessorKey: "HH", header: "HH" },
];

function PreditivasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();
  const preditiva = useMemo(
    () =>
      (data?.preditiva ?? []).filter((r) => dateFilter.filterByDateRange(r.Data)),
    [data?.preditiva, dateFilter],
  );

  const byCategoria = useMemo(() => aggregate(preditiva, (r) => r.Categoria), [preditiva]);
  const bySetor = useMemo(() => aggregate(preditiva, (r) => r.Setor), [preditiva]);
  const byStatus = useMemo(() => aggregate(preditiva, (r) => r.Status), [preditiva]);

  const sumByCategoriaHH = useMemo(() => {
    const map = new Map<string, number>();
    preditiva.forEach((r) => map.set(r.Categoria, (map.get(r.Categoria) ?? 0) + Number(r.HH || 0)));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [preditiva]);

  const sumBySetorHH = useMemo(() => {
    const map = new Map<string, number>();
    preditiva.forEach((r) => map.set(r.Setor, (map.get(r.Setor) ?? 0) + Number(r.HH || 0)));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [preditiva]);

  const sumByStatusHH = useMemo(() => {
    const map = new Map<string, number>();
    preditiva.forEach((r) => map.set(r.Status, (map.get(r.Status) ?? 0) + Number(r.HH || 0)));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [preditiva]);

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

  const [fullscreenImg, setFullscreenImg] = useState(false);
  const openFullscreen = useCallback(() => setFullscreenImg(true), []);
  const closeFullscreen = useCallback(() => setFullscreenImg(false), []);

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
          <h1 className="fade-up text-xl font-bold tracking-tight">Preditiva - SEMEQ</h1>
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
            { header: "Status", value: (r) => r.Status },
            { header: "HH", value: (r) => r.HH },
          ]}
          pdfTitle="Preditiva - SEMEQ"
          pdfSubtitle={
            dateFilter.isActive
              ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
              : undefined
          }
        />
      </div>

      <SectionHeader
        label="Panorama"
        insight={`${total} ações preditivas · ${formatBRNumber(totalHH, 1)}h estimados · ${byCategoria.length} categorias${dateFilter.isActive ? ` · ${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}` : ""}`}
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
        label="Distribuição"
        insight={`${byCategoria.length} categorias · ${bySetor.length} setores`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="AÇÕES POR CATEGORIA" dataChart="preditivas-categoria">
            <ChartBarHorizontal data={byCategoria} color={SERIES_COLORS.executado} height={140} />
          </Panel>
          <Panel title="AÇÕES POR SETOR" dataChart="preditivas-setor">
            <ChartBarHorizontal data={bySetor} color={SERIES_COLORS.planejado} />
          </Panel>
        </div>
      </SectionHeader>

      <SectionHeader
        label="Esforço estimado (HH)"
        insight={`${formatBRNumber(totalHH, 1)}h distribuídos`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="HH POR CATEGORIA" dataChart="preditivas-hh-categoria">
            <ChartBarHorizontal data={sumByCategoriaHH} color={SERIES_COLORS.hh} height={140} />
          </Panel>
          <Panel title="HH POR SETOR" dataChart="preditivas-hh-setor">
            <ChartBarHorizontal data={sumBySetorHH} color={SERIES_COLORS.hh} />
          </Panel>
        </div>
      </SectionHeader>

      <SectionHeader label="Situação" insight="Status de execução das ações">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="AÇÕES POR STATUS" dataChart="preditivas-status">
            <ChartDonut data={byStatus} />
          </Panel>
          <Panel title="HH POR STATUS" dataChart="preditivas-hh-status">
            <ChartBarHorizontal data={sumByStatusHH} color={SERIES_COLORS.ref} height={140} />
          </Panel>
        </div>
      </SectionHeader>

      <SectionHeader
        label="Registro"
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

      <SectionHeader
        label="Anexo"
        insight="Plano de manutenção preditiva"
      >
        <Panel title="PLANO DE MANUTENÇÃO PREDITIVA">
          <div className="flex justify-center">
            <button type="button" onClick={openFullscreen} className="cursor-pointer focus:outline-none">
              <img
                src="/newplot.png"
                alt="Plano Preditiva - SEMEQ"
                className="max-w-full h-auto rounded-lg border hover:opacity-90 transition-opacity"
              />
            </button>
          </div>
        </Panel>

      {fullscreenImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeFullscreen}
        >
          <button
            type="button"
            onClick={closeFullscreen}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src="/newplot.png"
            alt="Plano de Manutenção Preditiva"
            className="rounded-lg"
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      </SectionHeader>
    </div>
  );
}
