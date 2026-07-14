import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { ExportButton } from "@/components/export-button";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatBRNumber, parseBRDate, getWeekStart, formatDateBR } from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/section-header";
import {
  deriveExecStatus,
  EXECUTADO_STATUSES,
  PROGRAMADO_STATUSES,
  type ExecStatus,
} from "@/lib/status";
import {
  EnrichedRow,
  daysOverdue,
  fmtISO,
  isoToDate,
  sameDay,
} from "@/components/programacao/types";
import { DateNav } from "@/components/programacao/date-nav";
import { Stat } from "@/components/programacao/stat";
import { FilterRow } from "@/components/programacao/filter-row";
import { SummaryCards } from "@/components/programacao/summary-cards";
import { KpiCard } from "@/components/kpi-card";
import { OsGroupedByDate, OsGroupedByExecutante } from "@/components/programacao/os-grouped";
import { CalendarHeatmap } from "@/components/programacao/calendar-heatmap";
import { HhComparisonChart } from "@/components/programacao/hh-comparison-chart";

export const Route = createFileRoute("/_app/programacao")({
  component: ProgramacaoPage,
});

const fullCols: ColumnDef<EnrichedRow>[] = [
  {
    accessorKey: "NumeroOS",
    header: "Nº OS",
    cell: ({ getValue }) => <span className="id">{getValue() as string}</span>,
  },
  { accessorKey: "DataProgramada", header: "Data" },
  { accessorKey: "Sistema", header: "Sistema" },
  {
    accessorKey: "Descricao",
    header: "Descrição",
    cell: ({ getValue }) => (
      <span className="line-clamp-1 max-w-[280px]">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "Criticidade",
    header: "Crit.",
    cell: ({ getValue }) => {
      const v = (getValue() as string)?.toUpperCase();
      const color =
        v === "AA"
          ? "bg-destructive/20 text-destructive border-destructive/40"
          : v === "A"
            ? "bg-warning/20 text-warning border-warning/40"
            : "bg-primary/15 text-primary border-primary/30";
      return (
        <Badge variant="outline" className={`${color} text-[10px] font-bold`}>
          {v || "—"}
        </Badge>
      );
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
    accessorKey: "Tipo",
    header: "Tipo",
    cell: ({ getValue }) => {
      const v = (getValue() as string) || "—";
      const isQuebra = v.toUpperCase() === "QUEBRA DE PROGRAMAÇÃO";
      return (
        <span
          className={
            isQuebra
              ? "text-destructive font-semibold text-[10px]"
              : "text-muted-foreground text-[10px]"
          }
        >
          {isQuebra ? (
            <>
              <AlertTriangle className="mr-0.5 inline h-3 w-3" />
              QUEBRA
            </>
          ) : (
            v
          )}
        </span>
      );
    },
  },
  { accessorKey: "LocalMacro", header: "Local" },
  {
    accessorKey: "_status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue() as ExecStatus} />,
  },
];

function ProgramacaoPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const [q, setQ] = useState("");
  const [sistemaF, setSistemaF] = useState<string | null>(null);
  const [critF, setCritF] = useState<string | null>(null);
  const [execF, setExecF] = useState<string | null>(null);
  const [tipoF, setTipoF] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [diaSel, setDiaSel] = useState<string>(fmtISO(today));
  const [semanaSel, setSemanaSel] = useState<string>(fmtISO(getWeekStart(today)));
  const [mesSel, setMesSel] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );

  const dateFilter = useDateFilter();

  const enriched: EnrichedRow[] = useMemo(
    () =>
      (data?.programacao ?? [])
        .filter((p) => dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada))
        .map((p) => {
          const d = parseBRDate(p.DataProgramada);
          return {
            ...p,
            _status: deriveExecStatus(p),
            _diasAtraso: daysOverdue(d),
            _date: d,
          };
        }),
    [data, dateFilter],
  );

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (sistemaF && r.Sistema !== sistemaF) return false;
      if (critF && (r.Criticidade || "").toUpperCase() !== critF) return false;
      if (execF && r.Executante !== execF) return false;
      if (tipoF && (r.Tipo || "") !== tipoF) return false;
      if (q.trim()) {
        const l = q.toLowerCase();
        if (
          ![r.NumeroOS, r.TAG, r.Descricao, r.Sistema, r.Executante, r.Cargo].some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(l),
          )
        )
          return false;
      }
      return true;
    });
  }, [enriched, q, sistemaF, critF, execF, tipoF]);

  const sumHH = (rows: EnrichedRow[]) => rows.reduce((s, r) => s + (r.HH || 0), 0);

  const sistemas = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Sistema).filter(Boolean))).sort(),
    [enriched],
  );
  const criticidades = useMemo(
    () =>
      Array.from(
        new Set(enriched.map((r) => (r.Criticidade || "").toUpperCase()).filter(Boolean)),
      ).sort(),
    [enriched],
  );
  const executantes = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Executante).filter(Boolean))).sort(),
    [enriched],
  );
  const tipos = useMemo(
    () => Array.from(new Set(enriched.map((r) => r.Tipo).filter((t): t is string => !!t))).sort(),
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Programação</h1>
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
            { header: "Tipo", value: (r) => r.Tipo ?? "" },
            { header: "Local", value: (r) => r.LocalMacro ?? r.Localidade ?? "" },
            { header: "Status", value: (r) => r._status },
          ]}
          pdfTitle="Programação · Centro de Controle"
          pdfSubtitle={
            dateFilter.isActive
              ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)} · ${filtered.length} OS · ${formatBRNumber(sumHH(filtered), 1)} HH`
              : `${filtered.length} OS · ${formatBRNumber(sumHH(filtered), 1)} HH`
          }
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-96" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid gap-2 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <SectionHeader
            label="Panorama"
            insight={`${filtered.length} OS no período · ${filtered.filter((r) => r._status === "Programada").length} programadas · ${filtered.filter((r) => r._status === "Em execução").length} em execução · ${filtered.filter((r) => r._status === "Finalizada").length} finalizadas · ${formatBRNumber(sumHH(filtered), 1)}h HH`}
          >
            <SummaryCards filtered={filtered} sumHH={sumHH} />
          </SectionHeader>

          <SectionHeader
            label="HH: Planejado vs Executado"
            insight="Comparativo de horas-homem alocadas vs realizadas por executante"
          >
            <HhComparisonChart rows={filtered} />
          </SectionHeader>

          <SectionHeader
            label="Detalhamento"
            insight={`Navegue pelas visões diária, semanal, mensal ou pela tabela completa`}
          >
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
                <FilterRow label="Tipo" value={tipoF} options={tipos} onChange={setTipoF} />
              </div>

              {/* DIÁRIA */}
              <TabsContent value="diaria" className="m-0 space-y-3">
                <DateNav
                  icon={Calendar}
                  label={diaDate.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  onPrev={() => shiftDay(-1)}
                  onNext={() => shiftDay(1)}
                  control={
                    <Input
                      type="date"
                      value={diaSel}
                      onChange={(e) => setDiaSel(e.target.value)}
                      className="h-9 w-40 border-border/60 bg-card/50 text-xs"
                    />
                  }
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel
                    title={`PROGRAMADO · ${diaProg.length} OS`}
                    subtitle={`${formatBRNumber(sumHH(diaProg), 1)} HH alocados`}
                  >
                    <OsGroupedByExecutante
                      rows={diaProg}
                      emptyLabel="Nenhuma OS programada para esse dia"
                    />
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
                      onChange={(e) =>
                        setSemanaSel(fmtISO(getWeekStart(isoToDate(e.target.value))))
                      }
                      className="h-9 w-40 border-border/60 bg-card/50 text-xs"
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
                          isToday
                            ? "border-primary/60 shadow-[0_0_10px_rgba(14,165,255,0.25)]"
                            : "border-border/50",
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                            {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                          </span>
                          <span className="num text-[11px] font-bold text-foreground">
                            {String(d.getDate()).padStart(2, "0")}/
                            {String(d.getMonth() + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <Stat label="Prog." value={prog.length} tone="primary" />
                          <Stat label="Exec." value={exec.length} tone="success" />
                          <Stat
                            label="HH"
                            value={formatBRNumber(
                              dayRows.reduce((s, r) => s + (r.HH || 0), 0),
                              1,
                            )}
                            tone="muted"
                          />
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
                      className="h-9 w-40 border-border/60 bg-card/50 text-xs"
                    />
                  }
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <KpiCard label="OS no mês" value={rowsMes.length} icon={Calendar} variant="primary" />
                  <KpiCard
                    label="HH alocados"
                    value={formatBRNumber(sumHH(rowsMes), 1)}
                    icon={Clock}
                    variant="neutral"
                  />
                  <KpiCard
                    label="% Executado"
                    value={
                      rowsMes.length > 0
                        ? `${Math.round((rowsMes.filter((r) => EXECUTADO_STATUSES.includes(r._status)).length / rowsMes.length) * 100)}%`
                        : "—"
                    }
                    icon={CheckCircle2}
                    variant="success"
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
                    detailTitle={(r) => r.NumeroOS}
                    detailSubtitle={(r) => r.Descricao}
                  />
                </Panel>
              </TabsContent>
            </Tabs>
          </SectionHeader>
        </>
      )}
    </div>
  );
}
