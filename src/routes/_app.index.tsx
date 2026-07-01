import { useRef, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Zap,
  Thermometer,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { AderenciaCard, computeAderencia } from "@/components/aderencia-card";
import { ExportButton } from "@/components/export-button";
import { summarizeLocais } from "@/lib/temperature";
import { formatBRNumber, formatInt, parseBRDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFilteredProgramacao } from "@/lib/filters";
import { normalizeTipo } from "@/lib/normalize";
import { deriveExecStatus } from "@/lib/status";
import { format, eachDayOfInterval } from "date-fns";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
});

const COLORS = ["#0EA5FF", "#22C55E", "#EAB308", "#EF4444", "#1D4ED8", "#a78bfa", "#94A3B8"];

function VisaoGeral() {
  const { data, isLoading, error } = useQuery(sheetsQueryOptions);
  const programacao = useFilteredProgramacao(data);
  const pdfRef = useRef<HTMLDivElement>(null);

  const kpis = useMemo(() => {
    const total = programacao.length;
    let executadas = 0;
    let pendentes = 0;
    let quebra = 0;
    let anormais = 0;
    let naoPlanejadas = 0;

    for (const os of programacao) {
      const st = deriveExecStatus(os);
      const tipo = normalizeTipo(os.Tipo);
      if (st === "Finalizada") executadas++;
      else if (
        st === "Programada" ||
        st === "Em execução" ||
        st === "Pausada" ||
        st === "Reprogramada" ||
        st === "Atrasada"
      )
        pendentes++;
      if (tipo === "Quebra de Programação") quebra++;
      if (tipo === "Não Planejada") naoPlanejadas++;
      if (st === "Atrasada" || (os.DataReprogramada && os.DataReprogramada.trim())) anormais++;
    }

    const pct = (n: number) => (total > 0 ? ` · ${((n / total) * 100).toFixed(1)}%` : "");

    return {
      total,
      executadas,
      pendentes,
      quebra,
      anormais,
      naoPlanejadas,
      pct,
    };
  }, [programacao]);

  const barChartData = useMemo(() => buildBarSeries(programacao), [programacao]);
  const bySistema = useMemo(() => aggregate(programacao, (p) => p.Sistema || "—"), [programacao]);
  const byCriticidade = useMemo(
    () => aggregate(programacao, (p) => p.Criticidade || "—"),
    [programacao],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
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

  const { tecnicos, medicoes } = data;
  const locais = summarizeLocais(medicoes);
  const tempAlerta = locais.filter((l) => l.status !== "normal").length;
  const aderencia = computeAderencia(programacao);

  return (
    <div ref={pdfRef} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-xs text-muted-foreground">
            Painel executivo · {formatInt(programacao.length)} OS no período selecionado
          </p>
        </div>
        <ExportButton
          filename="visao-geral"
          rows={programacao}
          columns={[
            { header: "Nº OS", value: (r) => r.NumeroOS },
            { header: "Data", value: (r) => r.DataProgramada },
            { header: "Sistema", value: (r) => r.Sistema },
            { header: "Descrição", value: (r) => r.Descricao },
            { header: "Criticidade", value: (r) => r.Criticidade },
            { header: "Tipo", value: (r) => normalizeTipo(r.Tipo) },
            { header: "Cargo", value: (r) => r.Cargo },
            { header: "HH", value: (r) => r.HH },
            { header: "Executante", value: (r) => r.Executante },
            { header: "Status", value: (r) => deriveExecStatus(r) },
          ]}
          pdfTargetRef={pdfRef}
          pdfTitle="Visão Geral · Centro de Controle"
        />
      </div>

      {/* 6 KPIs canônicos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Programadas"
          value={formatInt(kpis.total)}
          icon={ClipboardList}
          variant="primary"
          hint="no período"
        />
        <KpiCard
          label="Executadas"
          value={formatInt(kpis.executadas)}
          icon={CheckCircle2}
          variant="success"
          hint={`finalizadas${kpis.pct(kpis.executadas)}`}
        />
        <KpiCard
          label="Pendentes"
          value={formatInt(kpis.pendentes)}
          icon={Clock}
          variant="warning"
          hint={`em aberto${kpis.pct(kpis.pendentes)}`}
        />
        <KpiCard
          label="Quebra de Programação"
          value={formatInt(kpis.quebra)}
          icon={AlertTriangle}
          variant="warning"
          hint={`Tipo = QP${kpis.pct(kpis.quebra)}`}
        />
        <KpiCard
          label="Anormais"
          value={formatInt(kpis.anormais)}
          icon={AlertOctagon}
          variant="danger"
          hint={`atrasadas + reprog${kpis.pct(kpis.anormais)}`}
        />
        <KpiCard
          label="Não Planejadas"
          value={formatInt(kpis.naoPlanejadas)}
          icon={Zap}
          variant="neutral"
          hint={`Tipo = NP${kpis.pct(kpis.naoPlanejadas)}`}
        />
      </div>

      {/* Aderência + equipe/temperatura */}
      <div className="grid gap-3 lg:grid-cols-3">
        <AderenciaCard
          pct={aderencia.pct}
          finalizadasNoPrazo={aderencia.finalizadasNoPrazo}
          totalProgramadas={aderencia.totalProgramadas}
          className="lg:col-span-1"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          <KpiCard
            label="Técnicos Ativos"
            value={formatInt(tecnicos.length)}
            icon={Users}
            variant="neutral"
          />
          <KpiCard
            label="Temperaturas em Alerta"
            value={formatInt(tempAlerta)}
            hint={`${locais.length} locais monitorados`}
            icon={Thermometer}
            variant={tempAlerta > 0 ? "danger" : "success"}
          />
        </div>
      </div>

      {/* Gráfico de barras — Fin / Canc / Não Planejadas */}
      <Panel
        title="EXECUÇÃO POR DIA"
        subtitle="Finalizadas · Canceladas · Não Planejadas (respeita todos os filtros)"
      >
        {barChartData.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <ReTooltip
                  contentStyle={{
                    background: "#05254A",
                    border: "1px solid #0EA5FF55",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="finalizadas" name="Finalizadas" fill="#22C55E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="canceladas" name="Canceladas" fill="#EF4444" radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="naoPlanejadas"
                  name="Não Planejadas"
                  fill="#EAB308"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OS POR SISTEMA">
          <ChartPie data={bySistema} />
        </Panel>
        <Panel title="OS POR CRITICIDADE">
          <ChartPie data={byCriticidade} />
        </Panel>
      </div>

      <Panel
        title="ATALHOS"
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
            { url: "/checklists", label: "Checklists Operacionais" },
          ].map((s) => (
            <Link
              key={s.url}
              to={s.url}
              className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs text-foreground transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ─────────── helpers ─────────── */

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

function buildBarSeries(rows: { DataProgramada: string; DataReprogramada: string; Tipo?: string; StatusExecucao: string; Status: string }[]) {
  // Determine date range covered by rows
  const dates: Date[] = [];
  for (const r of rows) {
    const d = parseBRDate(r.DataReprogramada) || parseBRDate(r.DataProgramada);
    if (d) dates.push(d);
  }
  if (dates.length === 0) return [];
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  min.setHours(0, 0, 0, 0);
  max.setHours(0, 0, 0, 0);

  // Cap at 60 days to keep chart readable
  const spanDays = Math.floor((max.getTime() - min.getTime()) / 86400000);
  const start = spanDays > 60 ? new Date(max.getTime() - 59 * 86400000) : min;

  const days = eachDayOfInterval({ start, end: max });
  const map = new Map<
    string,
    { periodo: string; finalizadas: number; canceladas: number; naoPlanejadas: number }
  >();
  for (const d of days) {
    const key = format(d, "dd/MM");
    map.set(key, { periodo: key, finalizadas: 0, canceladas: 0, naoPlanejadas: 0 });
  }

  for (const r of rows) {
    const d = parseBRDate(r.DataReprogramada) || parseBRDate(r.DataProgramada);
    if (!d) continue;
    if (d < start) continue;
    const key = format(d, "dd/MM");
    const bucket = map.get(key);
    if (!bucket) continue;
    const st = deriveExecStatus(r as never);
    const tipo = normalizeTipo(r.Tipo);
    if (st === "Finalizada") bucket.finalizadas++;
    else if (st === "Cancelada") bucket.canceladas++;
    if (tipo === "Não Planejada") bucket.naoPlanejadas++;
  }

  return Array.from(map.values());
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
            label={(e) => `${e.value}`}
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

function Empty() {
  return (
    <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
      Sem registros no período selecionado
    </div>
  );
}

// suppress unused import warning
void formatBRNumber;
