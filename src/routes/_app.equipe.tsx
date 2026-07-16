import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { UserCircle2, Users, Layers } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { TecnicoRow } from "@/lib/sheets-types";
import { aggregate } from "@/lib/chart-utils";
import { Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/equipe")({
  component: EquipePage,
});

const cols: ColumnDef<TecnicoRow>[] = [
  { accessorKey: "ID", header: "ID" },
  {
    accessorKey: "Nome",
    header: "Nome",
    cell: ({ getValue }) => (
      <span className="flex items-center gap-2">
        <UserCircle2 className="h-4 w-4 text-primary" />
        {getValue() as string}
      </span>
    ),
  },
  { accessorKey: "Cargo", header: "Cargo" },
];

function EquipePage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  const tecnicos = useMemo(() => data?.tecnicos ?? [], [data?.tecnicos]);
  const byCargo = useMemo(() => aggregate(tecnicos, (r) => r.Cargo || "—"), [tecnicos]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        subtitle="Técnicos cadastrados no plano de manutenção"
        exportButton={
          <ExportButton
            filename="equipe"
            rows={tecnicos}
            columns={[
              { header: "ID", value: (r) => r.ID },
              { header: "Nome", value: (r) => r.Nome },
              { header: "Cargo", value: (r) => r.Cargo },
            ]}
            pdfTitle="Equipe · Centro de Controle"
          />
        }
      />

      <SectionHeader
        label="Panorama"
        insight={`${tecnicos.length} técnicos · ${byCargo.length} cargos distintos`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Total de técnicos" value={tecnicos.length} icon={Users} variant="primary" />
          <KpiCard label="Cargos distintos" value={byCargo.length} icon={Layers} variant="neutral" />
        </div>
      </SectionHeader>

      <SectionHeader label="Distribuição" insight="Técnicos agrupados por cargo">
        <Panel title="TÉCNICOS POR CARGO" glass>
          {byCargo.length === 0 ? (
            <EmptyState className="h-48" />
          ) : (
            <ChartBarHorizontal data={byCargo} />
          )}
        </Panel>
      </SectionHeader>

      <SectionHeader label="Registro" insight={`${tecnicos.length} técnicos cadastrados`}>
        <Panel title={`${tecnicos.length} TÉCNICOS ATIVOS`}>
          {isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <DataTable
              data={tecnicos}
              columns={cols}
              searchPlaceholder="Buscar por nome, cargo, ID…"
              pageSize={20}
              detailTitle={(r) => r.Nome}
              detailSubtitle={(r) => r.Cargo}
            />
          )}
        </Panel>
      </SectionHeader>
    </div>
  );
}
