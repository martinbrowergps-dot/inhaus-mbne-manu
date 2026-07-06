import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, DoorOpen, Activity } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { sheetsQueryOptions } from "@/lib/sheets";
import { useDateFilter } from "@/hooks/use-date-filter";
import type { ChecklistRow } from "@/lib/sheets-types";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { ExportButton } from "@/components/export-button";
import { renderReportPdf } from "@/lib/pdf-report";
import type { ReportData, ReportTable } from "@/lib/pdf-report";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/section-header";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import { formatBRNumber } from "@/lib/format";

export const Route = createFileRoute("/_app/checklists")({
  component: ChecklistsPage,
});

interface ChecklistEnriched extends ChecklistRow {
  _tipo: string;
  _equipamento: string;
  _descricao: string;
  _sistema: string;
  _tag: string;
  _criticidade: string;
  _tipoAtividade: string;
  _periodicidade: string;
  _cargo: string;
  _hh: string;
}

function enrich(rows: ChecklistRow[], tipo: string): ChecklistEnriched[] {
  return rows.map((r) => ({
    ...r,
    _tipo: tipo,
    _equipamento: r.raw["Equipamento/Máquina"] || "—",
    _descricao: r.raw["Descrição da Atividade"] || r.raw["Descricao da Atividade"] || "—",
    _sistema: r.raw["Sistema"] || "—",
    _tag: r.raw["TAG"] || "—",
    _criticidade: r.raw["Criticidade"] || "—",
    _tipoAtividade: r.raw["Tipo"] || "—",
    _periodicidade: r.raw["Periodicidade"] || "—",
    _cargo: r.raw["Cargo"] || "—",
    _hh: r.raw["HH_Estimado"] || r.raw["HH Estimado"] || "—",
  }));
}

const detailCols: ColumnDef<ChecklistEnriched>[] = [
  { accessorKey: "_tipo", header: "Tipo" },
  { accessorKey: "Item", header: "Item", accessorFn: (r) => r.raw["Item"] || "" },
  {
    accessorKey: "_descricao",
    header: "Atividade",
    cell: ({ getValue }) => (
      <span className="line-clamp-1 max-w-[260px]">{getValue() as string}</span>
    ),
  },
  { accessorKey: "_equipamento", header: "Equipamento" },
  { accessorKey: "_sistema", header: "Sistema" },
  { accessorKey: "_tag", header: "TAG" },
  {
    accessorKey: "_criticidade",
    header: "Crit.",
    cell: ({ getValue }) => {
      const v = (getValue() as string).toUpperCase();
      const color =
        v === "AA"
          ? "text-destructive border-destructive/40"
          : v === "A"
            ? "text-warning border-warning/40"
            : "text-primary border-primary/30";
      return (
        <Badge variant="outline" className={cn("text-[10px] font-bold", color)}>
          {v}
        </Badge>
      );
    },
  },
  { accessorKey: "_tipoAtividade", header: "Tipo Ativ." },
  { accessorKey: "_periodicidade", header: "Period." },
  { accessorKey: "_cargo", header: "Cargo" },
  { accessorKey: "_hh", header: "HH Est." },
];

function ChecklistsPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();
  const [tab, setTab] = useState("docas");

  if (isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );

  const docas = enrich(data?.checklistDocas ?? [], "Docas");
  const geral = enrich(data?.checklistGeral ?? [], "Geral");
  const portas = enrich(data?.checklistPortas ?? [], "Portas");

  const allRows = [...docas, ...geral, ...portas];

  const parseHH = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };
  const hhDocas = docas.reduce((s, r) => s + parseHH(r._hh), 0);
  const hhGeral = geral.reduce((s, r) => s + parseHH(r._hh), 0);
  const hhPortas = portas.reduce((s, r) => s + parseHH(r._hh), 0);
  const distTipo = [
    { name: "Docas", count: docas.length, hh: Number(hhDocas.toFixed(1)) },
    { name: "Geral", count: geral.length, hh: Number(hhGeral.toFixed(1)) },
    { name: "Portas", count: portas.length, hh: Number(hhPortas.toFixed(1)) },
  ];

  const handleExportReport = async () => {
    const chartEls = document.querySelector<HTMLElement>('[data-page="checklists"]')?.querySelectorAll<HTMLElement>("[data-chart]");
    const charts = chartEls ? Array.from(chartEls) : [];

    const table: ReportTable<ChecklistEnriched> = {
      title: "Planos — Registro",
      columns: [
        { header: "Tipo", value: (r) => r._tipo },
        { header: "Item", value: (r) => r.raw["Item"] ?? "" },
        { header: "Equipamento", value: (r) => r._equipamento },
        { header: "Atividade", value: (r) => r._descricao },
        { header: "Sistema", value: (r) => r._sistema },
        { header: "TAG", value: (r) => r._tag },
        { header: "Criticidade", value: (r) => r._criticidade },
        { header: "Periodicidade", value: (r) => r._periodicidade },
        { header: "Cargo", value: (r) => r._cargo },
        { header: "HH Estimado", value: (r) => r._hh },
      ],
      rows: allRows,
    };

    const totalHH = hhDocas + hhGeral + hhPortas;
    const reportData: ReportData = {
      title: "Planos de Manutenção · Centro de Controle",
      metrics: [
        { label: "Total de itens", value: String(allRows.length), variant: "primary" },
        { label: "HH Estimado", value: `${formatBRNumber(totalHH, 1)}h`, variant: "primary" },
        { label: "Docas", value: String(docas.length), variant: "neutral" },
        { label: "Geral", value: String(geral.length), variant: "neutral" },
        { label: "Portas", value: String(portas.length), variant: "neutral" },
      ],
      tables: [table],
    };

    try {
      await renderReportPdf(reportData, charts, {
        filename: "planos-manutencao",
        orientation: "landscape",
      });
    } catch (err) {
      console.error("Erro ao exportar planos:", err);
    }
  };

  return (
    <div data-page="checklists" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="fade-up text-xl font-bold tracking-tight">Planos de Manutenção</h1>
          <p className="text-xs text-muted-foreground">
            Planos preventivos — docas, áreas gerais e portas
          </p>
        </div>
        <ExportButton
          filename="checklists"
          rows={allRows}
          columns={[
            { header: "Tipo", value: (r) => r._tipo },
            { header: "Item", value: (r) => r.raw["Item"] ?? "" },
            { header: "Equipamento", value: (r) => r._equipamento },
            { header: "Atividade", value: (r) => r._descricao },
            { header: "Sistema", value: (r) => r._sistema },
            { header: "TAG", value: (r) => r._tag },
            { header: "Criticidade", value: (r) => r._criticidade },
            { header: "Tipo", value: (r) => r._tipoAtividade },
            { header: "Periodicidade", value: (r) => r._periodicidade },
            { header: "Cargo", value: (r) => r._cargo },
            { header: "HH Estimado", value: (r) => r._hh },
          ]}
          onExecutiveSummary={handleExportReport}
        />
      </div>

      <SectionHeader label="Distribuição por Tipo" insight={`${allRows.length} itens no total · ${formatBRNumber(hhDocas + hhGeral + hhPortas, 1)}h HH estimado`}>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel dataChart="itens-tipo" title="ITENS POR TIPO">
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={distTipo} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => `${e.name}: ${e.value}`} labelLine={false}>
                    {distTipo.map((_, i) => <Cell key={i} fill={["#0EA5FF", "#22C55E", "#EAB308"][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel dataChart="hh-tipo" title="HH ESTIMADO POR TIPO" className="lg:col-span-2">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={distTipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${formatBRNumber(v, 1)}h`, "HH"]} />
                  <Bar dataKey="hh" radius={[4, 4, 0, 0]}>
                    {distTipo.map((_, i) => <Cell key={i} fill={["#0EA5FF", "#22C55E", "#EAB308"][i]} />)}
                    <LabelList position="top" fill="#94A3B8" fontSize={10} formatter={(v: number) => v > 0 ? formatBRNumber(v, 1) : ""} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </SectionHeader>

      <SectionHeader label="Planos por Tipo" insight={`Navegue pelos planos de docas, áreas gerais e portas`}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="docas">Docas ({docas.length})</TabsTrigger>
          <TabsTrigger value="geral">Geral ({geral.length})</TabsTrigger>
          <TabsTrigger value="portas">Portas ({portas.length})</TabsTrigger>
        </TabsList>

        {(
          [
            ["docas", docas, DoorOpen],
            ["geral", geral, ClipboardCheck],
            ["portas", portas, Activity],
          ] as const
        ).map(([key, rows, Icon]) => (
          <TabsContent key={key} value={key} className="m-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={<Icon className="h-4 w-4" />}
                label="Total de itens"
                value={rows.length}
              />
              <SummaryCard
                icon={
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                    AA
                  </Badge>
                }
                label="Criticidade AA"
                value={rows.filter((r) => r._criticidade.toUpperCase() === "AA").length}
              />
              <SummaryCard
                icon={
                  <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">
                    h
                  </Badge>
                }
                label="Cargos distintos"
                value={new Set(rows.map((r) => r._cargo).filter((c) => c !== "—")).size}
              />
            </div>

            <Panel title={`ITENS · ${rows.length}`}>
              <DataTable
                data={rows}
                columns={detailCols}
                searchPlaceholder="Buscar equipamento, TAG, descrição…"
                pageSize={15}
              />
            </Panel>
          </TabsContent>
        ))}
      </Tabs>
      </SectionHeader>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
        <div className="num text-xl font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}
