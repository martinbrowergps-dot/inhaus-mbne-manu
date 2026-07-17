import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  MessageSquareText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { SERIES_COLORS, STATUS_COLORS } from "@/lib/chart-utils";
import { useProgramacaoFilter } from "@/lib/domain/programacao-filter";
import { assetLabel } from "@/lib/domain/tag-map";
import {
  aggregateByMonth,
  aggregateHHByCargo,
} from "@/lib/domain/aggregates";
import { extractObservations } from "@/lib/domain/observations";
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
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatBRNumber,
  formatInt,
  formatDateBR,
  parseBRDate,
  formatBRDate,
} from "@/lib/format";

export const Route = createFileRoute("/_app/ativos")({
  component: AtivosPage,
});

type AtivoRow = ProgramacaoRow & { _exec: string; _equip: string };

const columns: ColumnDef<AtivoRow>[] = [
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
    accessorKey: "_equip",
    header: "Equipamento/Máquina",
    cell: ({ getValue }) => <span>{getValue() as string}</span>,
  },
  {
    accessorKey: "Criticidade",
    header: "Crit.",
    cell: ({ getValue }) => {
      const v = (getValue() as string) || "—";
      return (
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
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
      const s = row.original._exec;
      const cls =
        s === "Finalizada"
          ? "border-success/40 bg-success/15 text-success"
          : s === "Cancelada"
            ? "border-destructive/40 bg-destructive/15 text-destructive"
            : s === "Em execução"
              ? "border-warning/40 bg-warning/15 text-warning"
              : "border-border/40 bg-card/50 text-muted-foreground";
      return (
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", cls)}>
          {s}
        </span>
      );
    },
  },
];

function AtivosPage() {
  const { isLoading, raw, filtered, enriched, tagMap, dateFilter } = useProgramacaoFilter();
  const [selectedTag, setSelectedTag] = useState<string>("__all__");

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const p of raw) {
      const t = (p.TAG || "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) =>
      assetLabel(a, tagMap).localeCompare(assetLabel(b, tagMap), "pt-BR", { sensitivity: "base" }),
    );
  }, [raw, tagMap]);

  const rows = useMemo(
    () =>
      selectedTag === "__all__"
        ? enriched
        : enriched.filter((p) => (p.TAG || "").trim() === selectedTag),
    [enriched, selectedTag],
  );

  const rowsRaw = useMemo(
    () =>
      selectedTag === "__all__"
        ? filtered
        : filtered.filter((p) => (p.TAG || "").trim() === selectedTag),
    [filtered, selectedTag],
  );

  if (isLoading)
    return (
      <div className="space-y-4">
        <KpiSkeletonGrid count={4} className="sm:grid-cols-4" heightClass="h-24" />
        <Skeleton className="h-96" />
      </div>
    );

  const currentTag = selectedTag === "__all__" ? null : selectedTag;
  const currentLabel = currentTag ? assetLabel(currentTag, tagMap) : null;

  const total = rows.length;
  const finalizadas = rows.filter((p) => p._exec === "Finalizada").length;
  const programadas = rows.filter(
    (p) =>
      p._exec === "Programada" ||
      p._exec === "Em execução" ||
      p._exec === "Atrasada" ||
      p._exec === "Reprogramada" ||
      p._exec === "Pausada",
  ).length;
  const canceladas = rows.filter((p) => p._exec === "Cancelada").length;
  const aa = rows.filter((p) => (p.Criticidade || "").toUpperCase() === "AA").length;
  const totalHH = rows.reduce((s, p) => s + (p.HH || 0), 0);
  const quebras = rows.filter(
    (p) => (p.Tipo || "").toUpperCase() === "QUEBRA DE PROGRAMAÇÃO",
  ).length;

  const byExec = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((p) => map.set(p._exec, (map.get(p._exec) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const byCrit = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((p) => map.set(p.Criticidade || "—", (map.get(p.Criticidade || "—") ?? 0) + 1));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const byCargoHH = useMemo(() => aggregateHHByCargo(rows), [rows]);
  const byMes = useMemo(() => aggregateByMonth(rows), [rows]);
  const observacoes = useMemo(() => extractObservations(rowsRaw), [rowsRaw]);

  const subtitle =
    (currentLabel ? `Ativo ${currentLabel} · ` : "Todos os ativos · ") +
    (dateFilter.isActive
      ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
      : "período completo");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ativos"
        subtitle="Histórico e indicadores de manutenção por equipamento/máquina (TAG)"
        filterBadge={
          dateFilter.isActive ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
              {formatDateBR(dateFilter.startDate)} – {formatDateBR(dateFilter.endDate)}
            </span>
          ) : undefined
        }
        exportButton={
          <ExportButton
            filename="ativos"
            rows={rowsRaw}
            columns={[
              { header: "Nº OS", value: (r) => r.NumeroOS },
              { header: "Equipamento/Máquina", value: (r) => tagMap.get((r.TAG || "").trim()) || "—" },
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
        }
      />

      <Panel title="SELEÇÃO DE ATIVO" glass>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione um equipamento/máquina (TAG)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os ativos</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {assetLabel(t, tagMap)}
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
            currentLabel
              ? `Não há ordens de serviço para o ativo ${currentLabel} no período selecionado.`
              : "Não há ordens de serviço no período selecionado."
          }
        />
      ) : (
        <>
          <SectionHeader
            label="Panorama"
            insight={`${formatInt(total)} OS · ${formatBRNumber(totalHH, 1)}h HH · ${formatInt(finalizadas)} finalizadas${currentLabel ? ` · ativo ${currentLabel}` : ""}`}
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
                        {o.data && <span className="num text-muted-foreground">{o.dataFormatted}</span>}
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
            insight={`${rows.length} ordens de serviço${currentLabel ? ` do ativo ${currentLabel}` : ""}`}
          >
            <DataTable
              data={rows}
              columns={columns}
              pageSize={15}
              searchKeys={["NumeroOS", "TAG", "_equip", "Descricao", "Sistema", "Executante", "Cargo"]}
              detailTitle={(r) => r.NumeroOS}
              detailSubtitle={(r) => `${r.Descricao} — ${r.Sistema}`}
            />
          </SectionHeader>
        </>
      )}
    </div>
  );
}
