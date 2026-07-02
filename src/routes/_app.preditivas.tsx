import { useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Activity, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PreditivaRow } from "@/lib/sheets-types";
import { priorityBadge } from "@/lib/chart-utils";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { formatBRNumber } from "@/lib/format";

export const Route = createFileRoute("/_app/preditivas")({
  component: PreditivasPage,
});

const columns: ColumnDef<PreditivaRow>[] = [
  { accessorKey: "CodigoReferencia", header: "Código" },
  { accessorKey: "Tipo", header: "Tipo" },
  { accessorKey: "Categoria", header: "Categoria" },
  {
    accessorKey: "Prioridade",
    header: "Prioridade",
    cell: ({ row }) => (
      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", priorityBadge(row.original.Prioridade))}>
        {row.original.Prioridade}
      </span>
    ),
  },
  { accessorKey: "Titulo", header: "Título" },
  { accessorKey: "Objetivo", header: "Objetivo" },
  { accessorKey: "HH", header: "HH" },
];

function PreditivasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);

  if (isLoading)
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );

  if (!data) return null;

  const preditiva = data.preditiva;
  const total = preditiva.length;
  const totalHH = preditiva.reduce((s, r) => s + Number(r.HH || 0), 0);

  const byTipo = useMemo(() => {
    const m = new Map<string, number>();
    preditiva.forEach((r) => { const k = r.Tipo || "—"; m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [preditiva]);

  return (
    <div ref={pdfRef} className="space-y-6">
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
            { header: "Tipo", value: (r) => r.Tipo },
            { header: "Categoria", value: (r) => r.Categoria },
            { header: "Prioridade", value: (r) => r.Prioridade },
            { header: "Título", value: (r) => r.Titulo },
            { header: "HH", value: (r) => r.HH },
          ]}
          pdfTargetRef={pdfRef}
          pdfTitle="Manutenção Preditiva · Centro de Controle"
        />
      </div>

      <SectionHeader label="Panorama" insight={`${total} ações preditivas · ${formatBRNumber(totalHH, 1)}h estimados · ${byTipo.length} tipos`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Total de ações" value={total} icon={Activity} variant="primary" />
          <KpiCard label="HH Estimado" value={`${formatBRNumber(totalHH, 1)}h`} icon={Clock} variant="neutral" />
          <KpiCard label="Tipos distintos" value={byTipo.length} icon={TrendingUp} variant="success" />
        </div>
      </SectionHeader>

      {byTipo.length > 0 && (
        <SectionHeader label="Distribuição" insight={`${byTipo.length} tipos de manutenção preditiva`}>
          <Panel title="AÇÕES POR TIPO">
            <div className="flex flex-wrap gap-2">
              {byTipo.map(({ name, value }) => (
                <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {name} <span className="num font-bold">{value}</span>
                </span>
              ))}
            </div>
          </Panel>
        </SectionHeader>
      )}

      <SectionHeader label="Registro" insight={`${preditiva.length} ações cadastradas`}>
        <DataTable data={preditiva} columns={columns} pageSize={15} />
      </SectionHeader>
    </div>
  );
}
