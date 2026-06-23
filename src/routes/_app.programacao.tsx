import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import type { ProgramacaoRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ExportButton } from "@/components/export-button";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatBRNumber, parseBRDate, getWeekStart } from "@/lib/format";
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

type EnrichedRow = ProgramacaoRow & {
  _status: ExecStatus;
  _diasAtraso: number | null;
  _date: Date | null;
};

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

function daysOverdue(d: Date | null): number | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - dd.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ProgramacaoPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const [q, setQ] = useState("");
  const [sistemaF, setSistemaF] = useState<string | null>(null);
  const [critF, setCritF] = useState<string | null>(null);
  const [execF, setExecF] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [diaSel, setDiaSel] = useState<string>(fmtISO(today));
  const [semanaSel, setSemanaSel] = useState<string>(fmtISO(getWeekStart(today)));
  const [mesSel, setMesSel] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );

  const enriched: EnrichedRow[] = useMemo(
    () =>
      (data?.programacao ?? []).map((p) => {
        const d = parseBRDate(p.DataProgramada);
        return {
          ...p,
          _status: deriveExecStatus(p),
          _diasAtraso: daysOverdue(d),
          _date: d,
        };
      }),
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

  // ====== DIÁRIA ======
  const diaDate = isoToDate(diaSel);
  const rowsDia = filtered.filter((r) => r._date && sameDay(r._date, diaDate));
  const diaProg = rowsDia.filter((r) => PROGRAMADO_STATUSES.includes(r._status));
  const diaExec = rowsDia.filter((r) => EXECUTADO_STATUSES.includes(r._status));

  // ====== SEMANAL ======
  const semInicio = isoToDate(semanaSel);
  const semFim = new Date(semInicio);
  semFim.setDate(semFim.getDate() + 6);
  const rowsSemana = filtered.filter(
    (r) => r._date && r._date >= semInicio && r._date <= new Date(semFim.getTime() + 86_399_000),
  );
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semInicio);
    d.setDate(d.getDate() + i);
    return d;
  });

  // ====== MENSAL ======
  const [yStr, mStr] = mesSel.split("-");
  const mesInicio = new Date(Number(yStr), Number(mStr) - 1, 1);
  const mesFim = new Date(Number(yStr), Number(mStr), 0);
  const rowsMes = filtered.filter(
    (r) => r._date && r._date >= mesInicio && r._date <= new Date(mesFim.getTime() + 86_399_000),
  );
  const diasMes = Array.from({ length: mesFim.getDate() }, (_, i) => {
    const d = new Date(mesInicio);
    d.setDate(i + 1);
    const dayRows = rowsMes.filter((r) => r._date && sameDay(r._date, d));
    return {
      date: d,
      total: dayRows.length,
      prog: dayRows.filter((r) => PROGRAMADO_STATUSES.includes(r._status)).length,
      exec: dayRows.filter((r) => EXECUTADO_STATUSES.includes(r._status)).length,
      hh: dayRows.reduce((s, r) => s + (r.HH || 0), 0),
    };
  });

  const shiftWeek = (n: number) => {
    const d = isoToDate(semanaSel);
    d.setDate(d.getDate() + n * 7);
    setSemanaSel(fmtISO(d));
  };
  const shiftMonth = (n: number) => {
    const d = new Date(Number(yStr), Number(mStr) - 1 + n, 1);
    setMesSel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const shiftDay = (n: number) => {
    const d = isoToDate(diaSel);
    d.setDate(d.getDate() + n);
    setDiaSel(fmtISO(d));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Programação</h1>
          <p className="text-xs text-muted-foreground">
            Visões diária, semanal e mensal — comparativo programado vs executado
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
          pdfTitle="Programação · Centro de Controle"
          pdfSubtitle={`${filtered.length} OS · ${formatBRNumber(sumHH(filtered), 1)} HH`}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="semanal" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="diaria">Diária</TabsTrigger>
              <TabsTrigger value="semanal">Semanal</TabsTrigger>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
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

          <div className="space-y-2">
            <FilterRow label="Sistema" value={sistemaF} options={sistemas} onChange={setSistemaF} />
            <FilterRow
              label="Criticidade"
              value={critF}
              options={criticidades}
              onChange={setCritF}
              colorFor={(v) =>
                v === "AA" ? "border-destructive/40 text-destructive"
                : v === "A" ? "border-warning/40 text-warning"
                : "border-primary/30 text-primary"
              }
            />
            <FilterRow label="Executante" value={execF} options={executantes} onChange={setExecF} />
          </div>

          {/* DIÁRIA */}
          <TabsContent value="diaria" className="m-0 space-y-3">
            <DateNav
              icon={Calendar}
              label={diaDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              onPrev={() => shiftDay(-1)}
              onNext={() => shiftDay(1)}
              control={
                <Input
                  type="date"
                  value={diaSel}
                  onChange={(e) => setDiaSel(e.target.value)}
                  className="h-8 w-40 border-border/60 bg-card/50 text-xs"
                />
              }
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title={`PROGRAMADO · ${diaProg.length} OS`}
                subtitle={`${formatBRNumber(sumHH(diaProg), 1)} HH alocados`}
              >
                <OsGroupedByExecutante rows={diaProg} emptyLabel="Nenhuma OS programada para esse dia" />
              </Panel>
              <Panel
                title={`EXECUTADO · ${diaExec.length} OS`}
                subtitle={`${formatBRNumber(sumHH(diaExec), 1)} HH realizados`}
              >
                <OsGroupedByExecutante rows={diaExec} emptyLabel="Nenhuma execução nesse dia" />
              </Panel>
            </div>
          </TabsContent>

          {/* SEMANAL */}
          <TabsContent value="semanal" className="m-0 space-y-3">
            <DateNav
              icon={Calendar}
              label={`Semana de ${semInicio.toLocaleDateString("pt-BR")} a ${semFim.toLocaleDateString("pt-BR")}`}
              onPrev={() => shiftWeek(-1)}
              onNext={() => shiftWeek(1)}
              control={
                <Input
                  type="date"
                  value={semanaSel}
                  onChange={(e) => setSemanaSel(fmtISO(getWeekStart(isoToDate(e.target.value))))}
                  className="h-8 w-40 border-border/60 bg-card/50 text-xs"
                />
              }
            />
            <div className="grid gap-2 md:grid-cols-7">
              {diasSemana.map((d) => {
                const dayRows = rowsSemana.filter((r) => r._date && sameDay(r._date, d));
                const prog = dayRows.filter((r) => PROGRAMADO_STATUSES.includes(r._status));
                const exec = dayRows.filter((r) => EXECUTADO_STATUSES.includes(r._status));
                const isToday = sameDay(d, today);
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "rounded-lg border bg-card/40 p-2",
                      isToday ? "border-primary/60 shadow-[0_0_10px_oklch(0.72_0.18_240/0.25)]" : "border-border/50",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                        {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                      </span>
                      <span className="num text-[11px] font-bold text-foreground">
                        {String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <Stat label="Prog." value={prog.length} tone="primary" />
                      <Stat label="Exec." value={exec.length} tone="success" />
                      <Stat label="HH" value={formatBRNumber(dayRows.reduce((s, r) => s + (r.HH || 0), 0), 1)} tone="muted" />
                    </div>
                  </div>
                );
              })}
            </div>
            <Panel title={`OS DA SEMANA · ${rowsSemana.length}`}>
              <OsGroupedByDate rows={rowsSemana} emptyLabel="Nenhuma OS nessa semana" />
            </Panel>
          </TabsContent>

          {/* MENSAL */}
          <TabsContent value="mensal" className="m-0 space-y-3">
            <DateNav
              icon={Calendar}
              label={mesInicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
              control={
                <Input
                  type="month"
                  value={mesSel}
                  onChange={(e) => setMesSel(e.target.value)}
                  className="h-8 w-40 border-border/60 bg-card/50 text-xs"
                />
              }
            />
            <div className="grid gap-3 md:grid-cols-3">
              <KpiBox label="OS no mês" value={rowsMes.length} />
              <KpiBox label="HH alocados" value={formatBRNumber(sumHH(rowsMes), 1)} />
              <KpiBox
                label="% Executado"
                value={
                  rowsMes.length > 0
                    ? `${Math.round((rowsMes.filter((r) => EXECUTADO_STATUSES.includes(r._status)).length / rowsMes.length) * 100)}%`
                    : "—"
                }
              />
            </div>
            <Panel title="DISTRIBUIÇÃO DIÁRIA DO MÊS">
              <CalendarHeatmap days={diasMes} today={today} />
            </Panel>
            <Panel title={`OS DO MÊS · ${rowsMes.length}`}>
              <OsGroupedByDate rows={rowsMes} emptyLabel="Nenhuma OS nesse mês" />
            </Panel>
          </TabsContent>

          {/* TABELA */}
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

function DateNav({
  icon: Icon,
  label,
  onPrev,
  onNext,
  control,
}: {
  icon: typeof Calendar;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span className="capitalize">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {control}
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "primary" | "success" | "muted" }) {
  const cls =
    tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num font-semibold", cls)}>{value}</span>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function CalendarHeatmap({ days, today }: { days: { date: Date; total: number; prog: number; exec: number; hh: number }[]; today: Date }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div className="grid grid-cols-7 gap-1 sm:grid-cols-14 md:grid-cols-[repeat(16,minmax(0,1fr))]">
      {days.map((d) => {
        const intensity = d.total / max;
        const isToday = sameDay(d.date, today);
        return (
          <div
            key={d.date.toISOString()}
            title={`${d.date.toLocaleDateString("pt-BR")} · ${d.total} OS · ${formatBRNumber(d.hh, 1)}h`}
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded border text-[10px]",
              isToday ? "border-primary" : "border-border/40",
            )}
            style={{
              background:
                d.total === 0
                  ? "transparent"
                  : `oklch(0.45 0.18 240 / ${0.15 + intensity * 0.65})`,
            }}
          >
            <span className="font-bold text-foreground">{d.date.getDate()}</span>
            {d.total > 0 && <span className="num text-[9px] text-muted-foreground">{d.total}</span>}
          </div>
        );
      })}
    </div>
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

function OsGroupedByDate({ rows, emptyLabel }: { rows: EnrichedRow[]; emptyLabel: string }) {
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
      return da - db;
    });
  }, [rows]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="sticky top-0 z-10 mb-1.5 flex items-center justify-between rounded-md border border-border/40 bg-card/80 px-2 py-1 backdrop-blur">
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">📅 {date}</span>
            <span className="text-[10px] text-muted-foreground">
              {items.length} OS · {formatBRNumber(items.reduce((s, r) => s + (r.HH || 0), 0), 1)}h
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((r) => <OsCard key={`${r.NumeroOS}-${r._status}`} row={r} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OsGroupedByExecutante({ rows, emptyLabel }: { rows: EnrichedRow[]; emptyLabel: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, EnrichedRow[]>();
    rows.forEach((r) => {
      const k = r.Executante || "Sem executante";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
      {groups.map(([exe, items]) => (
        <div key={exe}>
          <div className="sticky top-0 z-10 mb-1.5 flex items-center justify-between rounded-md border border-border/40 bg-card/80 px-2 py-1 backdrop-blur">
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">👤 {exe}</span>
            <span className="text-[10px] text-muted-foreground">
              {items.length} OS · {formatBRNumber(items.reduce((s, r) => s + (r.HH || 0), 0), 1)}h
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((r) => <OsCard key={`${r.NumeroOS}-${r._status}`} row={r} />)}
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
        {r.DataReprogramada && <span>↻ <span className="num text-warning">{r.DataReprogramada}</span></span>}
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
