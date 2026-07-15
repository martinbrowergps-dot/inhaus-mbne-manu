import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Play,
  CheckCircle2,
  Calendar,
  AlertOctagon,
  Clock,
  Users,
  Thermometer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend,
  LabelList,
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useDateFilter } from "@/hooks/use-date-filter";
import {
  CHART_LEGEND_STYLE,
  COLORS,
  SERIES_COLORS,
  aggregate,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from "@/lib/chart-utils";
import { Panel } from "@/components/panel";
import { AderenciaCard, computeAderencia } from "@/components/aderencia-card";
import { ExportButton } from "@/components/export-button";
import { summarizeLocais } from "@/lib/temperature";
import { formatBRNumber, formatInt, parseBRDate, formatDateBR } from "@/lib/format";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { Button } from "@/components/ui/button";
import { deriveExecStatus } from "@/lib/status";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData } from "@/lib/pdf-report";
import { KpiStrip, type KpiItem } from "@/components/kpi-carousel";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { ChartPie } from "@/components/visao-geral/chart-pie";
import { ChartDonut } from "@/components/visao-geral/chart-donut";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import {
  aggregateHH,
  aggregateByDay,
  aggregateByDayAndStatus,
} from "@/components/visao-geral/helpers";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
});

function VisaoGeral() {
  const { data, isLoading, error } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const dateFilter = useDateFilter();

  if (isLoading) {
    return <KpiSkeletonGrid count={8} className="md:grid-cols-4" />;
  }

  if (error || !data) {
    return (
      <Panel title="ERRO AO CARREGAR DADOS">
        <p className="text-sm text-muted-foreground">
          Não foi possível ler a planilha. Verifique se ela está pública.
        </p>
        <p className="mt-2 text-xs text-destructive">{(error as Error)?.message}</p>
      </Panel>
    );
  }

  const { programacao, tecnicos, medicoes } = data;
  const programacaoFiltrada = (programacao ?? []).filter((p) =>
    dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
  );
  const medicoesFiltradas = (medicoes ?? []).filter((m) => dateFilter.filterByDateRange(m.DATA));
  const total = programacaoFiltrada.length;
  const enriched = programacaoFiltrada.map((p) => ({ ...p, _execStatus: deriveExecStatus(p) }));
  const programadas = enriched.filter((p) => p._execStatus === "Programada").length;
  const emAndamento = enriched.filter((p) => p._execStatus === "Em execução").length;
  const finalizadas = enriched.filter((p) => p._execStatus === "Finalizada").length;
  const aa = programacaoFiltrada.filter((p) => p.Criticidade?.toUpperCase() === "AA").length;
  const totalHH = programacaoFiltrada.reduce((s, p) => s + (p.HH || 0), 0);

  const locais = summarizeLocais(medicoesFiltradas);
  const tempAlerta = locais.filter((l) => l.status !== "normal").length;

  // OS por Sistema
  const bySistema = aggregate(programacaoFiltrada, (p) => p.Sistema || "—");
  // OS por Criticidade
  const byCriticidade = aggregate(programacaoFiltrada, (p) => p.Criticidade || "—");
  // OS por Dia (próximos 14 dias)
  const byDia = aggregateByDay(programacaoFiltrada);
  // Status
  const byStatus = aggregate(enriched, (p) => p._execStatus);
  const aderencia = computeAderencia(programacaoFiltrada);

  // Planejado vs Não Planejado
  const byPlanejamento = aggregate(programacaoFiltrada, (p) => {
    const s = (p.Status || "").trim();
    if (s === "Planejado") return "Planejado";
    if (s === "Não Planejado") return "Não Planejado";
    return s || "—";
  });
  const planejados = byPlanejamento.find((p) => p.name === "Planejado")?.value ?? 0;
  const naoPlanejados = byPlanejamento.find((p) => p.name === "Não Planejado")?.value ?? 0;

  // Planejado vs Não Planejado por dia (últimos 14 dias)
  const byPlanejamentoDia = aggregateByDayAndStatus(programacaoFiltrada);

  // Quebra de Programação por solicitante
  const quebras = programacaoFiltrada
    .filter((p) => (p.Tipo || "").toUpperCase() === "QUEBRA DE PROGRAMAÇÃO")
    .reduce<{ name: string; value: number }[]>((acc, p) => {
      const name = p.SolicitanteQuebra || "Não informado";
      const existing = acc.find((a) => a.name === name);
      if (existing) existing.value++;
      else acc.push({ name, value: 1 });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const handleExecutiveSummary = async (layout?: import("@/lib/export-pdf").PdfLayoutOptions) => {
    const chartEls = chartRef.current?.querySelectorAll<HTMLElement>("[data-chart]");
    const charts = chartEls ? Array.from(chartEls) : [];

    const reportData: ReportData = {
      title: "Visão Geral · Centro de Controle",
      subtitle: dateFilter.isActive
        ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)} HH`
        : `${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)} HH`,
      metrics: [
        { label: "Total de OS", value: formatInt(total), variant: "primary" },
        { label: "Em Andamento", value: formatInt(emAndamento), variant: "warning" },
        { label: "Finalizadas", value: formatInt(finalizadas), variant: "success" },
        { label: "Criticidade AA", value: formatInt(aa), variant: "danger" },
        { label: "OS Pendentes", value: formatInt(programadas), variant: "neutral" },
        { label: "HH Programado",  value: `${formatBRNumber(totalHH, 1)}h`, variant: "primary" },
        { label: "Técnicos Ativos", value: formatInt(tecnicos.length), variant: "neutral" },
        {
          label: "Temp. em Alerta",
          value: formatInt(tempAlerta),
          variant: tempAlerta > 0 ? "danger" : "success",
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
      await renderReportPdf(reportData, charts, {
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="fade-up text-xs text-muted-foreground">
            Painel executivo de manutenção • dados atualizados automaticamente a cada 5 minutos
          </p>
        </div>
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
              ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)} HH`
              : `${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)} HH`
          }
          onExecutiveSummary={handleExecutiveSummary}
        />
      </div>

      <div ref={chartRef} className="space-y-6">
        {/* ═══════════ HERO DE KPIs ═══════════ */}
        <KpiStrip
          items={[
            {
              label: "Total de OS",
              value: formatInt(total),
              icon: ClipboardList,
              variant: "primary",
            },
            {
              label: "OS Pendentes",
              value: formatInt(programadas),
              icon: Calendar,
              variant: "neutral",
            },
            {
              label: "Em Andamento",
              value: formatInt(emAndamento),
              icon: Play,
              variant: "warning",
            },
            {
              label: "Finalizadas",
              value: formatInt(finalizadas),
              icon: CheckCircle2,
              variant: "success",
            },
            {
              label: "Criticidade AA",
              value: formatInt(aa),
              icon: AlertOctagon,
              variant: "danger",
            },
            {
              label: "HH Programado",
              value: formatBRNumber(totalHH, 1),
              hint: "horas-homem",
              icon: Clock,
              variant: "primary",
            },
            {
              label: "Técnicos Ativos",
              value: formatInt(tecnicos.length),
              icon: Users,
              variant: "neutral",
            },
            {
              label: "Temp. em Alerta",
              value: formatInt(tempAlerta),
              hint: `${locais.length} locais`,
              icon: Thermometer,
              variant: tempAlerta > 0 ? "danger" : "success",
            },
          ]}
        />

        {/* ═══════════ PLANEJAMENTO ═══════════ */}
        <SectionHeader
          label="Planejamento"
          insight={`${formatInt(planejados)} planejadas · ${formatInt(naoPlanejados)} não planejadas · ${formatBRNumber(totalHH, 1)}h HH no período`}
          icon={ClipboardList}
          colorIndex={0}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Panel dataChart="planejamento-pie" title="PLANEJADO vs NÃO PLANEJADO" glass>
              <ChartPie data={byPlanejamento} />
            </Panel>

            <Panel
              dataChart="planejamento-dia"
              title="PLANEJADO vs NÃO PLANEJADO POR DIA"
              subtitle="Últimos 14 dias"
              className="lg:col-span-2"
              glass
            >
              {byPlanejamentoDia.length === 0 ? (
                <EmptyState className="h-64" />
              ) : (
                <div className="h-72 md:h-64">
                  <ResponsiveContainer>
                    <BarChart
                      data={byPlanejamentoDia}
                      barCategoryGap="5%"
                      margin={{ top: 30, right: 20, left: 20, bottom: 4 }}
                    >
                      <CartesianGrid {...chartGridProps} />
                      <XAxis dataKey="label" {...chartAxisProps} />
                      <YAxis {...chartAxisProps} allowDecimals={false} />
                      <ReTooltip {...chartTooltipProps} />
                      <Legend
                        wrapperStyle={CHART_LEGEND_STYLE}
                        formatter={(value) =>
                          value === "planejado" ? "Planejado" : "Não Planejado"
                        }
                      />
                      <Bar
                        dataKey="planejado"
                        name="planejado"
                        stackId="a"
                        fill={SERIES_COLORS.planejado}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="naoPlanejado"
                        name="naoPlanejado"
                        stackId="a"
                        fill={SERIES_COLORS.naoPlanejado}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                      >
                        <LabelList
                          content={({ x, y, width, index }) => {
                            const d =
                              index !== undefined ? byPlanejamentoDia[index] : undefined;
                            if (!d) return null;
                            if ((d.planejado || 0) + (d.naoPlanejado || 0) <= 0) return null;
                            return (
                              <text
                                x={Number(x) + Number(width) / 2}
                                y={Number(y) - 6}
                                textAnchor="middle"
                                fill="#F1F5F9"
                                fontSize={10}
                              >
                                {d.planejado}/{d.naoPlanejado}
                              </text>
                            );
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>

          <Panel dataChart="os-por-dia" title="OS POR DIA" subtitle="Próximas 2 semanas">
            {byDia.length === 0 ? (
              <EmptyState className="h-64" />
            ) : (
              <div className="h-72 md:h-64">
                  <ResponsiveContainer>
                    <BarChart
                      data={byDia}
                      barCategoryGap="5%"
                      margin={{ top: 30, right: 20, left: 20, bottom: 4 }}
                    >
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="label" {...chartAxisProps} />
                    <YAxis {...chartAxisProps} allowDecimals={false} />
                    <ReTooltip {...chartTooltipProps} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar dataKey="value" name="OS" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {byDia.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                      <LabelList
                        content={({ x, y, width, value }) => {
                          const numVal = Number(value);
                          if (!numVal || numVal <= 0) return null;
                          return (
                            <text
                              x={Number(x) + Number(width) / 2}
                              y={Number(y) - 6}
                              textAnchor="middle"
                              fill="#F1F5F9"
                              fontSize={10}
                            >
                              {value}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </SectionHeader>

        {/* ═══════════ EXECUÇÃO ═══════════ */}
        <SectionHeader
          label="Execução"
          insight={`${formatBRNumber(aderencia.pct, 1)}% de aderência · ${formatInt(finalizadas)} finalizadas · ${formatInt(emAndamento)} em andamento · ${formatInt(aderencia.pendentes)} pendentes`}
          icon={CheckCircle2}
          colorIndex={1}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <AderenciaCard
              pct={aderencia.pct}
              finalizadasNoPrazo={aderencia.finalizadasNoPrazo}
              finalizadasForaPrazo={aderencia.finalizadasForaPrazo}
              canceladas={aderencia.canceladas}
              pendentes={aderencia.pendentes}
              totalProgramadas={aderencia.totalProgramadas}
            />
            <Panel dataChart="status-os" title="STATUS DAS OS" glass>
              <ChartDonut data={byStatus} />
            </Panel>
            <Panel dataChart="os-sistema" title="OS POR SISTEMA" className="lg:col-span-1" glass>
              <ChartBarHorizontal data={bySistema} />
            </Panel>
          </div>
        </SectionHeader>

        {/* ═══════════ PROBLEMAS ═══════════ */}
        <SectionHeader
          label="Problemas"
          insight={`${formatInt(aa)} OS com criticidade AA · ${quebras.length} quebras de programação · ${formatInt(tempAlerta)} alertas térmicos`}
          icon={AlertOctagon}
          colorIndex={3}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel dataChart="criticidade" title="OS POR CRITICIDADE" glass>
              <ChartDonut data={byCriticidade} />
            </Panel>
            <Panel
              dataChart="quebras"
              title="QUEBRA DE PROGRAMAÇÃO POR SOLICITANTE"
              subtitle="OS do tipo quebra agrupadas por solicitante"
            >
              {quebras.length === 0 ? (
                <EmptyState title="Nenhuma quebra" description="de programação no período" className="h-64" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart
                      data={quebras}
                      layout="vertical"
                      margin={{ left: 20, right: 40, top: 8, bottom: 4 }}
                    >
                      <CartesianGrid {...chartGridProps} horizontal={false} />
                      <XAxis type="number" {...chartAxisProps} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" {...chartAxisProps} width={140} />
                      <ReTooltip {...chartTooltipProps} />
                      <Bar dataKey="value" fill={SERIES_COLORS.naoPlanejado} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList position="right" fill="#F1F5F9" fontSize={10} offset={8} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
        </SectionHeader>

        {/* ═══════════ RECURSOS ═══════════ */}
        <SectionHeader
          label="Recursos"
          insight={`${formatInt(tecnicos.length)} técnicos · ${bySistema.length} sistemas · ${locais.length} locais monitorados`}
          icon={Users}
          colorIndex={2}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel dataChart="hh-cargo" title="HH POR CARGO">
              {(() => {
                const hhData = aggregateHH(programacaoFiltrada);
                const avg = hhData.length > 0
                  ? hhData.reduce((s, d) => s + d.value, 0) / hhData.length
                  : 0;
                return (
                  <ChartBarHorizontal
                    data={hhData}
                    refLine={avg > 0 ? { value: Number(avg.toFixed(1)), label: "Média" } : undefined}
                  />
                );
              })()}
            </Panel>
          </div>
        </SectionHeader>
      </div>

      {/* ═══════════ NAVEGAÇÃO ═══════════ */}
      <Panel
        title="Navegação Rápida"
        glass
        action={
          <Link to="/alertas">
            <Button size="sm" variant="ghost" className="text-primary">
              Ver alertas →
            </Button>
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { url: "/programacao", label: "Programação Semanal" },
            { url: "/temperaturas", label: "Monitor Térmico" },
            { url: "/hh-semanal", label: "Capacidade HH" },
            { url: "/checklists", label: "Planos de Manutenção" },
          ].map((s) => (
            <Link
              key={s.url}
              to={s.url}
              className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
