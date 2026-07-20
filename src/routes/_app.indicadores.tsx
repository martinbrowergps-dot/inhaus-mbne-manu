import { useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { parseBRDate, formatBRNumber, formatDateBR, formatInt } from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";
import { summarizeLocais } from "@/lib/temperature";
import {
  CHART_LEGEND_STYLE,
  COLORS,
  SERIES_COLORS,
  aggregate,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
  CHART_FONT,
} from "@/lib/chart-utils";
import { AderenciaCard, computeAderencia } from "@/components/aderencia-card";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { EmptyState } from "@/components/empty-state";
import { deriveExecStatus } from "@/lib/status";

export const Route = createFileRoute("/_app/indicadores")({
  component: IndicadoresPage,
});

function IndicadoresPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);

  const dateFilter = useDateFilter();

  const programacaoFiltrada = useMemo(
    () =>
      (data?.programacao ?? []).filter((p) =>
        dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
      ),
    [data, dateFilter],
  );

  const computed = useMemo(() => {
    if (!data) return null;
    const aderencia = computeAderencia(programacaoFiltrada);

    // Aderência por sistema
    const bySys = new Map<string, { total: number; ok: number }>();
    for (const p of programacaoFiltrada) {
      if (!p.DataProgramada) continue;
      const k = p.Sistema || "—";
      const e = bySys.get(k) ?? { total: 0, ok: 0 };
      e.total++;
      const raw = (p.StatusExecucao || p.Status || "").toLowerCase();
      if (/finaliz|conclu/.test(raw) && !(p.DataReprogramada || "").trim()) e.ok++;
      bySys.set(k, e);
    }
    const aderSistema = Array.from(bySys.entries())
      .map(([name, v]) => ({ name, value: v.total > 0 ? (v.ok / v.total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Aderência semanal (últimas 8 semanas)
    const weekMap = new Map<string, { total: number; ok: number; ts: number }>();
    for (const p of programacaoFiltrada) {
      const d = parseBRDate(p.DataProgramada);
      if (!d) continue;
      const ws = new Date(d);
      const day = ws.getDay();
      ws.setDate(ws.getDate() - day + (day === 0 ? -6 : 1));
      ws.setHours(0, 0, 0, 0);
      const key = ws.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const e = weekMap.get(key) ?? { total: 0, ok: 0, ts: ws.getTime() };
      e.total++;
      const raw = (p.StatusExecucao || p.Status || "").toLowerCase();
      if (/finaliz|conclu/.test(raw) && !(p.DataReprogramada || "").trim()) e.ok++;
      weekMap.set(key, e);
    }
    const semanal = Array.from(weekMap.entries())
      .map(([label, v]) => ({
        label,
        value: v.total > 0 ? Number(((v.ok / v.total) * 100).toFixed(1)) : 0,
        ts: v.ts,
      }))
      .sort((a, b) => a.ts - b.ts)
      .slice(-8);

    // Backlog por criticidade (OS atrasadas)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const backlog = new Map<string, { count: number; hh: number }>();
    for (const p of programacaoFiltrada) {
      const status = deriveExecStatus(p);
      if (status !== "Atrasada") continue;
      const k = (p.Criticidade || "—").toUpperCase();
      const e = backlog.get(k) ?? { count: 0, hh: 0 };
      e.count++;
      e.hh += p.HH || 0;
      backlog.set(k, e);
    }
    const backlogArr = Array.from(backlog.entries())
      .map(([name, v]) => ({ name, OS: v.count, HH: Number(v.hh.toFixed(1)) }))
      .sort((a, b) => (a.name === "AA" ? -1 : b.name === "AA" ? 1 : a.name.localeCompare(b.name)));

    // HH por dia
    const hhDia = new Map<string, { value: number; ts: number }>();
    for (const p of programacaoFiltrada) {
      const d = parseBRDate(p.DataProgramada);
      if (!d) continue;
      const k = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const e = hhDia.get(k) ?? { value: 0, ts: d.getTime() };
      e.value += p.HH || 0;
      hhDia.set(k, e);
    }
    const hhDiaArr = Array.from(hhDia.entries())
      .map(([label, v]) => ({ label, value: Number(v.value.toFixed(2)), ts: v.ts }))
      .sort((a, b) => a.ts - b.ts);

    // Duração real (Início → Fim) vs HH planejado
    const duracoes: { inicioFim: number; hhPlan: number }[] = [];
    const byExec = new Map<string, { inicioFim: number[]; hhPlan: number[] }>();
    for (const p of programacaoFiltrada) {
      if (p.StatusExecucao !== "Finalizada") continue;
      const ini = parseBRDate(p.DataInicioExecucao);
      const fim = parseBRDate(p.DataFimExecucao);
      if (!ini || !fim) continue;
      const durH = (fim.getTime() - ini.getTime()) / 3_600_000;
      if (durH <= 0 || durH > 168) continue;
      duracoes.push({ inicioFim: durH, hhPlan: p.HH || 0 });
      const exe = p.Executante || "—";
      const e = byExec.get(exe) ?? { inicioFim: [], hhPlan: [] };
      e.inicioFim.push(durH);
      e.hhPlan.push(p.HH || 0);
      byExec.set(exe, e);
    }
    const duracaoMedia =
      duracoes.length > 0 ? duracoes.reduce((s, t) => s + t.inicioFim, 0) / duracoes.length : null;
    const hhPlanMedio =
      duracoes.length > 0 ? duracoes.reduce((s, t) => s + t.hhPlan, 0) / duracoes.length : null;
    const duracaoPorExec = Array.from(byExec.entries())
      .map(([name, v]) => ({
        name,
        duracao: Number((v.inicioFim.reduce((s, x) => s + x, 0) / v.inicioFim.length).toFixed(1)),
        hhPlan: Number((v.hhPlan.reduce((s, x) => s + x, 0) / v.hhPlan.length).toFixed(1)),
      }))
      .sort((a, b) => b.duracao - a.duracao);

    // Indicador de planejamento (OS planejadas vs não planejadas)
    const META_PLANEJAMENTO = 80;
    let planejado = 0;
    let naoPlanejado = 0;
    for (const p of programacaoFiltrada) {
      if (!p.DataProgramada) continue;
      if (/nao planejado|não planejado/i.test(p.Status || "")) naoPlanejado++;
      else planejado++;
    }
    const totalPlan = planejado + naoPlanejado;
    const pctPlanejado = totalPlan > 0 ? (planejado / totalPlan) * 100 : 0;

    // Pareto de problemas (OS por sistema, ordenado desc + acumulado)
    const sysCount = new Map<string, number>();
    for (const p of programacaoFiltrada) {
      if (!p.DataProgramada) continue;
      const k = p.Sistema || "—";
      sysCount.set(k, (sysCount.get(k) ?? 0) + 1);
    }
    const totalOS = Array.from(sysCount.values()).reduce((s, v) => s + v, 0) || 1;
    const paretoSistema = Array.from(sysCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .map((d, i, arr) => {
        const acum = arr.slice(0, i + 1).reduce((s, x) => s + x.value, 0);
        return { name: d.name, value: d.value, acum: Number(((acum / totalOS) * 100).toFixed(1)) };
      });

    // Evolução mensal da aderência
    const monthMap = new Map<string, { total: number; ok: number; ts: number }>();
    for (const p of programacaoFiltrada) {
      const d = parseBRDate(p.DataProgramada);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const e = monthMap.get(key) ?? { total: 0, ok: 0, ts: d.getTime() };
      e.total++;
      const raw = (p.StatusExecucao || p.Status || "").toLowerCase();
      if (/finaliz|conclu/.test(raw) && !(p.DataReprogramada || "").trim()) e.ok++;
      monthMap.set(key, e);
    }
    const aderenciaMensal = Array.from(monthMap.entries())
      .map(([key, v]) => {
        const [y, m] = key.split("-");
        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return {
          label: `${meses[Number(m) - 1]}/${y.slice(2)}`,
          value: v.total > 0 ? Number(((v.ok / v.total) * 100).toFixed(1)) : 0,
          ts: v.ts,
        };
      })
      .sort((a, b) => a.ts - b.ts);

    // Metas vs realizado
    const META_ADERENCIA = 95;
    const hhPlanejado = programacaoFiltrada.reduce((s, p) => s + (p.HH || 0), 0);
    const hhExecutado = programacaoFiltrada
      .filter((p) => /finaliz|conclu/i.test(p.StatusExecucao || p.Status || ""))
      .reduce((s, p) => s + (p.HH || 0), 0);
    const osProgramadas = programacaoFiltrada.length;
    const osRealizadas = programacaoFiltrada.filter((p) =>
      /finaliz|conclu|cancel/i.test(p.StatusExecucao || p.Status || ""),
    ).length;

    return {
      aderencia,
      aderSistema,
      semanal,
      backlogArr,
      hhDiaArr,
      duracaoMedia,
      hhPlanMedio,
      duracaoPorExec,
      planejado,
      naoPlanejado,
      pctPlanejado,
      metaPlanejamento: META_PLANEJAMENTO,
      paretoSistema,
      aderenciaMensal,
      metaAderencia: META_ADERENCIA,
      hhPlanejado,
      hhExecutado,
      osProgramadas,
      osRealizadas,
    };
  }, [data, dateFilter]);

  if (isLoading || !data || !computed)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );

  const bySistema = aggregate(programacaoFiltrada, (p) => p.Sistema || "—");
  const byTipo = aggregate(programacaoFiltrada, (p) => p.Tipo || "—");
  const byLocal = aggregate(programacaoFiltrada, (p) => p.LocalMacro || p.Localidade || "—").slice(0, 10);

  const locais = summarizeLocais(data.medicoes);
  const statusTemp = [
    { name: "Normal", value: locais.filter((l) => l.status === "normal").length },
    { name: "Alerta", value: locais.filter((l) => l.status === "alerta").length },
    { name: "Crítico", value: locais.filter((l) => l.status === "critico").length },
  ];

  return (
    <div ref={pdfRef} className="space-y-6">
      <PageHeader
        title="Indicadores Operacionais"
        subtitle="Análise consolidada do plano de manutenção"
        filterBadge={
          dateFilter.isActive ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
              {formatDateBR(dateFilter.startDate)} – {formatDateBR(dateFilter.endDate)}
            </span>
          ) : undefined
        }
        exportButton={
          <ExportButton
            filename="indicadores"
            rows={computed.aderSistema}
            columns={[
              { header: "Sistema", value: (r) => r.name },
              { header: "Aderência (%)", value: (r) => Number(r.value.toFixed(2)) },
            ]}
            pdfTargetRef={pdfRef}
            pdfTitle="Indicadores Operacionais"
            pdfSubtitle={
              dateFilter.isActive
                ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
                : undefined
            }
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AderenciaCard
          pct={computed.aderencia.pct}
          finalizadasNoPrazo={computed.aderencia.finalizadasNoPrazo}
          finalizadasForaPrazo={computed.aderencia.finalizadasForaPrazo}
          canceladas={computed.aderencia.canceladas}
          pendentes={computed.aderencia.pendentes}
          totalProgramadas={computed.aderencia.totalProgramadas}
        />
        <Panel title="ADERÊNCIA SEMANAL" className="lg:col-span-2">
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={computed.semanal}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="label" {...chartAxisProps} />
                <YAxis
                  domain={[0, 100]}
                  {...chartAxisProps}
                  unit="%"
                />
                <ReTooltip
                  {...chartTooltipProps}
                  formatter={(v: number) => [`${formatBRNumber(v, 1)}%`, "Aderência"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={SERIES_COLORS.planejado}
                  strokeWidth={2}
                  dot={{ fill: SERIES_COLORS.planejado, r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <SectionHeader
        label="Planejamento & Metas"
        insight={`${formatBRNumber(computed.pctPlanejado, 0)}% planejadas · meta ${computed.metaPlanejamento}%`}
        children={null}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="OS PLANEJADAS vs NÃO PLANEJADAS">
          <PieView
            data={[
              { name: "Planejado", value: computed.planejado },
              { name: "Não Planejado", value: computed.naoPlanejado },
            ]}
            colors={[SERIES_COLORS.planejado, SERIES_COLORS.naoPlanejado]}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Meta indústria: ≥ {computed.metaPlanejamento}% planejadas ·{" "}
            <span className={computed.pctPlanejado >= computed.metaPlanejamento ? "text-success" : "text-destructive"}>
              {computed.pctPlanejado >= computed.metaPlanejamento ? "✓ atingido" : "✗ abaixo"}
            </span>
          </p>
        </Panel>

        <Panel title="METAS vs REALIZADO" className="lg:col-span-2">
          <div className="grid gap-x-6 gap-y-4 py-2 sm:grid-cols-2">
            <MetaItem
              label="Aderência à programação"
              real={computed.aderencia.pct}
              meta={computed.metaAderencia}
              unit="%"
              suffix="meta"
            />
            <MetaItem
              label="OS planejadas"
              real={computed.pctPlanejado}
              meta={computed.metaPlanejamento}
              unit="%"
              suffix="meta"
            />
            <MetaItem
              label="HH planejado"
              real={computed.hhPlanejado}
              meta={null}
              unit="h"
              note={`${formatBRNumber(computed.hhExecutado, 1)}h executado`}
              suffix="abs"
            />
            <MetaItem
              label="OS programadas"
              real={computed.osProgramadas}
              meta={null}
              unit=""
              note={`${computed.osRealizadas} realizadas`}
              suffix="abs"
            />
          </div>
        </Panel>
      </div>

      <SectionHeader
        label="Tendência & Foco"
        insight="Evolução mensal da aderência e concentração de esforço por sistema"
        children={null}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="EVOLUÇÃO MENSAL DA ADERÊNCIA">
          {computed.aderenciaMensal.length < 2 ? (
            <div className="flex h-72 items-center justify-center text-xs text-muted-foreground">
              Histórico insuficiente (precisa de ≥ 2 meses)
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={computed.aderenciaMensal}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="label" {...chartAxisProps} />
                  <YAxis domain={[0, 100]} {...chartAxisProps} unit="%" />
                  <ReTooltip
                    {...chartTooltipProps}
                    formatter={(v: number) => [`${formatBRNumber(v, 1)}%`, "Aderência"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={SERIES_COLORS.executado}
                    strokeWidth={2}
                    dot={{ fill: SERIES_COLORS.executado, r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="PARETO · OS POR SISTEMA (Top problemas)">
          {computed.paretoSistema.length === 0 ? (
            <EmptyState className="h-72" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart
                  data={computed.paretoSistema}
                  layout="vertical"
                  margin={{ left: 20, right: 48, top: 8, bottom: 4 }}
                >
                  <CartesianGrid {...chartGridProps} horizontal={false} />
                  <XAxis type="number" {...chartAxisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...chartAxisProps} width={120} />
                  <ReTooltip
                    {...chartTooltipProps}
                    formatter={(v: number, n: string) =>
                      n === "acum" ? [`${formatBRNumber(v, 1)}%`, "Acumulado"] : [formatInt(Number(v)), "OS"]
                    }
                  />
                  <Bar dataKey="value" fill={SERIES_COLORS.planejado} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      fill="#F1F5F9"
                      fontSize={10}
                      offset={6}
                      formatter={(v: number) => formatInt(Number(v))}
                    />
                  </Bar>
                  <Line
                    dataKey="acum"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="ADERÊNCIA POR SISTEMA">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={computed.aderSistema}
                layout="vertical"
                margin={{ left: 20, right: 48, top: 8, bottom: 4 }}
              >
                <CartesianGrid {...chartGridProps} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  {...chartAxisProps}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...chartAxisProps}
                  width={140}
                />
                <ReTooltip
                  {...chartTooltipProps}
                  formatter={(v: number) => [`${formatBRNumber(v, 1)}%`, "Aderência"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {computed.aderSistema.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.value >= 95 ? "#10B981" : d.value >= 85 ? "#F59E0B" : "#EF4444"}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    fill="#F1F5F9"
                    fontSize={10}
                    offset={6}
                    formatter={(v: number) => `${formatBRNumber(Number(v), 0)}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="BACKLOG · OS ATRASADAS POR CRITICIDADE">
          {computed.backlogArr.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-xs text-success">
              ✓ Nenhuma OS atrasada
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={computed.backlogArr} margin={{ top: 18, right: 24, left: 20, bottom: 4 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="name" {...chartAxisProps} fontSize={11} />
                  <YAxis yAxisId="left" {...chartAxisProps} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" {...chartAxisProps} stroke={SERIES_COLORS.hh} />
                  <ReTooltip {...chartTooltipProps} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="OS" fill={SERIES_COLORS.naoPlanejado} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="OS" position="top" fill="#F1F5F9" fontSize={10} formatter={(v: number) => formatInt(Number(v))} />
                  </Bar>
                  <Bar yAxisId="right" dataKey="HH" fill={SERIES_COLORS.hh} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="HH" position="top" fill="#F1F5F9" fontSize={10} formatter={(v: number) => formatBRNumber(Number(v), 1)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OS POR TIPO DE MANUTENÇÃO">
          <BarH data={byTipo} fill={SERIES_COLORS.executado} />
        </Panel>
        <Panel title="OS POR LOCAL / MACRO">
          <BarH data={byLocal} fill={SERIES_COLORS.planejado} />
        </Panel>
        <Panel title="OS POR SISTEMA">
          <PieView data={bySistema} donut />
        </Panel>
        <Panel title="STATUS DAS TEMPERATURAS">
          <PieView data={statusTemp} colors={["#10B981", "#F59E0B", "#EF4444"]} />
        </Panel>
      </div>

      <Panel title="HH PROGRAMADO POR DIA">
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={computed.hhDiaArr}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="label" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <ReTooltip {...chartTooltipProps} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={SERIES_COLORS.executado}
                strokeWidth={2}
                dot={{ fill: SERIES_COLORS.executado, r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {computed.duracaoMedia !== null && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="DURAÇÃO REAL DA ATIVIDADE" subtitle="Início → Fim (execução)">
            <div className="flex flex-wrap gap-6 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Duração média real
                </p>
                <p className="num text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {formatBRNumber(computed.duracaoMedia, 1)}
                  <span className="ml-0.5 text-sm text-muted-foreground">h</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-warning">
                  HH planejado (média)
                </p>
                <p className="num text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {formatBRNumber(computed.hhPlanMedio ?? 0, 1)}
                  <span className="ml-0.5 text-sm text-muted-foreground">h</span>
                </p>
              </div>
              {computed.hhPlanMedio && computed.hhPlanMedio > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-success">
                    Variação
                  </p>
                  <p className="num text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                    {formatBRNumber(
                      ((computed.duracaoMedia - computed.hhPlanMedio) / computed.hhPlanMedio) * 100,
                      0,
                    )}
                    <span className="ml-0.5 text-sm text-muted-foreground">%</span>
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="DURAÇÃO REAL vs HH PLANEJADO" subtitle="Média por executante (horas)">
            {computed.duracaoPorExec.length === 0 ? (
              <EmptyState className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart
                    data={computed.duracaoPorExec}
                    layout="vertical"
                    margin={{ left: 20, right: 40, top: 8, bottom: 4 }}
                  >
                  <CartesianGrid {...chartGridProps} horizontal={false} />
                  <XAxis type="number" {...chartAxisProps} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    {...chartAxisProps}
                    width={120}
                  />
                  <ReTooltip {...chartTooltipProps} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => (value === "duracao" ? "Duração real" : "HH Planejado")}
                  />
                  <Bar dataKey="duracao" name="duracao" fill={SERIES_COLORS.executado} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  <Bar dataKey="hhPlan" name="hhPlan" fill={SERIES_COLORS.hh} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function MetaItem({
  label,
  real,
  meta,
  unit,
  note,
  suffix,
}: {
  label: string;
  real: number;
  meta: number | null;
  unit: string;
  note?: string;
  suffix: "meta" | "abs";
}) {
  const atingido = meta !== null && real >= meta;
  const cls =
    meta === null
      ? "text-foreground"
      : atingido
        ? "text-success"
        : "text-destructive";
  return (
    <div className="border-l-2 border-border/40 pl-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`num text-xl font-bold leading-tight ${cls}`}>
        {formatBRNumber(real, unit === "%" ? 0 : 1)}
        {unit && <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span>}
        {suffix === "meta" && meta !== null && (
          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
            / meta {formatBRNumber(meta, 0)}{unit}
          </span>
        )}
      </p>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function BarH({ data, fill }: { data: { name: string; value: number }[]; fill: string }) {
  if (data.length === 0) return <EmptyState className="h-72" />;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40, top: 8, bottom: 4 }}>
          <CartesianGrid {...chartGridProps} horizontal={false} />
          <XAxis type="number" {...chartAxisProps} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            {...chartAxisProps}
            width={140}
          />
          <ReTooltip {...chartTooltipProps} />
          <Bar dataKey="value" fill={fill} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position="right"
              fill="#F1F5F9"
              fontSize={10}
              offset={6}
              formatter={(v: number) => formatInt(Number(v))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieView({
  data,
  colors = COLORS,
  donut = false,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
  donut?: boolean;
}) {
  if (data.length === 0) return <EmptyState className="h-72" />;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={donut ? "58%" : 0}
            outerRadius="82%"
            paddingAngle={2}
            isAnimationActive={false}
            label={({ x, y, value, percent }) => {
              const pct = Math.round((percent ?? Number(value) / total) * 100);
              if (pct < 5) return null;
              return (
                <text
                  x={x}
                  y={y}
                  fill="#F1F5F9"
                  fontSize={10}
                  fontFamily={CHART_FONT}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {`${formatInt(Number(value))} · ${pct}%`}
                </text>
              );
            }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <ReTooltip {...chartTooltipProps} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
