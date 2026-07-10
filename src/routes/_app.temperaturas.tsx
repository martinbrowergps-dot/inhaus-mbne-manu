import { useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { TempCard } from "@/components/temp-card";
import { TempTrendChart } from "@/components/temp-trend-chart";
import { TempMultiChart } from "@/components/temp-multi-chart";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/components/export-button";
import { filterByRange, summarizeLocais, uniqueLocais, computeDurationAlerts, type TempRange } from "@/lib/temperature";
import { useDateFilter } from "@/hooks/use-date-filter";
import { formatDateBR } from "@/lib/format";
import { SectionHeader } from "@/components/section-header";

const searchSchema = z.object({
  range: fallback(z.enum(["24h", "7d", "30d"]), "24h").default("24h"),
});

export const Route = createFileRoute("/_app/temperaturas")({
  validateSearch: zodValidator(searchSchema),
  component: TemperaturasPage,
});

function TemperaturasPage() {
  const { range } = Route.useSearch();
  const pdfRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate({ from: "/temperaturas" });
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const setRange = (r: TempRange) =>
    navigate({ search: (prev: { range: TempRange }) => ({ ...prev, range: r }) });

  const dateFilter = useDateFilter();

  if (isLoading)
    return <KpiSkeletonGrid count={6} className="md:grid-cols-3" heightClass="h-40" />;

  const medicoes = data?.medicoes ?? [];
  const medicoesFiltradas = medicoes.filter((m) => dateFilter.filterByDateRange(m.DATA));
  const locais = summarizeLocais(medicoesFiltradas);
  const durationAlerts = computeDurationAlerts(medicoesFiltradas);
  const criticos = locais.filter((l) => l.status === "critico");
  const alertas = locais.filter((l) => l.status === "alerta");
  const normais = locais.filter((l) => l.status === "normal");
  const allLocais = uniqueLocais(medicoesFiltradas);

  return (
    <div ref={pdfRef} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Monitoramento de Temperatura</h1>
          <p className="text-xs text-muted-foreground">
            Antecâmara 1°/7°C • Congelados -23°/-20°C • Resfriados 1°/4°C
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as TempRange)}>
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          <ExportButton
            filename={`temperaturas_${range}`}
            rows={filterByRange(medicoesFiltradas, range)}
            columns={[
              { header: "Local", value: (r) => r.LOCAL },
              { header: "Data", value: (r) => r.DATA },
              { header: "Hora", value: (r) => r.HORA },
              { header: "Temperatura 01", value: (r) => r.TEMPERATURA_01 ?? "" },
              { header: "Temperatura 02", value: (r) => r.TEMPERATURA_02 ?? "" },
              { header: "Temperatura 03", value: (r) => r.TEMPERATURA_03 ?? "" },
              { header: "Temperatura 04", value: (r) => r.TEMPERATURA_04 ?? "" },
              { header: "Técnico", value: (r) => r.TECNICO },
            ]}
            pdfTitle="Temperaturas · Centro de Controle"
            pdfSubtitle={
              dateFilter.isActive
                ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
                : undefined
            }
            pdfTargetRef={pdfRef as React.RefObject<HTMLElement | null>}
          />
        </div>
      </div>

      <SectionHeader
        label="Status dos Locais"
        insight={`${locais.length} locais monitorados · ${criticos.length} críticos · ${alertas.length} em alerta · ${normais.length} normais`}
      >
        {criticos.length > 0 && (
          <Panel title="CRÍTICOS" glow>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {criticos.map((l) => (
                <TempCard key={l.local} summary={l} durationInfo={durationAlerts.get(l.local)} />
              ))}
            </div>
          </Panel>
        )}

        {alertas.length > 0 && (
          <Panel title="EM ALERTA">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {alertas.map((l) => (
                <TempCard key={l.local} summary={l} durationInfo={durationAlerts.get(l.local)} />
              ))}
            </div>
          </Panel>
        )}

        <Panel title={`NORMAIS (${normais.length})`}>
          {normais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {normais.map((l) => (
                <TempCard key={l.local} summary={l} durationInfo={durationAlerts.get(l.local)} />
              ))}
            </div>
          )}
        </Panel>
      </SectionHeader>

      <SectionHeader
        label="Análise"
        insight={`Tendência e comparativo no período de ${range.toUpperCase()}`}
      >
        <Panel
          title={`TENDÊNCIA POR LOCAL · ${range.toUpperCase()}`}
          subtitle="Faixa-alvo em verde · linha colorida pelo status do período"
        >
          {allLocais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {allLocais.map((local) => (
                <TempTrendChart
                  key={local}
                  local={local}
                  medicoes={medicoesFiltradas}
                  range={range}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="VISÃO COMPARATIVA"
          subtitle="Todos os locais sobrepostos · ideal para detectar desvios simultâneos"
        >
          <TempMultiChart locais={allLocais} medicoes={medicoesFiltradas} range={range} />
        </Panel>
      </SectionHeader>
    </div>
  );
}
