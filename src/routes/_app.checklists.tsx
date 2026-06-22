import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, DoorOpen, Activity, ArrowLeftRight } from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import type { ChecklistRow } from "@/lib/sheets-types";

export const Route = createFileRoute("/_app/checklists")({
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  if (isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );

  const allRows = [
    ...(data?.checklistDocas ?? []).map((r) => ({ Tipo: "Docas", ...r })),
    ...(data?.checklistGeral ?? []).map((r) => ({ Tipo: "Geral", ...r })),
    ...(data?.checklistPortas ?? []).map((r) => ({ Tipo: "Portas", ...r })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Checklists Operacionais</h1>
          <p className="text-xs text-muted-foreground">
            Inspeções de docas, áreas gerais, portas e passagens de turno
          </p>
        </div>
        <ExportButton
          filename="checklists"
          rows={allRows}
          columns={[
            { header: "Tipo", value: (r) => r.Tipo },
            { header: "ID", value: (r) => r.ID },
            { header: "Data", value: (r) => r.Data },
            { header: "Local", value: (r) => r.Local ?? "" },
            { header: "Responsável", value: (r) => r.Responsavel ?? "" },
          ]}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChecklistPanel
          title="CHECKLIST DOCAS"
          icon={<DoorOpen className="h-4 w-4" />}
          rows={data?.checklistDocas ?? []}
        />
        <ChecklistPanel
          title="CHECKLIST GERAL"
          icon={<ClipboardCheck className="h-4 w-4" />}
          rows={data?.checklistGeral ?? []}
        />
        <ChecklistPanel
          title="CHECKLIST PORTAS"
          icon={<Activity className="h-4 w-4" />}
          rows={data?.checklistPortas ?? []}
        />
        <ChecklistPanel
          title="PASSAGENS DE TURNO"
          icon={<ArrowLeftRight className="h-4 w-4" />}
          rows={(data?.passagemTurno ?? []).map((p) => ({
            ID: p.ID ?? "",
            Data: p.Data,
            Local: p.Turno,
            Responsavel: p.Supervisor,
            raw: p as unknown as Record<string, string>,
          }))}
        />
      </div>
    </div>
  );
}

function ChecklistPanel({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: ChecklistRow[];
}) {
  return (
    <Panel title={title}>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="num text-2xl font-bold text-foreground">{rows.length}</span>
        <span>inspeções registradas</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem registros</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((r, i) => (
            <li
              key={r.ID || i}
              className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  {r.Local || r.Responsavel || r.ID || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">{r.Responsavel || "—"}</div>
              </div>
              <div className="num text-[10px] text-muted-foreground">{r.Data || "—"}</div>
            </li>
          ))}
          {rows.length > 6 && (
            <li className="pt-1 text-center text-[10px] text-muted-foreground">
              + {rows.length - 6} registros
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}
