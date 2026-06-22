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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/components/export-button";
import { filterByRange, summarizeLocais, uniqueLocais, type TempRange } from "@/lib/temperature";

const searchSchema = z.object({
  range: fallback(z.enum(["24h", "7d", "30d"]), "24h").default("24h"),
});

export const Route = createFileRoute("/_app/temperaturas")({
  validateSearch: zodValidator(searchSchema),
  component: TemperaturasPage,
});

function TemperaturasPage() {
  const { range } = Route.useSearch();
  const navigate = useNavigate({ from: "/temperaturas" });
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);

  const setRange = (r: TempRange) =>
    navigate({ search: (prev: { range: TempRange }) => ({ ...prev, range: r }) });

  if (isLoading)
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );

  const medicoes = data?.medicoes ?? [];
  const locais = summarizeLocais(medicoes);
  const criticos = locais.filter((l) => l.status === "critico");
  const alertas = locais.filter((l) => l.status === "alerta");
  const normais = locais.filter((l) => l.status === "normal");
  const allLocais = uniqueLocais(medicoes);

  return (
    <div ref={pdfRef} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">

        <div>
          <h1 className="text-xl font-bold tracking-tight">Monitoramento de Temperatura</h1>
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
            rows={filterByRange(medicoes, range)}
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
            pdfTargetRef={pdfRef}
            pdfTitle="Temperaturas · Centro de Controle"
          />
        </div>
      </div>

      {criticos.length > 0 && (
        <Panel title="CRÍTICOS" glow>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {criticos.map((l) => (
              <TempCard key={l.local} summary={l} />
            ))}
          </div>
        </Panel>
      )}

      {alertas.length > 0 && (
        <Panel title="EM ALERTA">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {alertas.map((l) => (
              <TempCard key={l.local} summary={l} />
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
              <TempCard key={l.local} summary={l} />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title={`TENDÊNCIA POR LOCAL · ${range.toUpperCase()}`}
        subtitle="Faixa-alvo em verde · linha colorida pelo status do período"
      >
        {allLocais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registros</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {allLocais.map((local) => (
              <TempTrendChart key={local} local={local} medicoes={medicoes} range={range} />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="VISÃO COMPARATIVA"
        subtitle="Todos os locais sobrepostos · ideal para detectar desvios simultâneos"
      >
        <TempMultiChart locais={allLocais} medicoes={medicoes} range={range} />
      </Panel>
    </div>
  );
}
