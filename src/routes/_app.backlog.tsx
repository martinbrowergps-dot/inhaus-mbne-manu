import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Inbox, AlertTriangle, Clock, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useDateFilter } from "@/hooks/use-date-filter";
import type { BacklogRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { ExportButton } from "@/components/export-button";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData, ReportTable } from "@/lib/pdf-report";
import { parseBRDate, formatBRNumber, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/section-header";

export const Route = createFileRoute("/_app/backlog")({
  component: BacklogPage,
});

function daysSince(date: string): number | null {
  const d = parseBRDate(date);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function priorityRank(p: string): number {
  const v = p.toLowerCase();
  if (/urgent|crit|alta|high/.test(v)) return 0;
  if (/m[eé]d|normal/.test(v)) return 1;
  if (/baix|low/.test(v)) return 2;
  return 3;
}

function priorityClass(p: string): string {
  const r = priorityRank(p);
  if (r === 0) return "bg-destructive/20 text-destructive border-destructive/40";
  if (r === 1) return "bg-warning/20 text-warning border-warning/40";
  if (r === 2) return "bg-primary/15 text-primary border-primary/30";
  return "bg-muted/40 text-muted-foreground border-border";
}

function stateClass(s: string): string {
  const v = s.toLowerCase();
  if (/aberto/.test(v)) return "bg-warning/15 text-warning border-warning/40";
  if (/espera|pausa/.test(v)) return "bg-muted/40 text-muted-foreground border-border";
  if (/andamento|execu/.test(v)) return "bg-primary/15 text-primary border-primary/30";
  if (/conclu|finaliz/.test(v)) return "bg-success/15 text-success border-success/40";
  if (/cancel/.test(v)) return "bg-destructive/15 text-destructive border-destructive/40";
  return "bg-card/60 text-foreground border-border";
}

const columns: ColumnDef<BacklogRow & { _idade: number | null; _vencido: boolean }>[] = [
  { accessorKey: "Identificacao", header: "ID" },
  { accessorKey: "DataCriacao", header: "Criada" },
  {
    accessorKey: "_idade",
    header: "Idade",
    cell: ({ row }) => {
      const d = row.original._idade;
      if (d === null) return <span className="text-muted-foreground">—</span>;
      const cls =
        d > 180
          ? "text-destructive font-bold"
          : d > 60
            ? "text-warning font-semibold"
            : "text-foreground";
      return <span className={cn("num", cls)}>{d}d</span>;
    },
  },
  {
    accessorKey: "Assunto",
    header: "Assunto",
    cell: ({ getValue }) => (
      <span className="line-clamp-2 max-w-[260px] text-xs">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "OQuePrecisa",
    header: "O que precisa",
    cell: ({ getValue }) => (
      <span className="line-clamp-2 max-w-[200px] text-muted-foreground text-[10px]">
        {(getValue() as string) || "—"}
      </span>
    ),
  },
  { accessorKey: "Solicitante", header: "Solicitante" },
  { accessorKey: "Tecnico", header: "Técnico" },
  {
    accessorKey: "Prioridade",
    header: "Prioridade",
    cell: ({ getValue }) => {
      const v = (getValue() as string) || "—";
      return (
        <Badge variant="outline" className={`${priorityClass(v)} text-[10px] font-bold`}>
          {v}
        </Badge>
      );
    },
  },
  {
    accessorKey: "Estado",
    header: "Estado",
    cell: ({ getValue }) => {
      const v = (getValue() as string) || "—";
      return (
        <Badge variant="outline" className={`${stateClass(v)} text-[10px]`}>
          {v}
        </Badge>
      );
    },
  },
  {
    accessorKey: "DataVencimento",
    header: "Vencimento",
    cell: ({ row }) => {
      const v = row.original.DataVencimento;
      const vencido = row.original._vencido;
      return (
        <span className={cn("num text-xs", vencido && "font-bold text-destructive")}>
          {v || "—"}
        </span>
      );
    },
  },
];

function BacklogPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();
  const [q, setQ] = useState("");
  const [priFilter, setPriFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);

  const enriched = useMemo(() => {
    const rows = (data?.backlog ?? []).filter((r) => dateFilter.filterByDateRange(r.DataCriacao));
    return rows
      .filter((r) => !/conclu|finaliz|cancel/i.test(r.Estado))
      .map((r) => {
        const venc = parseBRDate(r.DataVencimento);
        return {
          ...r,
          _idade: daysSince(r.DataCriacao),
          _vencido: !!venc && venc.getTime() < Date.now(),
        };
      });
  }, [data, dateFilter]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (priFilter && r.Prioridade !== priFilter) return false;
      if (stateFilter && r.Estado !== stateFilter) return false;
      if (q.trim()) {
        const l = q.toLowerCase();
        if (
          ![r.Identificacao, r.Assunto, r.Solicitante, r.Tecnico, r.Grupo, r.OQuePrecisa].some(
            (v) =>
              String(v ?? "")
                .toLowerCase()
                .includes(l),
          )
        )
          return false;
      }
      return true;
    });
  }, [enriched, q, priFilter, stateFilter]);

  const total = enriched.length;
  const vencidos = enriched.filter((r) => r._vencido).length;
  const criticos = enriched.filter((r) => priorityRank(r.Prioridade) === 0).length;
  const tecnicos = new Set(enriched.map((r) => r.Tecnico).filter((t) => t && t !== "-")).size;

  // Por prioridade
  const porPrioridade = useMemo(() => {
    const map = new Map<string, number>();
    enriched.forEach((r) => {
      const k = r.Prioridade || "—";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => priorityRank(a.name) - priorityRank(b.name));
  }, [enriched]);

  // Top técnicos
  const porTecnico = useMemo(() => {
    const map = new Map<string, number>();
    enriched.forEach((r) => {
      const k = r.Tecnico && r.Tecnico !== "-" ? r.Tecnico : "Sem atribuição";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [enriched]);

  // Faixas de idade
  const faixasIdade = useMemo(() => {
    const buckets = [
      { name: "0-30d", value: 0 },
      { name: "31-90d", value: 0 },
      { name: "91-180d", value: 0 },
      { name: "180d+", value: 0 },
    ];
    enriched.forEach((r) => {
      const d = r._idade ?? 0;
      if (d <= 30) buckets[0].value++;
      else if (d <= 90) buckets[1].value++;
      else if (d <= 180) buckets[2].value++;
      else buckets[3].value++;
    });
    return buckets;
  }, [enriched]);

  const estados = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Estado).filter(Boolean))),
    [enriched],
  );
  const prioridades = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Prioridade).filter(Boolean))),
    [enriched],
  );

  const handleExportReport = async (layout?: import("@/lib/export-pdf").PdfLayoutOptions) => {
    const chartEls = document.querySelector<HTMLElement>('[data-page="backlog"]')?.querySelectorAll<HTMLElement>("[data-chart]");
    const charts = chartEls ? Array.from(chartEls) : [];

    const table: ReportTable<BacklogRow & { _idade: number | null; _vencido: boolean }> = {
      title: "Solicitações — Registro",
      columns: [
        { header: "Número", value: (r) => r.Numero },
        { header: "Identificação", value: (r) => r.Identificacao },
        { header: "Solicitante", value: (r) => r.Solicitante },
        { header: "Data Criação", value: (r) => r.DataCriacao },
        { header: "Idade (dias)", value: (r) => r._idade ?? "" },
        { header: "Assunto", value: (r) => r.Assunto },
        { header: "O que precisa", value: (r) => r.OQuePrecisa ?? "" },
        { header: "Técnico", value: (r) => r.Tecnico },
        { header: "Prioridade", value: (r) => r.Prioridade },
        { header: "Vencimento", value: (r) => r.DataVencimento },
        { header: "Vencido", value: (r) => (r._vencido ? "Sim" : "Não") },
        { header: "Estado", value: (r) => r.Estado },
        { header: "Grupo", value: (r) => r.Grupo },
        { header: "HH Estimado", value: (r) => r.HHEstimado },
      ],
      rows: filtered,
    };

    const reportData: ReportData = {
      title: "Backlog · Centro de Controle",
      subtitle: dateFilter.isActive
        ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${filtered.length} registros`
        : `${filtered.length} registros`,
      metrics: [
        { label: "Total em aberto", value: String(total), variant: "primary" },
        { label: "Vencidos", value: String(vencidos), variant: vencidos > 0 ? "danger" : "neutral" },
        { label: "Prioridade alta", value: String(criticos), variant: criticos > 0 ? "warning" : "neutral" },
        { label: "Técnicos envolvidos", value: String(tecnicos), variant: "neutral" },
      ],
      tables: [table],
    };

    try {
      await renderReportPdf(reportData, charts, {
        filename: "backlog",
        orientation: "landscape",
        layout,
      });
    } catch (err) {
      console.error("Erro ao exportar backlog:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-64" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div data-page="backlog" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Backlog de Solicitações</h1>
          <p className="text-xs text-muted-foreground">
            Solicitações em aberto na aba BACKLOG da planilha
          </p>
        </div>
        <ExportButton
          filename="backlog"
          rows={filtered}
          columns={[
            { header: "Número", value: (r) => r.Numero },
            { header: "Identificação", value: (r) => r.Identificacao },
            { header: "Solicitante", value: (r) => r.Solicitante },
            { header: "Data Criação", value: (r) => r.DataCriacao },
            { header: "Idade (dias)", value: (r) => r._idade ?? "" },
            { header: "Assunto", value: (r) => r.Assunto },
            { header: "O que precisa", value: (r) => r.OQuePrecisa ?? "" },
            { header: "Técnico", value: (r) => r.Tecnico },
            { header: "Prioridade", value: (r) => r.Prioridade },
            { header: "Vencimento", value: (r) => r.DataVencimento },
            { header: "Vencido", value: (r) => (r._vencido ? "Sim" : "Não") },
            { header: "Estado", value: (r) => r.Estado },
            { header: "Grupo", value: (r) => r.Grupo },
            { header: "HH Estimado", value: (r) => r.HHEstimado },
          ]}
          onExecutiveSummary={handleExportReport}
        />
      </div>

      <SectionHeader label="Panorama" insight={`${total} solicitações abertas · ${vencidos} vencidas · ${criticos} alta prioridade · ${tecnicos} técnicos`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total em aberto" value={total} icon={Inbox} />
          <KpiCard label="Vencidos" value={vencidos} icon={AlertTriangle} variant={vencidos > 0 ? "danger" : "neutral"} />
          <KpiCard label="Prioridade alta" value={criticos} icon={Clock} variant={criticos > 0 ? "warning" : "neutral"} />
          <KpiCard label="Técnicos envolvidos" value={tecnicos} icon={Users} />
        </div>
      </SectionHeader>

      <SectionHeader label="Distribuição" insight="Solicitações por prioridade, idade e técnico">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Panel dataChart="prioridade" title="POR PRIORIDADE">
            <ChartBars data={porPrioridade} colorBy="priority" />
          </Panel>
          <Panel dataChart="idade" title="POR IDADE">
            <ChartBars data={faixasIdade} colorBy="age" />
          </Panel>
          <Panel dataChart="tecnicos" title="TOP TÉCNICOS">
            <ChartBars data={porTecnico} colorBy="primary" horizontal />
          </Panel>
        </div>
      </SectionHeader>

      <SectionHeader label="Registro" insight={`${filtered.length} de ${total} solicitações exibidas`}>
        <Panel
          title={`SOLICITAÇÕES · ${filtered.length} de ${total}`}
          action={
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar ID, assunto, técnico…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 border-border/60 bg-card/50 pl-8 text-xs"
              />
            </div>
          }
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterChip label="Todas prioridades" active={!priFilter} onClick={() => setPriFilter(null)} />
            {prioridades.map((p) => (
              <FilterChip key={p} label={p} active={priFilter === p} onClick={() => setPriFilter(p)} className={priorityClass(p)} />
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterChip label="Todos estados" active={!stateFilter} onClick={() => setStateFilter(null)} />
            {estados.map((s) => (
              <FilterChip key={s} label={s} active={stateFilter === s} onClick={() => setStateFilter(s)} className={stateClass(s)} />
            ))}
          </div>
          <DataTable data={filtered} columns={columns} pageSize={15} />
        </Panel>
      </SectionHeader>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary bg-primary/15 text-primary shadow-[0_0_10px_rgba(14,165,255,0.3)]"
          : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
        active && className,
      )}
    >
      {label}
    </button>
  );
}

function ChartBars({
  data,
  colorBy,
  horizontal,
}: {
  data: { name: string; value: number }[];
  colorBy: "priority" | "age" | "primary";
  horizontal?: boolean;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Sem dados</p>;
  }
  const color = (name: string, i: number) => {
    if (colorBy === "priority") {
      const r = priorityRank(name);
      return r === 0
        ? "#EF4444"
        : r === 1
          ? "#EAB308"
          : "#0EA5FF";
    }
    if (colorBy === "age") {
      return (
        [
          "#0EA5FF",
          "#EAB308",
          "#F97316",
          "#EF4444",
        ][i] || "#0EA5FF"
      );
    }
    return "#0EA5FF";
  };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 8, left: horizontal ? 80 : 0, bottom: 8 }}
      >
        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} />
            <YAxis
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              allowDecimals={false}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: "#05254A",
            border: "1px solid #0EA5FF55",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(v: number) => [formatBRNumber(v, 0), "OS"]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={d.name} fill={color(d.name, i)} />
          ))}
          <LabelList position={horizontal ? "right" : "top"} fill="#94A3B8" fontSize={10} formatter={(v: number) => v > 0 ? formatBRNumber(v, 0) : ""} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
