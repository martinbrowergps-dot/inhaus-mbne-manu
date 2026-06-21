import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ExportButton } from "@/components/export-button";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatBRNumber, parseBRDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deriveExecStatus,
  EXECUTADO_STATUSES,
  PROGRAMADO_STATUSES,
  type ExecStatus,
} from "@/lib/status";

export const Route = createFileRoute("/_app/programacao")({
  component: ProgramacaoPage,
});

type EnrichedRow = ProgramacaoRow & { _status: ExecStatus; _diasAtraso: number | null };

const fullCols: ColumnDef<EnrichedRow>[] = [
  { accessorKey: "NumeroOS", header: "Nº OS" },
  { accessorKey: "DataProgramada", header: "Data" },
  { accessorKey: "Sistema", header: "Sistema" },
  {
    accessorKey: "Descricao",
    header: "Descrição",
    cell: ({ getValue }) => <span className="line-clamp-1 max-w-[280px]">{getValue() as string}</span>,
  },
  {
    accessorKey: "Criticidade",
    header: "Crit.",
    cell: ({ getValue }) => {
      const v = (getValue() as string)?.toUpperCase();
      const color =
        v === "AA" ? "bg-destructive/20 text-destructive border-destructive/40"
        : v === "A" ? "bg-warning/20 text-warning border-warning/40"
        : "bg-primary/15 text-primary border-primary/30";
      return <Badge variant="outline" className={`${color} text-[10px] font-bold`}>{v || "—"}</Badge>;
    },
  },
  { accessorKey: "Cargo", header: "Cargo" },
  {
    accessorKey: "HH",
    header: "HH",
    cell: ({ getValue }) => <span className="num">{formatBRNumber(getValue() as number, 2)}</span>,
  },
  { accessorKey: "Executante", header: "Executante" },
  {
    accessorKey: "_status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue() as ExecStatus} />,
  },
];

function daysOverdue(dateStr: string): number | null {
  const d = parseBRDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function ProgramacaoPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const [q, setQ] = useState("");
  const [sistemaF, setSistemaF] = useState<string | null>(null);
  const [critF, setCritF] = useState<string | null>(null);
  const [execF, setExecF] = useState<string | null>(null);

  const enriched: EnrichedRow[] = useMemo(
    () =>
      (data?.programacao ?? []).map((p) => ({
        ...p,
        _status: deriveExecStatus(p),
        _diasAtraso: daysOverdue(p.DataProgramada),
      })),
    [data],
  );

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (sistemaF && r.Sistema !== sistemaF) return false;
      if (critF && (r.Criticidade || "").toUpperCase() !== critF) return false;
      if (execF && r.Executante !== execF) return false;
      if (q.trim()) {
        const l = q.toLowerCase();
        if (
          ![r.NumeroOS, r.TAG, r.Descricao, r.Sistema, r.Executante, r.Cargo]
            .some((v) => String(v ?? "").toLowerCase().includes(l))
        )
          return false;
      }
      return true;
    });
  }, [enriched, q, sistemaF, critF, execF]);

  const programado = filtered.filter((r) => PROGRAMADO_STATUSES.includes(r._status));
  const executado = filtered.filter((r) => EXECUTADO_STATUSES.includes(r._status));

  const sumHH = (rows: EnrichedRow[]) => rows.reduce((s, r) => s + (r.HH || 0), 0);

  const sistemas = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Sistema).filter(Boolean))).sort(),
    [enriched],
  );
  const criticidades = useMemo(
    () => Array.from(new Set(enriched.map((r) => (r.Criticidade || "").toUpperCase()).filter(Boolean))).sort(),
    [enriched],
  );
  const executantes = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Executante).filter(Boolean))).sort(),
    [enriched],
  );

  // Summary distribution (sistema and criticidade counts)
  const sistemaDist = useMemo(() => countBy(filtered, (r) => r.Sistema || "—"), [filtered]);
  const critDist = useMemo(
    () => countBy(filtered, (r) => (r.Criticidade || "—").toUpperCase()),
    [filtered],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Programação Semanal</h1>
          <p className="text-xs text-muted-foreground">
            Compare lado a lado o que está programado vs o que foi executado
          </p>
        </div>
        <ExportButton
          filename="programacao"
          rows={filtered}
          columns={[
            { header: "Nº OS", value: (r) => r.NumeroOS },
            { header: "Data Programada", value: (r) => r.DataProgramada },
            { header: "Data Reprogramada", value: (r) => r.DataReprogramada },
            { header: "TAG", value: (r) => r.TAG },
            { header: "Sistema", value: (r) => r.Sistema },
            { header: "Descrição", value: (r) => r.Descricao },
            { header: "Criticidade", value: (r) => r.Criticidade },
            { header: "Cargo", value: (r) => r.Cargo },
            { header: "HH", value: (r) => r.HH },
            { header: "Executante", value: (r) => r.Executante },
            { header: "Status", value: (r) => r._status },
            { header: "Dias Atraso", value: (r) => r._diasAtraso ?? "" },
          ]}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="comparativo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
              <TabsTrigger value="tabela">Tabela completa</TabsTrigger>
            </TabsList>
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar OS, TAG, descrição, executante…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 border-border/60 bg-card/50 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Resumo + Filtros */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="DISTRIBUIÇÃO POR SISTEMA" className="!p-4">
              <MiniBars items={sistemaDist} max={6} />
            </Panel>
            <Panel title="DISTRIBUIÇÃO POR CRITICIDADE" className="!p-4">
              <MiniBars
                items={critDist}
                colorFor={(name) =>
                  name === "AA"
                    ? "bg-destructive"
                    : name === "A"
                    ? "bg-warning"
                    : "bg-primary"
                }
              />
            </Panel>
          </div>

          <div className="space-y-2">
            <FilterRow
              label="Sistema"
              value={sistemaF}
              options={sistemas}
              onChange={setSistemaF}
            />
            <FilterRow
              label="Criticidade"
              value={critF}
              options={criticidades}
              onChange={setCritF}
              colorFor={(v) =>
                v === "AA"
                  ? "border-destructive/40 text-destructive"
                  : v === "A"
                  ? "border-warning/40 text-warning"
                  : "border-primary/30 text-primary"
              }
            />
            <FilterRow
              label="Executante"
              value={execF}
              options={executantes}
              onChange={setExecF}
            />
          </div>

          <TabsContent value="comparativo" className="m-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title={`PROGRAMADO · ${programado.length} OS`}
                subtitle={`${formatBRNumber(sumHH(programado), 1)} HH alocados`}
              >
                <OsGroupedList rows={programado} emptyLabel="Nenhuma OS em aberto" />
              </Panel>
              <Panel
                title={`EXECUTADO · ${executado.length} OS`}
                subtitle={`${formatBRNumber(sumHH(executado), 1)} HH realizados`}
              >
                <OsGroupedList rows={executado} emptyLabel="Nenhuma OS finalizada/cancelada" />
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="tabela" className="m-0">
            <Panel>
              <DataTable
                data={filtered}
                columns={fullCols}
                searchPlaceholder="Refinar nesta tabela…"
                pageSize={15}
              />
            </Panel>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function countBy<T>(rows: T[], key: (r: T) => string): { name: string; value: number }[] {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = key(r);
    m.set(k, (m.get(k) || 0) + 1);
  });
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function MiniBars({
  items,
  max = 8,
  colorFor,
}: {
  items: { name: string; value: number }[];
  max?: number;
  colorFor?: (name: string) => string;
}) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">Sem dados</p>;
  }
  const visible = items.slice(0, max);
  const total = items.reduce((s, i) => s + i.value, 0);
  const top = Math.max(...visible.map((i) => i.value), 1);
  return (
    <ul className="space-y-1.5">
      {visible.map((item) => {
        const pct = (item.value / top) * 100;
        const share = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <li key={item.name} className="flex items-center gap-2 text-[11px]">
            <span className="w-24 truncate text-muted-foreground">{item.name}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
              <div
                className={cn("h-full rounded-full transition-all", colorFor?.(item.name) || "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="num w-14 text-right font-semibold text-foreground">
              {item.value} <span className="text-muted-foreground">({share.toFixed(0)}%)</span>
            </span>
          </li>
        );
      })}
      {items.length > max && (
        <li className="pt-1 text-[10px] text-muted-foreground">+{items.length - max} outros</li>
      )}
    </ul>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
  colorFor,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  colorFor?: (v: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase w-24">
        {label}
      </span>
      <Chip label="Todos" active={!value} onClick={() => onChange(null)} />
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={value === opt}
          onClick={() => onChange(value === opt ? null : opt)}
          extraClass={colorFor?.(opt)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  extraClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  extraClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : cn("border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground", extraClass),
      )}
    >
      {label}
    </button>
  );
}

function OsGroupedList({
  rows,
  emptyLabel,
}: {
  rows: EnrichedRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  const groups = useMemo(() => {
    const m = new Map<string, EnrichedRow[]>();
    rows.forEach((r) => {
      const k = r.DataProgramada || "Sem data";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries()).sort((a, b) => {
      const da = parseBRDate(a[0])?.getTime() ?? 0;
      const db = parseBRDate(b[0])?.getTime() ?? 0;
      return db - da;
    });
  }, [rows]);

  return (
    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="sticky top-0 z-10 mb-1.5 flex items-center justify-between rounded-md border border-border/40 bg-card/80 px-2 py-1 backdrop-blur">
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
              📅 {date}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {items.length} OS · {formatBRNumber(items.reduce((s, r) => s + (r.HH || 0), 0), 1)}h
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((r) => (
              <OsCard key={`${r.NumeroOS}-${r._status}`} row={r} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OsCard({ row: r }: { row: EnrichedRow }) {
  const isAtrasada = r._status === "Atrasada" && r._diasAtraso !== null;
  return (
    <li className="rounded-lg border border-border/50 bg-card/40 p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[11px] font-bold text-primary">{r.NumeroOS}</span>
            <span className="text-[10px] text-muted-foreground">{r.Sistema}</span>
            {isAtrasada && (
              <span className="rounded-full border border-destructive/50 bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                ⚠ {r._diasAtraso}d atrasada
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-foreground">{r.Descricao}</p>
        </div>
        <StatusBadge status={r._status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/30 pt-1.5 text-[10px] text-muted-foreground">
        {r.DataReprogramada && (
          <span>↻ <span className="num text-warning">{r.DataReprogramada}</span></span>
        )}
        <span>👤 {r.Executante || "—"}</span>
        <span>⏱ <span className="num text-foreground">{formatBRNumber(r.HH || 0, 1)}h</span></span>
        {r.Criticidade && (
          <span className={r.Criticidade.toUpperCase() === "AA" ? "font-bold text-destructive" : "text-foreground"}>
            {r.Criticidade}
          </span>
        )}
      </div>
    </li>
  );
}
