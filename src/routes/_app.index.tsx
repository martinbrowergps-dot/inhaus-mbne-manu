import { useRef } from "react";
import { motion } from "framer-motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { Panel } from "@/components/panel";
import { ExportButton } from "@/components/export-button";
import { formatBRNumber, formatInt, formatDateBR } from "@/lib/format";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData } from "@/lib/pdf-report";
import { PageHeader } from "@/components/page-header";

import { CommandBar } from "@/components/visao-geral/command-bar";
import { ActivitySection } from "@/components/visao-geral/activity-section";
import { PerformanceSection } from "@/components/visao-geral/performance-section";
import { AttentionSection } from "@/components/visao-geral/attention-section";
import { ResourceSection } from "@/components/visao-geral/resource-section";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
});

function VisaoGeral() {
  const { metrics, isLoading, error, dateFilter } = useDashboardMetrics();
  const pdfRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const chartClick = (_label: string) => {
    navigate({ to: "/programacao" });
  };

  if (isLoading) {
    return <KpiSkeletonGrid count={8} className="md:grid-cols-4" />;
  }

  if (error || !metrics) {
    return (
      <Panel title="ERRO AO CARREGAR DADOS">
        <p className="text-sm text-muted-foreground">
          Não foi possível ler a planilha. Verifique se ela está pública.
        </p>
        <p className="mt-2 text-xs text-destructive">{(error as Error)?.message}</p>
      </Panel>
    );
  }

  const { counts, charts, aderencia, programacaoFiltrada, tecnicosCount = metrics.raw.tecnicos.length } = metrics;

  const handleExecutiveSummary = async (layout?: import("@/lib/export-pdf").PdfLayoutOptions) => {
    const chartEls = chartRef.current?.querySelectorAll<HTMLElement>("[data-chart]");
    const chartsArr = chartEls ? Array.from(chartEls) : [];

    const reportData: ReportData = {
      title: "Visão Geral · Centro de Controle",
      subtitle: dateFilter.isActive
        ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(counts.total)} OS · ${formatBRNumber(counts.totalHH, 1)} HH`
        : `${formatInt(counts.total)} OS · ${formatBRNumber(counts.totalHH, 1)} HH`,
      metrics: [
        { label: "Total de OS", value: formatInt(counts.total), variant: "primary" },
        { label: "Em Andamento", value: formatInt(counts.emAndamento), variant: "warning" },
        { label: "Finalizadas", value: formatInt(counts.finalizadas), variant: "success" },
        { label: "Canceladas", value: formatInt(counts.canceladas), variant: "danger" },
        { label: "Atrasadas", value: formatInt(counts.atrasadas), variant: "danger" },
        { label: "Criticidade AA", value: formatInt(counts.aa), variant: "danger" },
        { label: "OS Pendentes", value: formatInt(counts.programadas), variant: "neutral" },
        { label: "HH Programado", value: `${formatBRNumber(counts.totalHH, 1)}h`, variant: "primary" },
        { label: "Técnicos Ativos", value: formatInt(tecnicosCount), variant: "neutral" },
        {
          label: "Temp. em Alerta",
          value: formatInt(counts.tempAlerta),
          variant: counts.tempAlerta > 0 ? "danger" : "success",
        },
      ],
      aderencia: {
        pct: aderencia.pct,
        finalizadasNoPrazo: aderencia.finalizadasNoPrazo,
        totalProgramadas: aderencia.totalProgramadas,
      },
      tables: [],
    };

    try {
      await renderReportPdf(reportData, chartsArr, {
        filename: "resumo-executivo",
        orientation: "landscape",
        layout,
      });
    } catch (err) {
      console.error("Erro ao exportar resumo executivo:", err);
    }
  };

  return (
    <div ref={pdfRef} className="space-y-6">
      <div ref={chartRef} className="hidden" /> {/* Hidden chart ref for PDF capture if needed, though usually we capture visible panels */}
      <PageHeader
        title="Visão Geral"
        subtitle="Painel executivo de manutenção • dados atualizados automaticamente a cada 5 minutos"
        filterBadge={
          dateFilter.isActive ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
              {formatDateBR(dateFilter.startDate)} – {formatDateBR(dateFilter.endDate)}
            </span>
          ) : undefined
        }
        exportButton={
          <ExportButton
            filename="visao-geral"
            rows={programacaoFiltrada}
            columns={[
              { header: "Nº OS", value: (r) => r.NumeroOS },
              { header: "Data", value: (r) => r.DataProgramada },
              { header: "Sistema", value: (r) => r.Sistema },
              { header: "Descrição", value: (r) => r.Descricao },
              { header: "Criticidade", value: (r) => r.Criticidade },
              { header: "Cargo", value: (r) => r.Cargo },
              { header: "HH", value: (r) => r.HH },
              { header: "Executante", value: (r) => r.Executante },
              { header: "Status", value: (r) => r.StatusExecucao || r.Status },
            ]}
            pdfTargetRef={pdfRef}
            pdfTitle="Visão Geral · Centro de Controle"
            pdfSubtitle={
              dateFilter.isActive
                ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(counts.total)} OS · ${formatBRNumber(counts.totalHH, 1)} HH`
                : `${formatInt(counts.total)} OS · ${formatBRNumber(counts.totalHH, 1)} HH`
            }
            onExecutiveSummary={handleExecutiveSummary}
          />
        }
      />

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } }
        }}
        className="space-y-6"
      >
        <CommandBar 
          aa={counts.aa}
          atrasadas={counts.atrasadas}
          tempAlerta={counts.tempAlerta}
          total={counts.total}
          emAndamento={counts.emAndamento}
          finalizadas={counts.finalizadas}
        />

        <ActivitySection 
          total={counts.total}
          emAndamento={counts.emAndamento}
          finalizadas={counts.finalizadas}
          byDia={charts.byDia}
          byPlanejamento={charts.byPlanejamento}
          byPlanejamentoDia={charts.byPlanejamentoDia}
          onChartClick={chartClick}
        />

        <PerformanceSection 
          aderencia={aderencia}
          planejados={charts.planejados}
          naoPlanejados={charts.naoPlanejados}
          byStatus={charts.byStatus}
          bySistema={charts.bySistema}
          onChartClick={chartClick}
        />

        <AttentionSection 
          aa={counts.aa}
          quebras={charts.quebras}
          tempAlerta={counts.tempAlerta}
          byCriticidade={charts.byCriticidade}
          onChartClick={chartClick}
        />

        <ResourceSection 
          tecnicosCount={counts.tecnicos}
          sistemasCount={charts.bySistema.length}
          totalHH={counts.totalHH}
          programacaoFiltrada={programacaoFiltrada}
        />
      </motion.div>
    </div>
  );
}
