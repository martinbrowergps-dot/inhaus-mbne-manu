import { useRef, useMemo } from "react";
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
import {
  filterByRange,
  summarizeLocais,
  uniqueLocais,
  computeDurationAlerts,
  classifyLocal,
  tempStatus,
  type TempRange,
  type TempStatus,
} from "@/lib/temperature";
import { parseBRDate } from "@/lib/format";

import { SectionHeader } from "@/components/section-header";
import { EmptyState } from "@/components/empty-state";

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

  if (isLoading)
    return <KpiSkeletonGrid count={6} className="md:grid-cols-3" heightClass="h-40" />;

  const medicoes = data?.medicoes ?? [];
  const filteredMedicoes = filterByRange(medicoes, range);
  const locais = summarizeLocais(medicoes);
  const durationAlerts = computeDurationAlerts(filteredMedicoes);
  const criticos = locais.filter((l) => l.status === "critico");
  const alertas = locais.filter((l) => l.status === "alerta");
  const normais = locais.filter((l) => l.status === "normal");
  const allLocais = uniqueLocais(medicoes);

  // Heatmap LOCAL x DIA (todo o histórico disponível)
  const heatmap = useMemo(() => {
    const dayMap = new Map<string, { label: string; ts: number }>();
    for (const m of medicoes) {
      const d = (m.DATA || "").trim();
      if (!d || dayMap.has(d)) continue;
      const dt = parseBRDate(d);
      dayMap.set(d, {
        label: dt ? dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : d,
        ts: dt ? dt.getTime() : 0,
      });
    }
    const days = Array.from(dayMap.entries())
      .map(([raw, v]) => ({ raw, ...v }))
      .sort((a, b) => a.ts - b.ts);
    const acc = new Map<string, { sum: number; count: number }>();
    for (const m of medicoes) {
      const l = (m.LOCAL || "").trim();
      const d = (m.DATA || "").trim();
      if (!l || !d) continue;
      const temps = [m.TEMPERATURA_01, m.TEMPERATURA_02].filter(
        (t): t is number => t !== null,
      );
      if (temps.length === 0) continue;
      const key = `${l}|${d}`;
      const cur = acc.get(key) ?? { sum: 0, count: 0 };
      for (const t of temps) {
        cur.sum += t;
        cur.count++;
      }
      acc.set(key, cur);
    }
    const cells = new Map<string, { temp: number | null; status: TempStatus }>();
    for (const [key, v] of acc) {
      const [l] = key.split("|");
      const tipo = classifyLocal(l);
      const mean = v.sum / v.count;
      cells.set(key, { temp: mean, status: tempStatus(mean, tipo) });
    }
    return { locais: allLocais, days, cells };
  }, [medicoes, allLocais]);

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
            rows={filterByRange(medicoes, range)}
            columns={[
              { header: "Local", value: (r) => r.LOCAL },
              { header: "Data", value: (r) => r.DATA },
              { header: "Hora", value: (r) => r.HORA },
              { header: "Temperatura 01", value: (r) => r.TEMPERATURA_01 ?? "" },
              { header: "Temperatura 02", value: (r) => r.TEMPERATURA_02 ?? "" },

              { header: "Técnico", value: (r) => r.TECNICO },
            ]}
            pdfTitle="Temperaturas · Centro de Controle"
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
            <EmptyState className="h-32" />
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
            <EmptyState className="h-32" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {allLocais.map((local) => (
                <TempTrendChart
                  key={local}
                  local={local}
                  medicoes={medicoes}
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
          <TempMultiChart locais={allLocais} medicoes={medicoes} range={range} />
        </Panel>
      </SectionHeader>

      <SectionHeader
        label="Heatmap de Temperaturas"
        insight="Média do dia por local · verde na faixa · âmbar alerta · vermelho crítico"
        children={null}
      />

      <Panel title="LOCAL × DIA" subtitle="Todo o período histórico disponível">
        {heatmap.locais.length === 0 || heatmap.days.length === 0 ? (
          <EmptyState className="h-32" />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1 text-[10px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-background pr-2 text-left font-semibold text-muted-foreground">
                      Local
                    </th>
                    {heatmap.days.map((d) => (
                      <th key={d.raw} className="px-1 font-medium text-muted-foreground">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.locais.map((local) => (
                    <tr key={local}>
                      <td className="sticky left-0 max-w-[140px] truncate bg-background pr-2 font-medium text-foreground">
                        {local}
                      </td>
                      {heatmap.days.map((d) => {
                        const c = heatmap.cells.get(`${local}|${d.raw}`);
                        const cellCls = c
                          ? c.status === "critico"
                            ? "bg-destructive/30 text-destructive"
                            : c.status === "alerta"
                              ? "bg-warning/25 text-warning"
                              : "bg-success/15 text-success"
                          : "bg-muted/30 text-muted-foreground/40";
                        return (
                          <td
                            key={d.raw}
                            className={`h-7 min-w-[28px] rounded text-center font-semibold ${cellCls}`}
                          >
                            {c && c.temp !== null ? Math.round(c.temp) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-success/40" /> Na faixa
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-warning/50" /> Alerta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-destructive/50" /> Crítico
              </span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
