import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Activity, CheckCircle2, Clock } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { PreditivaRow } from "@/lib/sheets-types";
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
import { TrendingUp } from "lucide-react";
import { parseBRDate, formatBRDate } from "@/lib/format";

export const Route = createFileRoute("/_app/preditivas")({
  component: PreditivasPage,
});

const columns: ColumnDef<PreditivaRow>[] = [
  { accessorKey: "NumeroRelatorio", header: "Nº Relatório" },
  {
    accessorKey: "Data",
    header: "Data",
    cell: ({ getValue }) => {
      const d = parseBRDate(getValue() as string);
      return <span className="num">{d ? formatBRDate(d) : ((getValue() as string) || "—")}</span>;
    },
  },
  { accessorKey: "Servico", header: "Serviço" },
  { accessorKey: "TipoEquipamento", header: "Tipo Equipamento" },
  { accessorKey: "Equipamento", header: "Equipamento" },
  { accessorKey: "Area", header: "Área" },
  { accessorKey: "Setor", header: "Setor" },
  { accessorKey: "Conjunto", header: "Conjunto" },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={(row.original.Status || "Pendente") as ExecStatus} />,
  },
  {
    accessorKey: "Acoes",
    header: "Ações",
    cell: ({ getValue }) => (
      <span className="line-clamp-2 max-w-[400px] text-sm">{getValue() as string}</span>
    ),
  },
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
          title="Nenhum relatório preditivo cadastrado"
          description="Não há registros na planilha de manutenção preditiva."
        />
      </div>
    );
  }

  const total = preditiva.length;
  const finalizadas = preditiva.filter((r) => /finaliz|conclu/i.test(r.Status || "")).length;
  const pendentes = total - finalizadas;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preditivas"
        subtitle="Relatórios de manutenção preditiva (termografia, óleo, vibração)"
        exportButton={
          <ExportButton
            filename="preditivas"
            rows={preditiva}
            columns={[
              { header: "Nº Relatório", value: (r) => r.NumeroRelatorio },
              { header: "Data", value: (r) => r.Data },
              { header: "Área", value: (r) => r.Area },
              { header: "Setor", value: (r) => r.Setor },
              { header: "Conjunto", value: (r) => r.Conjunto },
              { header: "Tipo Equipamento", value: (r) => r.TipoEquipamento },
              { header: "Equipamento", value: (r) => r.Equipamento },
              { header: "Serviço", value: (r) => r.Servico },
              { header: "Status", value: (r) => r.Status },
              { header: "Ações", value: (r) => r.Acoes },
            ]}
            pdfTitle="Preditivas"
          />
        }
      />

      <SectionHeader
        label="Panorama"
        insight={`${total} relatórios · ${finalizadas} finalizados`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Total de relatórios" value={total} icon={Activity} variant="primary" />
          <KpiCard
            label="Finalizados"
            value={finalizadas}
            icon={CheckCircle2}
            variant="success"
          />
          <KpiCard label="Pendentes" value={pendentes} icon={Clock} variant="warning" />
        </div>
      </SectionHeader>

      <SectionHeader
        label="Relatórios"
        insight={`${preditiva.length} registros`}
      >
        <Panel title="LISTA DE RELATÓRIOS PREDITIVOS">
          <DataTable
            data={preditiva}
            columns={columns}
            pageSize={15}
            searchKeys={["NumeroRelatorio", "Servico", "TipoEquipamento", "Equipamento", "Area", "Setor", "Acoes"]}
            detailTitle={(r) => `Nº ${r.NumeroRelatorio}`}
            detailSubtitle={(r) => `${r.Servico} — ${r.Equipamento || r.TipoEquipamento}`}
          />
        </Panel>
      </SectionHeader>
    </div>
  );
}
