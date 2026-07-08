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
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_STYLE,
  CHART_CURSOR_STYLE,
  aggregate,
} from "@/lib/chart-utils";
import { Panel } from "@/components/panel";
import { AderenciaCard, computeAderencia } from "@/components/aderencia-card";
import { ExportButton } from "@/components/export-button";
import { summarizeLocais } from "@/lib/temperature";
import { formatBRNumber, formatInt, parseBRDate, formatDateBR } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { deriveExecStatus } from "@/lib/status";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData } from "@/lib/pdf-report";
import { KpiCarousel, KpiGrid, type KpiItem } from "@/components/kpi-carousel";
import { Section } from "@/components/visao-geral/section";
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
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
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
        { label: "OS Programadas", value: formatInt(programadas), variant: "neutral" },
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
    <div ref={pdfRef} className="space-y-8">
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

      <div ref={chartRef} className="space-y-8">
        {/* ═══════════ ① O PLANO ═══════════ */}
        <Section
          label="O Plano"
          insight={`${formatInt(total)} OS no período · ${formatInt(planejados)} planejadas · ${formatInt(naoPlanejados)} não planejadas · ${formatBRNumber(totalHH, 1)}h HH`}
          icon={ClipboardList}
          colorIndex={0}
        >
          {(() => {
            const planoKpis: KpiItem[] = [
              {
                label: "Total de OS",
                value: formatInt(total),
                icon: ClipboardList,
                variant: "primary",
              },
              {
                label: "OS Programadas",
                value: formatInt(programadas),
                icon: Calendar,
                variant: "neutral",
              },
              {
                label: "HH Programado",
                value: formatBRNumber(totalHH, 1),
                hint: "horas-homem",
                icon: Clock,
                variant: "primary",
              },
            ];
            return (
              <>
                <KpiCarousel items={planoKpis} />
                <KpiGrid items={planoKpis} />
              </>
            );
          })()}

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
                <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                  Sem registros no período
                </div>
              ) : (
                <div className="h-72 md:h-64">
                  <ResponsiveContainer>
                    <BarChart
                      data={byPlanejamentoDia}
                      barCategoryGap="5%"
                      margin={{ top: 20, right: 8, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#94A3B8" }}
                        stroke="#94A3B8"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94A3B8" }}
                        stroke="#94A3B8"
                        allowDecimals={false}
                      />
                      <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
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
                        fill="#22C55E"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="planejado"
                          position="insideTop"
                          fill="#94A3B8"
                          fontSize={8}
                          offset={-4}
                          formatter={(v: number) => (v > 0 ? v : "")}
                        />
                      </Bar>
                      <Bar
                        dataKey="naoPlanejado"
                        name="naoPlanejado"
                        stackId="a"
                        fill="#EF4444"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="naoPlanejado"
                          position="insideTop"
                          fill="#94A3B8"
                          fontSize={8}
                          offset={-4}
                          formatter={(v: number) => (v > 0 ? v : "")}
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
              <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                Sem registros no período
              </div>
            ) : (
              <div className="h-72 md:h-64">
                <ResponsiveContainer>
                  <BarChart
                    data={byDia}
                    barCategoryGap="5%"
                    margin={{ top: 20, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#93C5D8" }}
                      stroke="#93C5D8"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#93C5D8" }}
                      stroke="#93C5D8"
                      allowDecimals={false}
                    />
                    <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar dataKey="value" name="OS" radius={[4, 4, 0, 0]}>
                      {byDia.map((d, i) => {
                        const maxVal = Math.max(...byDia.map((x) => x.value), 1);
                        const intensity = d.value / maxVal;
                        const r = Math.round(6 + 182 * intensity);
                        const g = Math.round(182 - 140 * intensity);
                        const b = Math.round(212 - 150 * intensity);
                        return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
                      })}
                      <LabelList position="top" fill="#93C5D8" fontSize={9} formatter={(v: number) => v > 0 ? v : ""} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </Section>

{/* ═══════════ ② A EXECUÇÃO ═══════════ */}
        <Section
          label="A Execução"
          insight={`${formatInt(finalizadas)} OS finalizadas (${formatBRNumber(aderencia.pct, 1)}% de aderência) · ${formatInt(emAndamento)} em andamento · ${formatInt(aderencia.pendentes)} pendentes`}
          icon={CheckCircle2}
          colorIndex={1}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AderenciaCard
              pct={aderencia.pct}
              finalizadasNoPrazo={aderencia.finalizadasNoPrazo}
              finalizadasForaPrazo={aderencia.finalizadasForaPrazo}
              canceladas={aderencia.canceladas}
              pendentes={aderencia.pendentes}
              totalProgramadas={aderencia.totalProgramadas}
              className="lg:col-span-1"
            />
            {(() => {
              const execKpis: KpiItem[] = [
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
              ];
              return (
                <>
                  <KpiCarousel items={execKpis} />
                  <KpiGrid items={execKpis} className="lg:col-span-2" />
                </>
              );
            })()}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel dataChart="status-os" title="STATUS DAS OS" glass>
              <ChartPie data={byStatus} />
            </Panel>
            <Panel dataChart="os-sistema" title="OS POR SISTEMA" glass>
              <ChartPie data={bySistema} />
            </Panel>
          </div>
        </Section>

        {/* ═══════════ ③ OS PROBLEMAS ═══════════ */}
        <Section
          label="Os Problemas"
          insight={`${formatInt(aa)} OS com criticidade AA · ${quebras.length} quebras de programação · ${formatInt(tempAlerta)} alertas térmicos`}
          icon={AlertOctagon}
          colorIndex={3}
        >
          {(() => {
            const probKpis: KpiItem[] = [
              {
                label: "Criticidade AA",
                value: formatInt(aa),
                icon: AlertOctagon,
                variant: "danger",
              },
              {
                label: "Temperaturas em Alerta",
                value: formatInt(tempAlerta),
                hint: `${locais.length} locais monitorados`,
                icon: Thermometer,
                variant: tempAlerta > 0 ? "danger" : "success",
              },
              {
                label: "Técnicos Ativos",
                value: formatInt(tecnicos.length),
                icon: Users,
                variant: "neutral",
              },
            ];
            return (
              <>
                <KpiCarousel items={probKpis} />
                <KpiGrid items={probKpis} />
              </>
            );
          })()}

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
                <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                  Nenhuma quebra de programação no período
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart
                      data={quebras}
                      layout="vertical"
                      margin={{ left: 20, right: 8, top: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#94A3B8" }}
                        stroke="#94A3B8"
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#94A3B8" }}
                        stroke="#94A3B8"
                        width={120}
                      />
                      <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                      <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]}>
                        <LabelList position="right" fill="#94A3B8" fontSize={10} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
        </Section>

{/* ═══════════ ④ RECURSOS ═══════════ */}
        <Section
          label="Recursos"
          insight={`${formatInt(tecnicos.length)} técnicos disponíveis · ${bySistema.length} sistemas em operação · ${locais.length} locais monitorados`}
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
        </Section>
      </div>

      {/* ═══════════ ⑤ NAVEGAÇÃO ═══════════ */}
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
