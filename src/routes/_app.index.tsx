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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useDateFilter } from "@/hooks/use-date-filter";
import { CHART_TOOLTIP_STYLE, CHART_LEGEND_STYLE, CHART_CURSOR_STYLE } from "@/lib/chart-utils";
import { KpiCard } from "@/components/kpi-card";
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
import { EmptyState } from "@/components/empty-state";
import { KpiCarousel, KpiGrid, type KpiItem } from "@/components/kpi-carousel";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
});

const COLORS = ["#0EA5FF", "#22C55E", "#EAB308", "#EF4444", "#1D4ED8", "#a78bfa", "#94A3B8"];

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
  const byStatus = aggregate(programacaoFiltrada, (p) => p.StatusExecucao || p.Status || "—");
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

  const handleExecutiveSummary = async () => {
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
        { label: "Temp. em Alerta", value: formatInt(tempAlerta), variant: tempAlerta > 0 ? "danger" : "success" },
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
        orientation: "portrait",
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
            { label: "Total de OS", value: formatInt(total), icon: ClipboardList, variant: "primary" },
            { label: "OS Programadas", value: formatInt(programadas), icon: Calendar, variant: "neutral" },
            { label: "HH Programado", value: formatBRNumber(totalHH, 1), hint: "horas-homem", icon: Clock, variant: "primary" },
          ];
          return (
            <>
              <KpiCarousel items={planoKpis} />
              <KpiGrid items={planoKpis} />
            </>
          );
        })()}

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel dataChart="planejamento-pie" title="PLANEJADO vs NÃO PLANEJADO" glass>
            <ChartPie data={byPlanejamento} />
          </Panel>

          <Panel dataChart="planejamento-dia" title="PLANEJADO vs NÃO PLANEJADO POR DIA" subtitle="Últimos 14 dias" className="lg:col-span-2" glass>
            {byPlanejamentoDia.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                Sem registros no período
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={byPlanejamentoDia} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                    <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE}
                      formatter={(value) => (value === "planejado" ? "Planejado" : "Não Planejado")}
                    />
                    <Bar dataKey="planejado" name="planejado" stackId="a" fill="#22C55E" radius={[4, 4, 0, 0]}>
                      <LabelList position="center" fill="#fff" fontSize={10} formatter={(v: number) => v > 0 ? v : ""} />
                    </Bar>
                    <Bar dataKey="naoPlanejado" name="naoPlanejado" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]}>
                      <LabelList position="center" fill="#fff" fontSize={10} formatter={(v: number) => v > 0 ? v : ""} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>

        <Panel dataChart="os-por-dia" title="OS POR DIA" subtitle="Próximas 2 semanas">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                <Bar dataKey="value" fill="#0EA5FF" radius={[4, 4, 0, 0]}>
                  <LabelList position="top" fill="#94A3B8" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Section>

      {/* ═══════════ ② A EXECUÇÃO ═══════════ */}
      <Section
        label="A Execução"
        insight={`${formatInt(finalizadas)} OS finalizadas (${formatBRNumber(aderencia.pct, 1)}% de aderência) · ${formatInt(emAndamento)} em andamento · ${formatInt(aderencia.pendentes)} pendentes`}
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
            className="lg:col-span-1"
          />
          {(() => {
            const execKpis: KpiItem[] = [
              { label: "Em Andamento", value: formatInt(emAndamento), icon: Play, variant: "warning" },
              { label: "Finalizadas", value: formatInt(finalizadas), icon: CheckCircle2, variant: "success" },
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
            { label: "Criticidade AA", value: formatInt(aa), icon: AlertOctagon, variant: "danger" },
            { label: "Temperaturas em Alerta", value: formatInt(tempAlerta), hint: `${locais.length} locais monitorados`, icon: Thermometer, variant: tempAlerta > 0 ? "danger" : "success" },
            { label: "Técnicos Ativos", value: formatInt(tecnicos.length), icon: Users, variant: "neutral" },
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
                  <BarChart data={quebras} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" width={120} />
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
            <ChartBarHorizontal data={aggregateHH(programacaoFiltrada)} />
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

function Section({ label, insight, icon: Icon, colorIndex = 0, children }: { label: string; insight: string; icon?: React.ElementType; colorIndex?: number; children: React.ReactNode }) {
  const SECTION_COLORS = ["text-primary", "text-success", "text-warning", "text-destructive"] as const;
  const colorClass = SECTION_COLORS[colorIndex % SECTION_COLORS.length];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border/30 pb-2">
        {Icon && (
          <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ${colorClass}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${colorClass}`}>
            {label}
          </span>
          <p className="truncate text-xs text-muted-foreground/70 leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function aggregate<T>(items: T[], keyFn: (t: T) => string) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it) || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function aggregateHH(rows: { Cargo: string; HH: number }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.Cargo || "—";
    map.set(k, (map.get(k) ?? 0) + (r.HH || 0));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
    .sort((a, b) => b.value - a.value);
}

function aggregateByDay(rows: { DataProgramada: string }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = parseBRDate(r.DataProgramada);
    if (!d) continue;
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      const [da, ma] = a[0].split("/").map(Number);
      const [db, mb] = b[0].split("/").map(Number);
      return ma - mb || da - db;
    })
    .slice(0, 14)
    .map(([label, value]) => ({ label, value }));
}

function aggregateByDayAndStatus(rows: { DataProgramada: string; Status: string }[]) {
  const map = new Map<string, { planejado: number; naoPlanejado: number; label: string }>();
  for (const r of rows) {
    const d = parseBRDate(r.DataProgramada);
    if (!d) continue;
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const e = map.get(key) ?? { planejado: 0, naoPlanejado: 0, label: key };
    const status = (r.Status || "").trim();
    const isPlanejado = status === "Planejado";
    if (isPlanejado) e.planejado++;
    else e.naoPlanejado++;
    map.set(key, e);
  }
  return Array.from(map.values())
    .sort((a, b) => {
      const [da, ma] = a.label.split("/").map(Number);
      const [db, mb] = b.label.split("/").map(Number);
      return ma - mb || da - db;
    })
    .slice(-14);
}

function ChartPie({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(e) => `${e.name}: ${e.value}`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <ReTooltip
            contentStyle={{
              background: "#05254A",
              border: "1px solid #0EA5FF55",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartDonut({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <ReTooltip
            contentStyle={{
              background: "#05254A",
              border: "1px solid #0EA5FF55",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartBarHorizontal({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            stroke="#94A3B8"
            width={110}
          />
          <ReTooltip
            contentStyle={{
              background: "#05254A",
              border: "1px solid #0EA5FF55",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="#22C55E" radius={[0, 4, 4, 0]}>
            <LabelList position="right" fill="#94A3B8" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Empty() {
  return <EmptyState />;
}
