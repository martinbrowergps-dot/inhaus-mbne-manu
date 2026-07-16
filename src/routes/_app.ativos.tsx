import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  Boxes,
  ClipboardList,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Clock,
  AlertOctagon,
  AlertTriangle,
  History,
  MessageSquareText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { aggregate, SERIES_COLORS, STATUS_COLORS } from "@/lib/chart-utils";
import { ChartBarHorizontal } from "@/components/visao-geral/chart-bar-horizontal";
import { ChartDonut } from "@/components/visao-geral/chart-donut";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiSkeletonGrid } from "@/components/kpi-skeleton-grid";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { KpiCard } from "@/components/kpi-card";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deriveExecStatus } from "@/lib/status";
import {
  formatBRNumber,
  formatInt,
  formatDateBR,
  parseBRDate,
  formatBRDate,
} from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";

export const Route = createFileRoute("/_app/ativos")({
  component: AtivosPage,
});

const columns: ColumnDef<ProgramacaoRow>[] = [
  {
    accessorKey: "NumeroOS",
    header: "Nº OS",
    cell: ({ getValue }) => <span className="id">{getValue() as string}</span>,
  },
  {
    accessorKey: "DataProgramada",
    header: "Data",
    cell: ({ getValue }) => {
      const d = parseBRDate(getValue() as string);
      return <span className="num">{d ? formatBRDate(d) : ((getValue() as string) || "—")}</span>;
    },
  },
  { accessorKey: "Sistema", header: "Sistema" },
  { accessorKey: "Descricao", header: "Descrição" },
  {
    accessorKey: "Criticidade",
    header: "Crit.",
    cell: ({ getValue }) => {
      const v = (getValue() as string) || "—";
      return (
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            v.toUpperCase() === "AA"
              ? "border-destructive/40 bg-destructive/15 text-destructive"
              : v.toUpperCase() === "A"
                ? "border-warning/40 bg-warning/15 text-warning"
                : "border-border/40 bg-card/50 text-muted-foreground",
          )}
        >
          {v}
        </span>
      );
    },
  },
  { accessorKey: "Cargo", header: "Cargo" },
  {
    accessorKey: "HH",
    header: "HH",
    cell: ({ getValue }) => <span className="num">{formatBRNumber(Number(getValue() ?? 0), 1)}</span>,
  },
  { accessorKey: "Executante", header: "Executante" },
  {
    id: "statusExec",
    header: "Status",
    cell: ({ row }) => {
      const s = deriveExecStatus(row.original);
      const cls =
        s === "Finalizada"
          ? "border-success/40 bg-success/15 text-success"
          : s === "Cancelada"
            ? "border-destructive/40 bg-destructive/15 text-destructive"
            : s === "Em execução"
              ? "border-warning/40 bg-warning/15 text-warning"
              : "border-border/40 bg-card/50 text-muted-foreground";
      return (
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", cls)}>
          {s}
        </span>
      );
    },
  },
];

function AtivosPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();
  const [selectedTag, setSelectedTag] = useState<string>("__all__");

  const allProgramacao = data?.programacao ?? [];

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProgramacao) {
      const t = (p.TAG || "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allProgramacao]);

  const ativos = useMemo(() => {
    const filtered = allProgramacao.filter((p) =>
      dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
    );
    const byTag = filtered.filter(
      (p) => selectedTag === "__all__" || (p.TAG || "").trim() === selectedTag,
    );
    return byTag;
  }, [allProgramacao, dateFilter, selectedTag]);

  if (isLoading)
    return (
      <div className="space-y-4">
        <KpiSkeletonGrid count={4} className="sm:grid-cols-4" heightClass="h-24" />
        <Skeleton className="h-96" />
      </div>
    );

  if (!data) return null;

  const currentTag = selectedTag === "__all__" ? null : selectedTag;

  const enriched = ativos.map((p) => ({ ...p, _exec: deriveExecStatus(p) }));
  const total = enriched.length;
  const finalizadas = enriched.filter((p) => p._exec === "Finalizada").length;
  const programadas = enriched.filter(
    (p) => p._exec === "Programada" || p._exec === "Em execução" || p._exec === "Atrasada" || p._exec === "Reprogramada" || p._exec === "Pausada",
  ).length;
  const canceladas = enriched.filter((p) => p._exec === "Cancelada").length;
  const aa = enriched.filter((p) => (p.Criticidade || "").toUpperCase() === "AA").length;
  const totalHH = enriched.reduce((s, p) => s + (p.HH || 0), 0);
  const quebras = enriched.filter(
    (p) => (p.Tipo || "").toUpperCase() === "QUEBRA DE PROGRAMAÇÃO",
  ).length;

  // Gráficos
  const byExec = aggregate(enriched, (p) => p._exec);
  const byCrit = aggregate(enriched, (p) => p.Criticidade || "—");
  const byCargoHH = useMemo(() => {
    const map = new Map<string, number>();
    enriched.forEach((p) => map.set(p.Cargo || "—", (map.get(p.Cargo || "—") ?? 0) + (p.HH || 0)));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value);
  }, [enriched]);

  const byMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of enriched) {
      const d = parseBRDate(p.DataProgramada);
      if (!d) continue;
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const [ma, ya] = a.name.split("/").map(Number);
        const [mb, yb] = b.name.split("/").map(Number);
        return ya !== yb ? ya - yb : ma - mb;
      });
  }, [enriched]);

  // Observações pertinentes
  const observacoes = useMemo(
    () =>
      enriched
        .filter((p) => {
          const obs = (p.ObservacoesExecucao || "").trim();
          const nc = (p.DescricaoNaoConformidade || "").trim();
          return obs || (nc && /sim|s|não conform/i.test(p.TemNaoConformidade || "sim"));
        })
        .map((p) => ({
          os: p.NumeroOS,
          data: p.DataProgramada,
          obs: (p.ObservacoesExecucao || "").trim(),
          nc: (p.DescricaoNaoConformidade || "").trim(),
        })),
    [enriched],
  );

  const subtitle =
    (currentTag ? `Ativo ${currentTag} · ` : "Todos os ativos · ") +
    (dateFilter.isActive
      ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
      : "período completo");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Ativos</h1>
          <p className="fade-up text-xs text-muted-foreground">
            Histórico e indicadores de manutenção por equipamento/máquina (TAG)
          </p>
        </div>
        <ExportButton
          filename="ativos"
          rows={ativos}
          columns={[
            { header: "Nº OS", value: (r) => r.NumeroOS },
            { header: "TAG", value: (r) => r.TAG },
            { header: "Data", value: (r) => r.DataProgramada },
            { header: "Sistema", value: (r) => r.Sistema },
            { header: "Descrição", value: (r) => r.Descricao },
            { header: "Criticidade", value: (r) => r.Criticidade },
            { header: "Cargo", value: (r) => r.Cargo },
            { header: "HH", value: (r) => r.HH },
            { header: "Executante", value: (r) => r.Executante },
            { header: "Status", value: (r) => r.StatusExecucao || r.Status },
          ]}
          pdfTitle="Ativos · Histórico por Equipamento"
          pdfSubtitle={subtitle}
        />
      </div>

      <Panel title="SELEÇÃO DE ATIVO" glass>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Selecione um ativo (TAG)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os ativos</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {tags.length} ativos distintos · {formatInt(total)} OS no período
          </span>
        </div>
      </Panel>

      {total === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhuma OS encontrada"
          description={
            currentTag
              ? `Não há ordens de serviço para o ativo ${currentTag} no período selecionado.`
              : "Não há ordens de serviço no período selecionado."
          }
        />
      ) : (
        <>
          <SectionHeader
            label="Panorama"
            insight={`${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)}h HH · ${formatInt(finalizadas)} finalizadas${currentTag ? ` · ativo ${currentTag}` : ""}`}
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <KpiCard label="Total de OS" value={total} icon={ClipboardList} variant="primary" />
              <KpiCard label="Finalizadas" value={finalizadas} icon={CheckCircle2} variant="success" />
              <KpiCard label="Pendentes" value={programadas} icon={CalendarClock} variant="warning" />
              <KpiCard label="Canceladas" value={canceladas} icon={XCircle} variant="danger" />
              <KpiCard label="HH Total" value={`${formatBRNumber(totalHH, 1)}h`} icon={Clock} variant="neutral" />
              <KpiCard label="Criticidade AA" value={aa} icon={AlertOctagon} variant="danger" />
              <KpiCard label="Quebras" value={quebras} icon={AlertTriangle} variant="danger" />
            </div>
          </SectionHeader>

          <SectionHeader label="Distribuição" insight="Status e criticidade das OS do ativo">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="OS POR STATUS" dataChart="ativos-status">
                <ChartDonut data={byExec} />
              </Panel>
              <Panel title="OS POR CRITICIDADE" dataChart="ativos-criticidade">
                <ChartDonut data={byCrit} colors={[STATUS_COLORS.AA, STATUS_COLORS.A, STATUS_COLORS.B, STATUS_COLORS.C]} />
              </Panel>
            </div>
          </SectionHeader>

          <SectionHeader label="Histórico temporal" insight="Volume de OS por mês">
            <Panel title="OS POR MÊS" dataChart="ativos-mes">
              {byMes.length === 0 ? (
                <EmptyState className="h-64" />
              ) : (
                <ChartBarHorizontal data={byMes} color={SERIES_COLORS.executado} />
              )}
            </Panel>
          </SectionHeader>

          <SectionHeader label="Esforço (HH)" insight={`${formatBRNumber(totalHH, 1)}h por cargo`}>
            <Panel title="HH POR CARGO" dataChart="ativos-hh-cargo">
              {byCargoHH.length === 0 ? (
                <EmptyState className="h-64" />
              ) : (
                <ChartBarHorizontal data={byCargoHH} color={SERIES_COLORS.hh} />
              )}
            </Panel>
          </SectionHeader>

          <SectionHeader
            label="Observações"
            insight={`${observacoes.length} registro(s) com observações ou não conformidade`}
          >
            <Panel title="OBSERVAÇÕES E NÃO CONFORMIDADES" dataChart="ativos-obs">
              {observacoes.length === 0 ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="Sem observações"
                  description="Nenhuma OS deste ativo possui observações ou não conformidade registrada."
                />
              ) : (
                <div className="space-y-2">
                  {observacoes.map((o, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="id font-semibold text-foreground">{o.os}</span>
                        {o.data && <span className="num text-muted-foreground">{formatBRDate(parseBRDate(o.data) ?? new Date())}</span>}
                      </div>
                      {o.obs && <p className="text-foreground/90">{o.obs}</p>}
                      {o.nc && (
                        <p className="mt-1 text-destructive/90">
                          <span className="font-semibold uppercase tracking-wider">Não conformidade: </span>
                          {o.nc}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </SectionHeader>

          <SectionHeader
            label="Histórico de OS"
            insight={`${ativos.length} ordens de serviço${currentTag ? ` do ativo ${currentTag}` : ""}`}
          >
            <DataTable
              data={ativos}
              columns={columns}
              pageSize={15}
              searchKeys={["NumeroOS", "TAG", "Descricao", "Sistema", "Executante", "Cargo"]}
              detailTitle={(r) => r.NumeroOS}
              detailSubtitle={(r) => `${r.Descricao} — ${r.Sistema}`}
            />
          </SectionHeader>
        </>
      )}
    </div>
  );
}
