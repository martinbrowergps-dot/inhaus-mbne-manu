import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  LabelList,
} from "recharts";
import { ClipboardList, Clock, CheckCircle2, AlertOctagon, Calendar, Play, PauseCircle } from "lucide-react";
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
  CHART_FONT,
} from "@/lib/chart-utils";
import { Panel } from "@/components/panel";
import { ExportButton } from "@/components/export-button";
import { KpiStrip } from "@/components/kpi-carousel";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { formatBRNumber, formatInt, parseBRDate, formatDateBR } from "@/lib/format";
import { deriveExecStatus } from "@/lib/status";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData, ReportTable } from "@/lib/pdf-report";

export const Route = createFileRoute("/_app/relatorios")({
  component: RelatoriosPage,
});

type PeriodRow = {
  periodLabel: string;
  totalOS: number;
  totalHH: number;
  planejadas: number;
  naoPlanejadas: number;
  finalizadas: number;
  canceladas: number;
  emAndamento: number;
  atrasadas: number;
  quebras: number;
};

function RelatoriosPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);
  const dateFilter = useDateFilter();
  const [visao, setVisao] = useState<"semanal" | "mensal" | "dia">("dia");

  if (isLoading) {
    return <KpiSkeletonGrid count={8} className="md:grid-cols-4" />;
  }

  if (!data) return null;

  const { programacao } = data;
  const filtered = (programacao ?? []).filter((p) =>
    dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
  );
  const enriched = filtered.map((p) => ({ ...p, _execStatus: deriveExecStatus(p) }));

  const periods =
    visao === "semanal"
      ? aggregateByWeek(filtered)
      : visao === "mensal"
        ? aggregateByMonth(filtered)
        : aggregateByDay(filtered);

  const totalOS = periods.reduce((s, p) => s + p.totalOS, 0);
  const totalHH = periods.reduce((s, p) => s + p.totalHH, 0);
  const totalFinalizadas = periods.reduce((s, p) => s + p.finalizadas, 0);
  const totalCanceladas = periods.reduce((s, p) => s + p.canceladas, 0);

  const byStatus = aggregate(enriched, (p) => p._execStatus);

  const quebras = filtered
    .filter((p) => (p.Tipo || "").toUpperCase() === "QUEBRA DE PROGRAMAÇÃO")
    .reduce<{ name: string; value: number }[]>((acc, p) => {
      const name = p.SolicitanteQuebra || "Não informado";
      const existing = acc.find((a) => a.name === name);
      if (existing) existing.value++;
      else acc.push({ name, value: 1 });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const handleExportReport = async (layout?: import("@/lib/export-pdf").PdfLayoutOptions) => {
    const chartEls = pdfRef.current?.querySelectorAll<HTMLElement>("[data-chart]");
    const charts = chartEls ? Array.from(chartEls) : [];
    const rowsCount = periods.length;

    const table: ReportTable<PeriodRow> = {
      title: `${visao === "semanal" ? "Semanas" : visao === "mensal" ? "Meses" : "Dias"} — Dados Agregados`,
      columns: [
        { header: "Período", value: (r: PeriodRow) => r.periodLabel },
        { header: "Total OS", value: (r: PeriodRow) => r.totalOS },
        { header: "HH", value: (r: PeriodRow) => r.totalHH },
        { header: "Planejadas", value: (r: PeriodRow) => r.planejadas },
        { header: "Ñ Planejadas", value: (r: PeriodRow) => r.naoPlanejadas },
        { header: "Finalizadas", value: (r: PeriodRow) => r.finalizadas },
        { header: "Canceladas", value: (r: PeriodRow) => r.canceladas },
        { header: "Em Andamento", value: (r: PeriodRow) => r.emAndamento },
        { header: "Atrasadas", value: (r: PeriodRow) => r.atrasadas },
        { header: "Quebras", value: (r: PeriodRow) => r.quebras },
      ],
      rows: periods,
    };

    const reportData: ReportData = {
      title: `Relatório de Programação · ${visao === "semanal" ? "Semanal" : visao === "mensal" ? "Mensal" : "Diário"}`,
      subtitle: dateFilter.isActive
        ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(totalOS)} OS`
        : `${formatInt(totalOS)} OS no total`,
      metrics: [
        { label: "Total de OS", value: formatInt(totalOS), variant: "primary" },
        { label: "HH Total", value: `${formatBRNumber(totalHH, 1)}h`, variant: "primary" },
        {
          label: "Planejadas",
          value: formatInt(periods.reduce((s, p) => s + p.planejadas, 0)),
          variant: "success",
        },
        {
          label: "Não Planejadas",
          value: formatInt(periods.reduce((s, p) => s + p.naoPlanejadas, 0)),
          variant: "danger",
        },
        { label: "Finalizadas", value: formatInt(totalFinalizadas), variant: "success" },
        { label: "Canceladas", value: formatInt(totalCanceladas), variant: "neutral" },
        { label: "Períodos", value: formatInt(rowsCount), variant: "neutral" },
      ],
      tables: [table],
    };

    try {
      await renderReportPdf(reportData, charts, {
        filename: `relatorio-programacao-${visao}`,
        orientation: "landscape",
        layout,
      });
    } catch (err) {
      console.error("Erro ao exportar relatório:", err);
    }
  };

  return (
    <div ref={pdfRef} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Relatório de Programação</h1>
          <p className="text-xs text-muted-foreground">
            {visao === "semanal"
              ? "Agrupado por semana"
              : visao === "mensal"
                ? "Agrupado por mês"
                : "Agrupado por dia"}
            {dateFilter.isActive && (
              <>
                {" "}
                · {formatDateBR(dateFilter.startDate)} a {formatDateBR(dateFilter.endDate)}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={visao}
            onChange={setVisao}
            options={[
              { value: "dia", label: "Dia" },
              { value: "semanal", label: "Semana" },
              { value: "mensal", label: "Mês" },
            ]}
          />
          <ExportButton
            filename={`relatorio-programacao-${visao}`}
            rows={periods}
            columns={[
              { header: "Período", value: (r) => r.periodLabel },
              { header: "Total OS", value: (r) => r.totalOS },
              { header: "HH", value: (r) => r.totalHH },
              { header: "Planejadas", value: (r) => r.planejadas },
              { header: "Não Planejadas", value: (r) => r.naoPlanejadas },
              { header: "Finalizadas", value: (r) => r.finalizadas },
              { header: "Canceladas", value: (r) => r.canceladas },
              { header: "Em Andamento", value: (r) => r.emAndamento },
              { header: "Atrasadas", value: (r) => r.atrasadas },
              { header: "Quebras", value: (r) => r.quebras },
            ]}
            pdfTargetRef={pdfRef}
            pdfTitle={`Relatório de Programação · ${visao === "semanal" ? "Semanal" : visao === "mensal" ? "Mensal" : "Diário"}`}
            pdfSubtitle={
              dateFilter.isActive
                ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${formatInt(totalOS)} OS`
                : `${formatInt(totalOS)} OS no total`
            }
            onExecutiveSummary={handleExportReport}
          />
        </div>
      </div>

      <KpiStrip
        items={[
          {
            label: "Total de OS",
            value: formatInt(totalOS),
            icon: ClipboardList,
            variant: "primary",
          },
          {
            label: "HH Total",
            value: `${formatBRNumber(totalHH, 1)}h`,
            icon: Clock,
            variant: "primary",
          },
          {
            label: "Planejadas",
            value: formatInt(periods.reduce((s, p) => s + p.planejadas, 0)),
            icon: CheckCircle2,
            variant: "success",
          },
          {
            label: "Não Planejadas",
            value: formatInt(periods.reduce((s, p) => s + p.naoPlanejadas, 0)),
            icon: AlertOctagon,
            variant: "danger",
          },
          {
            label: "Finalizadas",
            value: formatInt(totalFinalizadas),
            icon: Play,
            variant: "success",
          },
          {
            label: "Canceladas",
            value: formatInt(totalCanceladas),
            icon: PauseCircle,
            variant: "neutral",
          },
          {
            label: "Períodos",
            value: formatInt(periods.length),
            icon: Calendar,
            variant: "neutral",
          },
        ]}
      />

      <SectionHeader label="Dados Agregados" insight={`${formatInt(periods.length)} períodos`}>
        <Panel title={`${visao === "semanal" ? "SEMANAS" : visao === "mensal" ? "MESES" : "DIAS"}`}>
          <div className="overflow-auto max-h-[calc(100vh-18rem)]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-[#082F49]">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-semibold">Período</th>
                  <th className="text-right px-2 py-2 font-semibold">OS</th>
                  <th className="text-right px-2 py-2 font-semibold">HH</th>
                  <th className="text-right px-2 py-2 font-semibold">Planejadas</th>
                  <th className="text-right px-2 py-2 font-semibold">Ñ Planejadas</th>
                  <th className="text-right px-2 py-2 font-semibold">Finalizadas</th>
                  <th className="text-right px-2 py-2 font-semibold">Canceladas</th>
                  <th className="text-right px-2 py-2 font-semibold">Em Andamento</th>
                  <th className="text-right px-2 py-2 font-semibold">Atrasadas</th>
                  <th className="text-right px-2 py-2 font-semibold">Quebras</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.periodLabel} className="border-b border-border/40 hover:bg-accent/30">
                    <td className="py-1.5 pr-3 font-medium">{p.periodLabel}</td>
                    <td className="text-right px-2 py-1.5">{p.totalOS}</td>
                    <td className="text-right px-2 py-1.5">{formatBRNumber(p.totalHH, 1)}</td>
                    <td className="text-right px-2 py-1.5 text-success">{p.planejadas}</td>
                    <td className="text-right px-2 py-1.5 text-destructive">{p.naoPlanejadas}</td>
                    <td className="text-right px-2 py-1.5 text-success">{p.finalizadas}</td>
                    <td className="text-right px-2 py-1.5 text-muted-foreground">{p.canceladas}</td>
                    <td className="text-right px-2 py-1.5 text-warning">{p.emAndamento}</td>
                    <td className="text-right px-2 py-1.5 text-destructive">{p.atrasadas}</td>
                    <td className="text-right px-2 py-1.5">{p.quebras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          dataChart="planejado"
          title={`PLANEJADO vs NÃO PLANEJADO POR ${visao === "semanal" ? "SEMANA" : visao === "mensal" ? "MÊS" : "DIA"}`}
        >
          {periods.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-72 md:h-64">
              <ResponsiveContainer>
                <BarChart
                  data={periods}
                  barCategoryGap="5%"
                  margin={{ top: 35, right: 20, left: 20, bottom: 4 }}
                >
                  <CartesianGrid {...chartGridProps} />
<XAxis dataKey="periodLabel" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} allowDecimals={false} />
                  <ReTooltip {...chartTooltipProps} />
                  <Legend
                    wrapperStyle={CHART_LEGEND_STYLE}
                    formatter={(value) => (value === "planejado" ? "Planejado" : "Não Planejado")}
                  />
                  <Bar dataKey="planejadas" name="planejado" stackId="a" fill={SERIES_COLORS.planejado} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList
                      content={({ x, y, width, height, index }) => {
                        const d = index !== undefined ? periods[index] : undefined;
                        if (!d) return null;
                        const numH = Number(height);
                        if (!numH || numH < 14) {
                          return (
                            <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fill="#F1F5F9" fontSize={10}>
                              {d.planejadas}/{d.naoPlanejadas}
                            </text>
                          );
                        }
                        return (
                          <text x={Number(x) + Number(width) / 2} y={Number(y) + Number(height) / 2} textAnchor="middle" dominantBaseline="central" fill="#F1F5F9" fontSize={10}>
                            {d.planejadas}/{d.naoPlanejadas}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                  <Bar dataKey="naoPlanejadas" name="naoPlanejado" stackId="a" fill={SERIES_COLORS.naoPlanejado} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          dataChart="hh"
          title={`HH POR ${visao === "semanal" ? "SEMANA" : visao === "mensal" ? "MÊS" : "DIA"}`}
        >
          {periods.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-72 md:h-64">
              <ResponsiveContainer>
                <BarChart
                  data={periods}
                  barCategoryGap="5%"
                  margin={{ top: 30, right: 20, left: 20, bottom: 4 }}
                >
                  <CartesianGrid {...chartGridProps} />
<XAxis dataKey="periodLabel" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} allowDecimals={false} />
                  <ReTooltip {...chartTooltipProps} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Bar dataKey="totalHH" name="HH" fill={SERIES_COLORS.hh} radius={[4, 4, 0, 0]} isAnimationActive={false}>
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
                            {formatBRNumber(numVal, 1)}
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

        <Panel dataChart="status" title="STATUS DAS OS">
          {byStatus.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="82%"
                    paddingAngle={2}
                    isAnimationActive={false}
                    label={({ x, y, value, percent }) => {
                      const pct = Math.round((percent ?? 0) * 100);
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
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip {...chartTooltipProps} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          dataChart="quebras"
          title="QUEBRA DE PROGRAMAÇÃO POR SOLICITANTE"
          subtitle="OS do tipo quebra agrupadas por solicitante"
        >
          {quebras.length === 0 ? (
            <EmptyState />
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
    </div>
  );
}

function aggregateByWeek(rows: import("@/lib/sheets-types").ProgramacaoRow[]): PeriodRow[] {
  const map = new Map<string, { label: string; rows: typeof rows }>();
  for (const r of rows) {
    const d = parseDate(r.DataReprogramada || r.DataProgramada);
    if (!d) continue;
    const key = getWeekId(d);
    const entry = map.get(key) ?? { label: getWeekLabel(d), rows: [] };
    entry.rows.push(r);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => summarize(entry.label, entry.rows));
}

function aggregateByMonth(rows: import("@/lib/sheets-types").ProgramacaoRow[]): PeriodRow[] {
  const map = new Map<string, { label: string; rows: typeof rows }>();
  for (const r of rows) {
    const d = parseDate(r.DataReprogramada || r.DataProgramada);
    if (!d) continue;
    const key = getMonthKey(d);
    const entry = map.get(key) ?? { label: getMonthLabel(d), rows: [] };
    entry.rows.push(r);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => summarize(entry.label, entry.rows));
}

function aggregateByDay(rows: import("@/lib/sheets-types").ProgramacaoRow[]): PeriodRow[] {
  const map = new Map<string, { label: string; rows: typeof rows }>();
  for (const r of rows) {
    const d = parseDate(r.DataReprogramada || r.DataProgramada);
    if (!d) continue;
    const key = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const entry = map.get(key) ?? { label: key, rows: [] };
    entry.rows.push(r);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      return ya - yb || ma - mb || da - db;
    })
    .map(([, entry]) => summarize(entry.label, entry.rows));
}

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  return parseBRDate(dateStr);
}

function getWeekId(d: Date): string {
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - yearStart.getTime();
  const weekNum = Math.ceil((diff / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekLabel(d: Date): string {
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - yearStart.getTime();
  const weekNum = Math.ceil((diff / 86400000 + yearStart.getDay() + 1) / 7);
  return `Semana ${weekNum}`;
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(d: Date): string {
  return d
    .toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    })
    .replace(/\./g, "")
    .toUpperCase();
}

function summarize(label: string, rows: import("@/lib/sheets-types").ProgramacaoRow[]): PeriodRow {
  let planejadas = 0;
  let naoPlanejadas = 0;
  let finalizadas = 0;
  let canceladas = 0;
  let emAndamento = 0;
  let atrasadas = 0;
  let quebras = 0;
  let totalHH = 0;
  for (const r of rows) {
    totalHH += r.HH || 0;
    const status = (r.Status || "").trim();
    if (status === "Planejado") planejadas++;
    else if (status === "Não Planejado") naoPlanejadas++;
    const execStatus = deriveExecStatus(r);
    if (execStatus === "Finalizada") finalizadas++;
    else if (execStatus === "Cancelada") canceladas++;
    else if (execStatus === "Em execução") emAndamento++;
    else if (execStatus === "Atrasada") atrasadas++;
    if ((r.Tipo || "").toUpperCase() === "QUEBRA DE PROGRAMAÇÃO") quebras++;
  }
  return {
    periodLabel: label,
    totalOS: rows.length,
    totalHH: Number(totalHH.toFixed(1)),
    planejadas,
    naoPlanejadas,
    finalizadas,
    canceladas,
    emAndamento,
    atrasadas,
    quebras,
  };
}
