import { Play as PlayIcon } from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar as ReBar,
  Cell as ReCell,
  XAxis as ReXAxis,
  YAxis as ReYAxis,
  CartesianGrid as ReCartesianGrid,
  ResponsiveContainer as ReResponsiveContainer,
  Tooltip as ReTooltipComp,
  Legend as ReLegend,
  LabelList as ReLabelList,
} from "recharts";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { EmptyState } from "@/components/empty-state";
import { ChartPie } from "@/components/visao-geral/chart-pie";
import {
  CHART_LEGEND_STYLE,
  COLORS,
  SERIES_COLORS,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from "@/lib/chart-utils";
import { formatInt } from "@/lib/format";
import { Play as PlayIcon } from "lucide-react";

interface ActivitySectionProps {
  total: number;
  emAndamento: number;
  finalizadas: number;
  byDia: any[];
  byPlanejamento: any[];
  byPlanejamentoDia: any[];
  onChartClick: (label: string) => void;
}

export function ActivitySection({
  total,
  emAndamento,
  finalizadas,
  byDia,
  byPlanejamento,
  byPlanejamentoDia,
  onChartClick,
}: ActivitySectionProps) {
  return (
    <SectionHeader
      label="Atividade"
      insight={`${formatInt(total)} OS no período · ${formatInt(emAndamento)} em execução · ${formatInt(finalizadas)} finalizadas`}
      icon={PlayIcon}
      colorIndex={0}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Panel
          dataChart="os-por-dia"
          title="OS POR DIA"
          subtitle="Próximas 2 semanas"
          className="lg:col-span-2"
        >
          {byDia.length === 0 ? (
            <EmptyState className="h-64" />
          ) : (
            <div className="h-72 md:h-64">
              <ReResponsiveContainer>
                <ReBarChart
                  data={byDia}
                  barCategoryGap="5%"
                  margin={{ top: 30, right: 20, left: 20, bottom: 4 }}
                >
                  <ReCartesianGrid {...chartGridProps} />
                  <ReXAxis dataKey="label" {...chartAxisProps} />
                  <ReYAxis {...chartAxisProps} allowDecimals={false} />
                  <ReTooltipComp {...chartTooltipProps} />
                  <ReLegend wrapperStyle={CHART_LEGEND_STYLE} />
                  <ReBar
                    dataKey="value"
                    name="OS"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  >
                    {byDia.map((_, i) => (
                      <ReCell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <ReLabelList
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
                  </ReBar>
                </ReBarChart>
              </ReResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel dataChart="planejamento-pie" title="PLANEJADO vs NÃO" glass>
          <ChartPie data={byPlanejamento} onCellClick={onChartClick} />
        </Panel>
      </div>
      <div className="mt-6">
        <Panel
          dataChart="planejamento-dia"
          title="PLANEJADO vs NÃO PLANEJADO POR DIA"
          subtitle="Últimos 14 dias"
        >
          {byPlanejamentoDia.length === 0 ? (
            <EmptyState className="h-64" />
          ) : (
            <div className="h-72 md:h-64">
              <ReResponsiveContainer>
                <ReBarChart
                  data={byPlanejamentoDia}
                  barCategoryGap="5%"
                  margin={{ top: 30, right: 20, left: 20, bottom: 4 }}
                >
                  <ReCartesianGrid {...chartGridProps} />
                  <ReXAxis dataKey="label" {...chartAxisProps} />
                  <ReYAxis {...chartAxisProps} allowDecimals={false} />
                  <ReTooltipComp {...chartTooltipProps} />
                  <ReLegend
                    wrapperStyle={CHART_LEGEND_STYLE}
                    formatter={(value) =>
                      value === "planejado" ? "Planejado" : "Não Planejado"
                    }
                  />
                  <ReBar
                    dataKey="planejado"
                    name="planejado"
                    stackId="a"
                    fill={SERIES_COLORS.planejado}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                  <ReBar
                    dataKey="naoPlanejado"
                    name="naoPlanejado"
                    stackId="a"
                    fill={SERIES_COLORS.naoPlanejado}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1200}
                  >
                    <ReLabelList
                      content={({ x, y, width, index }) => {
                        const d = index !== undefined ? byPlanejamentoDia[index] : undefined;
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
                  </ReBar>
                </ReBarChart>
              </ReResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </SectionHeader>
  );
}
