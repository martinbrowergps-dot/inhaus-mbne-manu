import { useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, AlertOctagon, ClipboardList } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { NcRow } from "@/lib/sheets-types";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";

export const Route = createFileRoute("/_app/nc")({
  component: NcPage,
});

const columns: ColumnDef<NcRow>[] = [
  { accessorKey: "Codigo", header: "Código" },
  { accessorKey: "Tipo", header: "Tipo" },
  { accessorKey: "Categoria", header: "Categoria" },
  { accessorKey: "Prioridade", header: "Prioridade" },
  { accessorKey: "Titulo", header: "Título" },
  { accessorKey: "Responsavel", header: "Responsável" },
  { accessorKey: "Status", header: "Status" },
];

function NcPage() {
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

  const nc = data.nc;
  const total = nc.length;
  const criticas = nc.filter((r) => /alta|crit|urgent/i.test(r.Prioridade)).length;
  const abertas = nc.filter((r) => !/conclu|finaliz|fechado/i.test(r.Status)).length;

  const byTipo = useMemo(() => {
    const m = new Map<string, number>();
    nc.forEach((r) => { const k = r.Tipo || "—"; m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [nc]);

  return (
    <div ref={pdfRef} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Não Conformidades</h1>
          <p className="text-xs text-muted-foreground">
            Ações de não conformidade registradas
          </p>
        </div>
        <ExportButton
          filename="nao-conformidades"
          rows={nc}
          columns={[
            { header: "Código", value: (r) => r.Codigo },
            { header: "Tipo", value: (r) => r.Tipo },
            { header: "Categoria", value: (r) => r.Categoria },
            { header: "Prioridade", value: (r) => r.Prioridade },
            { header: "Título", value: (r) => r.Titulo },
            { header: "Responsável", value: (r) => r.Responsavel },
            { header: "Status", value: (r) => r.Status },
          ]}
          pdfTargetRef={pdfRef}
          pdfTitle="Não Conformidades · Centro de Controle"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Total de NCs" value={total} icon={ClipboardList} variant="primary" />
        <KpiCard label="Críticas/Alta" value={criticas} icon={AlertOctagon} variant={criticas > 0 ? "danger" : "neutral"} />
        <KpiCard label="Abertas" value={abertas} icon={AlertTriangle} variant={abertas > 0 ? "warning" : "success"} />
      </div>

      {byTipo.length > 0 && (
        <Panel title="NC POR TIPO">
          <div className="flex flex-wrap gap-2">
            {byTipo.map(({ name, value }) => (
              <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {name} <span className="num font-bold">{value}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      <DataTable data={nc} columns={columns} pageSize={15} />
    </div>
  );
}
