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
import { parseBRDate } from "@/lib/format";
import { summarizeLocais } from "@/lib/temperature";

export const Route = createFileRoute("/_app/indicadores")({
  component: IndicadoresPage,
});

const COLORS = ["#0EA5FF", "#22C55E", "#EAB308", "#EF4444", "#1D4ED8", "#a78bfa", "#94A3B8"];

function IndicadoresPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  if (isLoading)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    );

  if (!data) return null;

  const bySistema = countBy(data.programacao.map((p) => p.Sistema || "—"));
  const byTipo = countBy(data.programacao.map((p) => p.Tipo || "—"));
  const byLocal = countBy(data.programacao.map((p) => p.LocalMacro || p.Localidade || "—"));

  // HH por dia
  const hhDia = new Map<string, number>();
  for (const p of data.programacao) {
    const d = parseBRDate(p.DataProgramada);
    if (!d) continue;
    const k = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    hhDia.set(k, (hhDia.get(k) ?? 0) + (p.HH || 0));
  }
  const hhDiaArr = Array.from(hhDia.entries())
    .sort((a, b) => {
      const [da, ma] = a[0].split("/").map(Number);
      const [db, mb] = b[0].split("/").map(Number);
      return ma - mb || da - db;
    })
    .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));

  const locais = summarizeLocais(data.medicoes);
  const statusTemp = [
    { name: "Normal", value: locais.filter((l) => l.status === "normal").length },
    { name: "Alerta", value: locais.filter((l) => l.status === "alerta").length },
    { name: "Crítico", value: locais.filter((l) => l.status === "critico").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Indicadores Operacionais</h1>
        <p className="text-xs text-muted-foreground">Análise consolidada do plano de manutenção</p>
      </div>

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
            <LineChart data={hhDiaArr}>
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
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0EA5FF"
                strokeWidth={2}
                dot={{ fill: "#0EA5FF", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
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
  if (data.length === 0)
    return <p className="text-xs text-muted-foreground">Sem registros</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            stroke="#94A3B8"
            width={140}
          />
          <ReTooltip
            contentStyle={{
              background: "#05254A",
              border: "1px solid #0EA5FF55",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
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
  if (data.length === 0)
    return <p className="text-xs text-muted-foreground">Sem registros</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
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
