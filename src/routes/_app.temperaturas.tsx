import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { TempCard } from "@/components/temp-card";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeLocais } from "@/lib/temperature";

export const Route = createFileRoute("/_app/temperaturas")({
  component: TemperaturasPage,
});

function TemperaturasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  if (isLoading)
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );

  const locais = summarizeLocais(data?.medicoes ?? []);
  const criticos = locais.filter((l) => l.status === "critico");
  const alertas = locais.filter((l) => l.status === "alerta");
  const normais = locais.filter((l) => l.status === "normal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Monitoramento de Temperatura</h1>
        <p className="text-xs text-muted-foreground">
          Última leitura por local • Antecâmara 1°C/7°C • Congelados -23°C/-20°C • Resfriados 1°C/4°C
        </p>
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
    </div>
  );
}
