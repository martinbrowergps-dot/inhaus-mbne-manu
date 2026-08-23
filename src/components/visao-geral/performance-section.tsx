import { CheckCircle2 } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Panel } from "@/components/panel";
import { AderenciaCard } from "@/components/aderencia-card";
import { ChartDonut } from "@/components/visao-geral/chart-donut";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import { formatBRNumber, formatInt } from "@/lib/format";

interface PerformanceSectionProps {
  aderencia: any;
  planejados: number;
  naoPlanejados: number;
  byStatus: any[];
  bySistema: any[];
  onChartClick: (label: string) => void;
}

export function PerformanceSection({
  aderencia,
  planejados,
  naoPlanejados,
  byStatus,
  bySistema,
  onChartClick,
}: PerformanceSectionProps) {
  return (
    <SectionHeader
      label="Desempenho"
      insight={`${formatBRNumber(aderencia.pct, 1)}% aderência · ${formatInt(planejados)} planejadas · ${formatInt(naoPlanejados)} não planejadas`}
      icon={CheckCircle2}
      colorIndex={1}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <AderenciaCard
          pct={aderencia.pct}
          finalizadasNoPrazo={aderencia.finalizadasNoPrazo}
          finalizadasForaPrazo={aderencia.finalizadasForaPrazo}
          canceladas={aderencia.canceladas}
          pendentes={aderencia.pendentes}
          totalProgramadas={aderencia.totalProgramadas}
        />
        <Panel dataChart="status-os" title="STATUS DAS OS" glass>
          <ChartDonut data={byStatus} onCellClick={onChartClick} />
        </Panel>
        <Panel dataChart="os-sistema" title="OS POR SISTEMA" glass>
          <ChartBarHorizontal data={bySistema} onCellClick={onChartClick} />
        </Panel>
      </div>
    </SectionHeader>
  );
}
