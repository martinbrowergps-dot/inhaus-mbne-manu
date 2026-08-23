import { AlertOctagon } from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar as ReBar,
  XAxis as ReXAxis,
  YAxis as ReYAxis,
  CartesianGrid as ReCartesianGrid,
  ResponsiveContainer as ReResponsiveContainer,
  Tooltip as ReTooltipComp,
  LabelList as ReLabelList,
} from "recharts";
import { SectionHeader } from "@/components/section-header";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { ChartDonut } from "@/components/visao-geral/chart-donut";
import {
  SERIES_COLORS,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from "@/lib/chart-utils";
import { formatInt } from "@/lib/format";

interface AttentionSectionProps {
  aa: number;
  quebras: any[];
  tempAlerta: number;
  byCriticidade: any[];
  onChartClick: (label: string) => void;
}

export function AttentionSection({
  aa,
  quebras,
  tempAlerta,
  byCriticidade,
  onChartClick,
}: AttentionSectionProps) {
  return (
    <SectionHeader
      label="Atenção"
      insight={`${formatInt(aa)} criticidade AA · ${quebras.length} quebras · ${formatInt(tempAlerta)} alertas térmicos`}
      icon={AlertOctagon}
      colorIndex={3}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel dataChart="criticidade" title="OS POR CRITICIDADE" glass>
          <ChartDonut data={byCriticidade} onCellClick={onChartClick} />
        </Panel>
        <Panel
          dataChart="quebras"
          title="QUEBRAS POR SOLICITANTE"
          subtitle="OS tipo quebra"
          className="lg:col-span-2"
        >
          {quebras.length === 0 ? (
            <EmptyState
              title="Nenhuma quebra"
              description="de programação no período"
              className="h-40"
            />
          ) : (
            <div className="h-48">
              <ReResponsiveContainer>
                <ReBarChart
                  data={quebras}
                  layout="vertical"
                  margin={{ left: 16, right: 32, top: 4, bottom: 4 }}
                >
                  <ReCartesianGrid {...chartGridProps} horizontal={false} />
                  <ReXAxis type="number" {...chartAxisProps} allowDecimals={false} />
                  <ReYAxis type="category" dataKey="name" {...chartAxisProps} width={120} />
                  <ReTooltipComp {...chartTooltipProps} />
                  <ReBar
                    dataKey="value"
                    fill={SERIES_COLORS.naoPlanejado}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  >
                    <ReLabelList position="right" fill="#F1F5F9" fontSize={10} offset={8} />
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
