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
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { parseBRDate, formatBRNumber } from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";
import { summarizeLocais } from "@/lib/temperature";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import { AderenciaCard, computeAderencia } from "@/components/aderencia-card";
import { ExportButton } from "@/components/export-button";
import { deriveExecStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/indicadores")({
  component: IndicadoresPage,
});

const COLORS = ["#0EA5FF", "#22C55E", "#EAB308", "#EF4444", "#1D4ED8", "#a78bfa", "#94A3B8"];

function IndicadoresPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);

  const dateFilter = useDateFilter();

  const computed = useMemo(() => {
    if (!data) return null;
    const programacaoFiltrada = data.programacao.filter((p) =>
      dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
    );
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

    // Heatmap 30 dias: checklist + passagem
    const days: { date: Date; key: string; label: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        date: d,
        key: d.toLocaleDateString("pt-BR"),
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      });
    }
    const docasSet = new Set(data.checklistDocas.map((c) => (c.Data || "").slice(0, 10)));
    const geralSet = new Set(data.checklistGeral.map((c) => (c.Data || "").slice(0, 10)));
    const portasSet = new Set(data.checklistPortas.map((c) => (c.Data || "").slice(0, 10)));
    const passagemSet = new Set(
      (data.passagemTurno ?? [])
        .filter((p) => dateFilter.filterByDateRange(p.Data))
        .map((c) => (c.Data || "").slice(0, 10)),
    );
    const heatmap = days.map((d) => ({
      ...d,
      docas: docasSet.has(d.key),
      geral: geralSet.has(d.key),
      portas: portasSet.has(d.key),
      passagem: passagemSet.has(d.key),
    }));

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
    const duracaoMedia = duracoes.length > 0
      ? duracoes.reduce((s, t) => s + t.inicioFim, 0) / duracoes.length
      : null;
    const hhPlanMedio = duracoes.length > 0
      ? duracoes.reduce((s, t) => s + t.hhPlan, 0) / duracoes.length
      : null;
    const duracaoPorExec = Array.from(byExec.entries())
      .map(([name, v]) => ({
        name,
        duracao: Number((v.inicioFim.reduce((s, x) => s + x, 0) / v.inicioFim.length).toFixed(1)),
        hhPlan: Number((v.hhPlan.reduce((s, x) => s + x, 0) / v.hhPlan.length).toFixed(1)),
      }))
      .sort((a, b) => b.duracao - a.duracao);

    return { aderencia, aderSistema, semanal, backlogArr, heatmap, hhDiaArr, duracaoMedia, hhPlanMedio, duracaoPorExec };
  }, [data, dateFilter]);

  if (isLoading || !data || !computed)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );

  const bySistema = countBy(data.programacao.map((p) => p.Sistema || "—"));
  const byTipo = countBy(data.programacao.map((p) => p.Tipo || "—"));
  const byLocal = countBy(data.programacao.map((p) => p.LocalMacro || p.Localidade || "—"));

  const locais = summarizeLocais(data.medicoes);
  const statusTemp = [
    { name: "Normal", value: locais.filter((l) => l.status === "normal").length },
    { name: "Alerta", value: locais.filter((l) => l.status === "alerta").length },
    { name: "Crítico", value: locais.filter((l) => l.status === "critico").length },
  ];

  return (
    <div ref={pdfRef} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Indicadores Operacionais</h1>
          <p className="text-xs text-muted-foreground">
            Análise consolidada do plano de manutenção
          </p>
        </div>
        <ExportButton
          filename="indicadores"
          rows={computed.aderSistema}
          columns={[
            { header: "Sistema", value: (r) => r.name },
            { header: "Aderência (%)", value: (r) => Number(r.value.toFixed(2)) },
          ]}
          pdfTargetRef={pdfRef}
          pdfTitle="Indicadores Operacionais"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  stroke="#94A3B8"
                  unit="%"
                />
                <ReTooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v: number) => [`${formatBRNumber(v, 1)}%`, "Aderência"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0EA5FF"
                  strokeWidth={2}
                  dot={{ fill: "#0EA5FF", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="ADERÊNCIA POR SISTEMA">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={computed.aderSistema} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  stroke="#94A3B8"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  stroke="#94A3B8"
                  width={140}
                />
                <ReTooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v: number) => [`${formatBRNumber(v, 1)}%`, "Aderência"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {computed.aderSistema.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.value >= 95 ? "#22C55E" : d.value >= 85 ? "#EAB308" : "#EF4444"}
                    />
                  ))}
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
                <BarChart data={computed.backlogArr}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                  <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="OS" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="HH" fill="#EAB308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="CHECKLISTS & PASSAGEM DE TURNO · ÚLTIMOS 30 DIAS">
        <Heatmap rows={computed.heatmap} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OS POR TIPO DE MANUTENÇÃO">
          <BarH data={byTipo} fill="#0EA5FF" />
        </Panel>
        <Panel title="OS POR LOCAL / MACRO">
          <BarH data={byLocal} fill="#22C55E" />
        </Panel>
        <Panel title="OS POR SISTEMA">
          <PieView data={bySistema} />
        </Panel>
        <Panel title="STATUS DAS TEMPERATURAS">
          <PieView data={statusTemp} colors={["#22C55E", "#EAB308", "#EF4444"]} />
        </Panel>
      </div>

      <Panel title="HH PROGRAMADO POR DIA">
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={computed.hhDiaArr}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
              <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0EA5FF"
                strokeWidth={2}
                dot={{ fill: "#0EA5FF", r: 3 }}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Duração média real</p>
                <p className="num text-3xl font-bold text-foreground">
                  {formatBRNumber(computed.duracaoMedia, 1)}
                  <span className="ml-0.5 text-sm text-muted-foreground">h</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-warning">HH planejado (média)</p>
                <p className="num text-3xl font-bold text-foreground">
                  {formatBRNumber(computed.hhPlanMedio ?? 0, 1)}
                  <span className="ml-0.5 text-sm text-muted-foreground">h</span>
                </p>
              </div>
              {computed.hhPlanMedio && computed.hhPlanMedio > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-success">Variação</p>
                  <p className="num text-3xl font-bold text-foreground">
                    {formatBRNumber(((computed.duracaoMedia - computed.hhPlanMedio) / computed.hhPlanMedio) * 100, 0)}
                    <span className="ml-0.5 text-sm text-muted-foreground">%</span>
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="DURAÇÃO REAL vs HH PLANEJADO" subtitle="Média por executante (horas)">
            {computed.duracaoPorExec.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={computed.duracaoPorExec} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      stroke="#94A3B8"
                      width={120}
                    />
                    <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => value === "duracao" ? "Duração real" : "HH Planejado"}
                    />
                    <Bar dataKey="duracao" name="duracao" fill="#0EA5FF" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="hhPlan" name="hhPlan" fill="#EAB308" radius={[0, 4, 4, 0]} />
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

function Heatmap({
  rows,
}: {
  rows: { label: string; docas: boolean; geral: boolean; portas: boolean; passagem: boolean }[];
}) {
  const tracks = [
    { key: "docas" as const, label: "Docas" },
    { key: "geral" as const, label: "Geral" },
    { key: "portas" as const, label: "Portas" },
    { key: "passagem" as const, label: "Passagem" },
  ];
  return (
    <div className="space-y-2">
      {tracks.map((t) => (
        <div key={t.key} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-[10px] tracking-wider text-muted-foreground uppercase">
            {t.label}
          </span>
          <div
            className="grid flex-1 grid-cols-30 gap-0.5"
            style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
          >
            {rows.map((r) => (
              <div
                key={r.label}
                title={`${t.label} · ${r.label} · ${r[t.key] ? "OK" : "Faltou"}`}
                className={cn(
                  "aspect-square rounded-sm",
                  r[t.key]
                    ? "bg-success/70 hover:bg-success"
                    : "bg-destructive/30 hover:bg-destructive/60",
                )}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-3 pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-success/70" /> Cumprido
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-destructive/30" /> Faltou
        </span>
      </div>
    </div>
  );
}

function countBy(arr: string[]) {
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function BarH({ data, fill }: { data: { name: string; value: number }[]; fill: string }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground">Sem registros</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            stroke="#94A3B8"
            width={140}
          />
          <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={fill} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieView({
  data,
  colors = COLORS,
}: {
  data: { name: string; value: number }[];
  colors?: string[];
}) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground">Sem registros</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <ReTooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
