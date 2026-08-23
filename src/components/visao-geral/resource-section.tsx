import { Users } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Panel } from "@/components/panel";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import { formatBRNumber, formatInt } from "@/lib/format";
import { aggregateHH } from "@/lib/domain/aggregates";

interface ResourceSectionProps {
  tecnicosCount: number;
  sistemasCount: number;
  totalHH: number;
  programacaoFiltrada: any[];
}

export function ResourceSection({
  tecnicosCount,
  sistemasCount,
  totalHH,
  programacaoFiltrada,
}: ResourceSectionProps) {
  const hhData = aggregateHH(programacaoFiltrada);
  const avg = hhData.length > 0 ? hhData.reduce((s, d) => s + d.value, 0) / hhData.length : 0;

  return (
    <SectionHeader
      label="Recursos"
      insight={`${formatInt(tecnicosCount)} técnicos · ${formatInt(sistemasCount)} sistemas · ${formatBRNumber(totalHH, 1)}h HH`}
      icon={Users}
      colorIndex={2}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Panel dataChart="hh-cargo" title="HH POR CARGO" className="lg:col-span-2">
          <ChartBarHorizontal
            data={hhData}
            refLine={
              avg > 0 ? { value: Number(avg.toFixed(1)), label: "Média" } : undefined
            }
          />
        </Panel>
        <Panel title="TÉCNICOS" glass>
          <div className="num text-2xl font-bold text-foreground">
            {formatInt(tecnicosCount)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Ativos na plataforma</p>
        </Panel>
        <Panel title="HH TOTAL" glass>
          <div className="num text-2xl font-bold text-foreground">
            {formatBRNumber(totalHH, 1)}
            <span className="text-xs font-normal text-muted-foreground">h</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Horas-homem programadas</p>
        </Panel>
      </div>
    </SectionHeader>
  );
}
