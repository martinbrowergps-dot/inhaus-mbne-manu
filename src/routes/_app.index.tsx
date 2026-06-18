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
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { summarizeLocais } from "@/lib/temperature";
import { formatBRNumber, formatInt, parseBRDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/")({
  component: VisaoGeral,
});

const COLORS = ["#0EA5FF", "#22C55E", "#EAB308", "#EF4444", "#1D4ED8", "#a78bfa", "#94A3B8"];

function VisaoGeral() {
  const { data, isLoading, error } = useQuery(sheetsQueryOptions);

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
  const total = programacao.length;
  const programadas = programacao.filter((p) => /programad/i.test(p.StatusExecucao || p.Status)).length;
  const emAndamento = programacao.filter((p) => /andamento/i.test(p.StatusExecucao)).length;
  const finalizadas = programacao.filter((p) => /finalizad|conclu/i.test(p.StatusExecucao)).length;
  const aa = programacao.filter((p) => p.Criticidade?.toUpperCase() === "AA").length;
  const totalHH = programacao.reduce((s, p) => s + (p.HH || 0), 0);

  const locais = summarizeLocais(medicoes);
  const tempAlerta = locais.filter((l) => l.status !== "normal").length;

  // OS por Sistema
  const bySistema = aggregate(programacao, (p) => p.Sistema || "—");
  // OS por Criticidade
  const byCriticidade = aggregate(programacao, (p) => p.Criticidade || "—");
  // OS por Dia (próximos 14 dias)
  const byDia = aggregateByDay(programacao);
  // Status
  const byStatus = aggregate(programacao, (p) => p.StatusExecucao || p.Status || "—");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-xs text-muted-foreground">
          Painel executivo de manutenção • dados atualizados automaticamente a cada 5 minutos
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de OS" value={formatInt(total)} icon={ClipboardList} variant="primary" />
        <KpiCard label="OS Programadas" value={formatInt(programadas)} icon={Calendar} variant="neutral" />
        <KpiCard label="Em Andamento" value={formatInt(emAndamento)} icon={Play} variant="warning" />
        <KpiCard label="Finalizadas" value={formatInt(finalizadas)} icon={CheckCircle2} variant="success" />
        <KpiCard label="Criticidade AA" value={formatInt(aa)} icon={AlertOctagon} variant="danger" />
        <KpiCard label="HH Programado" value={formatBRNumber(totalHH, 1)} hint="horas-homem" icon={Clock} variant="primary" />
        <KpiCard label="Técnicos Ativos" value={formatInt(tecnicos.length)} icon={Users} variant="neutral" />
        <KpiCard
          label="Temperaturas em Alerta"
          value={formatInt(tempAlerta)}
          hint={`${locais.length} locais monitorados`}
          icon={Thermometer}
          variant={tempAlerta > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="OS POR SISTEMA">
          <ChartPie data={bySistema} />
        </Panel>

        <Panel title="OS POR CRITICIDADE">
          <ChartDonut data={byCriticidade} />
        </Panel>

        <Panel title="STATUS DAS OS">
          <ChartPie data={byStatus} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OS POR DIA" subtitle="Próximas 2 semanas">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                <ReTooltip
                  contentStyle={{
                    background: "#05254A",
                    border: "1px solid #0EA5FF55",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="#0EA5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="HH POR CARGO">
          <ChartBarHorizontal data={aggregateHH(programacao)} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
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
          <Bar dataKey="value" fill="#22C55E" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
      Sem registros
    </div>
  );
}
