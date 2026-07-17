import { useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  CheckCircle2,
  AlertOctagon,
  Users,
  Thermometer,
  CalendarX,
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
import { deriveExecStatus } from "@/lib/status";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData } from "@/lib/pdf-report";

import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { ChartPie } from "@/components/visao-geral/chart-pie";
import { ChartDonut } from "@/components/visao-geral/chart-donut";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import { PageHeader } from "@/components/page-header";
import { aggregateQuebrasBySolicitante } from "@/lib/domain/aggregates";
import {
  aggregateHH,
  aggregateByDay,
  aggregateByDayAndStatus,
} from "@/components/visao-geral/helpers";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
});

function computePrevDateRange(dateFilter: ReturnType<typeof useDateFilter>):
  | { start: string; end: string }
  | null {
  if (!dateFilter.isActive) return null;
  const s = dateFilter.startDate;
  const e = dateFilter.endDate;
  if (!s || !e) return null;
  const start = new Date(s + "T00:00:00");
  const end = new Date(e + "T00:00:00");
  const diffDays = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return null;
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays - 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

function computeTrend(
  current: number,
  previous: number,
): { direction: "up" | "down" | "flat"; pct: string } | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return { direction: "up", pct: "+100%" };
  const change = ((current - previous) / previous) * 100;
  const pct = `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
  if (Math.abs(change) < 1) return { direction: "flat", pct };
  return { direction: change > 0 ? "up" : "down", pct };
}

function VisaoGeral() {
  const { data, isLoading, error } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const dateFilter = useDateFilter();
  const navigate = useNavigate();

  const chartClick = (label: string) => {
    navigate({ to: "/programacao" });
  };

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
  const canceladas = enriched.filter((p) => p._execStatus === "Cancelada").length;
  const atrasadas = enriched.filter((p) => p._execStatus === "Atrasada").length;
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
  const quebras = aggregateQuebrasBySolicitante(programacaoFiltrada);

  // ── Trend (vs período anterior) ──
  const prevRange = computePrevDateRange(dateFilter);
  const programacaoPrev = prevRange
    ? (programacao ?? []).filter((p) => {
        const d = p.DataReprogramada || p.DataProgramada;
        if (!d) return false;
        let dt: Date | null = null;
        try {
          dt = new Date(String(d).split("/").reverse().join("-") + "T00:00:00");
        } catch { /* empty */ }
        if (!dt) return false;
        const pStart = new Date(prevRange.start + "T00:00:00");
        const pEnd = new Date(prevRange.end + "T00:00:00");
        return dt >= pStart && dt <= pEnd;
      })
    : [];
  const prevEnriched = programacaoPrev.map((p) => ({
    ...p,
    _execStatus: deriveExecStatus(p),
  }));
  const prevTotal = programacaoPrev.length;
  const prevProgramadas = prevEnriched.filter((p) => p._execStatus === "Programada").length;
  const prevFinalizadas = prevEnriched.filter((p) => p._execStatus === "Finalizada").length;
  const prevCanceladas = prevEnriched.filter((p) => p._execStatus === "Cancelada").length;
  const prevAtrasadas = prevEnriched.filter((p) => p._execStatus === "Atrasada").length;
  const prevHH = programacaoPrev.reduce((s, p) => s + (p.HH || 0), 0);
  const trendOS = computeTrend(total, prevTotal);
  const trendPendentes = computeTrend(programadas, prevProgramadas);
  const trendFinalizadas = computeTrend(finalizadas, prevFinalizadas);
  const trendCanceladas = computeTrend(canceladas, prevCanceladas);
  const trendAtrasadas = computeTrend(atrasadas, prevAtrasadas);
  const trendHH = computeTrend(totalHH, prevHH);

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
        { label: "Canceladas", value: formatInt(canceladas), variant: "danger" },
        { label: "Atrasadas", value: formatInt(atrasadas), variant: "danger" },
        { label: "Criticidade AA", value: formatInt(aa), variant: "danger" },
        { label: "OS Pendentes", value: formatInt(programadas), variant: "neutral" },
        { label: "HH Programado", value: `${formatBRNumber(totalHH, 1)}h`, variant: "primary" },
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
                ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)} HH`
                : `${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)} HH`
            }
            onExecutiveSummary={handleExecutiveSummary}
          />
        }
      />

      <div ref={chartRef} className="space-y-6">
        {/* ═══════════ COMMAND BAR ═══════════ */}
        <div className="flex flex-wrap items-stretch gap-3 rounded-lg border border-border/60 bg-card/30 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {aa > 0 && (
              <button onClick={() => navigate({ to: "/programacao" })}
                className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-1 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/25">
                <AlertOctagon className="h-3 w-3" />
                {aa} AA
              </button>
            )}
            {atrasadas > 0 && (
              <button onClick={() => navigate({ to: "/programacao" })}
                className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 text-[11px] font-bold text-warning transition-colors hover:bg-warning/25">
                <CalendarX className="h-3 w-3" />
                {atrasadas} atrasadas
              </button>
            )}
            {tempAlerta > 0 && (
              <button onClick={() => navigate({ to: "/temperaturas" })}
                className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-400 transition-colors hover:bg-rose-500/25">
                <Thermometer className="h-3 w-3" />
                {tempAlerta} térmicos
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center divide-x divide-border/30">
            <div className="px-3 text-center">
              <div className="num text-lg font-bold text-foreground leading-none">{formatInt(total)}</div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Total OS</div>
            </div>
            <div className="px-3 text-center">
              <div className="num text-lg font-bold text-warning leading-none">{formatInt(emAndamento)}</div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Execução</div>
            </div>
            <div className="px-3 text-center">
              <div className="num text-lg font-bold text-success leading-none">{formatInt(finalizadas)}</div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Finalizadas</div>
            </div>
            <div className="px-3 text-center">
              <div className="num text-lg font-bold text-destructive leading-none">{formatInt(atrasadas)}</div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Atrasadas</div>
            </div>
          </div>
        </div>

        {/* ═══════════ ATIVIDADE ═══════════ */}
        <SectionHeader
          label="Atividade"
          insight={`${formatInt(total)} OS no período · ${formatInt(emAndamento)} em execução · ${formatInt(finalizadas)} finalizadas`}
          icon={Play}
          colorIndex={0}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Panel dataChart="os-por-dia" title="OS POR DIA" subtitle="Próximas 2 semanas" className="lg:col-span-2">
              {byDia.length === 0 ? (
                <EmptyState className="h-64" />
              ) : (
                <div className="h-72 md:h-64">
                  <ResponsiveContainer>
                    <BarChart data={byDia} barCategoryGap="5%" margin={{ top: 30, right: 20, left: 20, bottom: 4 }}>
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
                              <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fill="#F1F5F9" fontSize={10}>{value}</text>
                            );
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel dataChart="planejamento-pie" title="PLANEJADO vs NÃO" glass>
              <ChartPie data={byPlanejamento} onCellClick={chartClick} />
            </Panel>
          </div>
          <div className="mt-4">
            <Panel dataChart="planejamento-dia" title="PLANEJADO vs NÃO PLANEJADO POR DIA" subtitle="Últimos 14 dias">
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
                      <Bar dataKey="planejado" name="planejado" stackId="a" fill={SERIES_COLORS.planejado} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="naoPlanejado" name="naoPlanejado" stackId="a" fill={SERIES_COLORS.naoPlanejado} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        <LabelList
                          content={({ x, y, width, index }) => {
                            const d = index !== undefined ? byPlanejamentoDia[index] : undefined;
                            if (!d) return null;
                            if ((d.planejado || 0) + (d.naoPlanejado || 0) <= 0) return null;
                            return (
                              <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fill="#F1F5F9" fontSize={10}>
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
        </SectionHeader>

        {/* ═══════════ DESEMPENHO ═══════════ */}
        <SectionHeader
          label="Desempenho"
          insight={`${formatBRNumber(aderencia.pct, 1)}% aderência · ${formatInt(planejados)} planejadas · ${formatInt(naoPlanejados)} não planejadas`}
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
              <ChartDonut data={byStatus} onCellClick={chartClick} />
            </Panel>
            <Panel dataChart="os-sistema" title="OS POR SISTEMA" glass>
              <ChartBarHorizontal data={bySistema} onCellClick={chartClick} />
            </Panel>
          </div>
        </SectionHeader>

        {/* ═══════════ ATENÇÃO ═══════════ */}
        <SectionHeader
          label="Atenção"
          insight={`${formatInt(aa)} criticidade AA · ${quebras.length} quebras · ${formatInt(tempAlerta)} alertas térmicos`}
          icon={AlertOctagon}
          colorIndex={3}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel dataChart="criticidade" title="OS POR CRITICIDADE" glass>
              <ChartDonut data={byCriticidade} onCellClick={chartClick} />
            </Panel>
            <Panel dataChart="quebras" title="QUEBRAS POR SOLICITANTE" subtitle="OS tipo quebra" className="lg:col-span-2">
              {quebras.length === 0 ? (
                <EmptyState title="Nenhuma quebra" description="de programação no período" className="h-40" />
              ) : (
                <div className="h-48">
                  <ResponsiveContainer>
                    <BarChart data={quebras} layout="vertical" margin={{ left: 16, right: 32, top: 4, bottom: 4 }}>
                      <CartesianGrid {...chartGridProps} horizontal={false} />
                      <XAxis type="number" {...chartAxisProps} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" {...chartAxisProps} width={120} />
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
          insight={`${formatInt(tecnicos.length)} técnicos · ${bySistema.length} sistemas · ${formatBRNumber(totalHH, 1)}h HH`}
          icon={Users}
          colorIndex={2}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel dataChart="hh-cargo" title="HH POR CARGO" className="lg:col-span-2">
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
            <Panel title="TÉCNICOS" glass>
              <div className="num text-2xl font-bold text-foreground">{formatInt(tecnicos.length)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Ativos na plataforma</p>
            </Panel>
            <Panel title="HH TOTAL" glass>
              <div className="num text-2xl font-bold text-foreground">{formatBRNumber(totalHH, 1)}<span className="text-xs font-normal text-muted-foreground">h</span></div>
              <p className="mt-1 text-xs text-muted-foreground">Horas-homem programadas</p>
            </Panel>
          </div>
        </SectionHeader>
      </div>
    </div>
  );
}
