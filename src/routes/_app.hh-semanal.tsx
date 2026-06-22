import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import { formatBRNumber } from "@/lib/format";
import { AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/hh-semanal")({
  component: HHPage,
});

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function HHPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const pdfRef = useRef<HTMLDivElement>(null);


  if (isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );

  if (!data) return null;

  // Soma HH alocado por cargo
  const alocadoByCargo = new Map<string, number>();
  for (const p of data.programacao) {
    const key = normalize(p.Cargo);
    if (!key) continue;
    alocadoByCargo.set(key, (alocadoByCargo.get(key) ?? 0) + (p.HH || 0));
  }

  const rows = data.parametrosHH.map((param) => {
    const key = normalize(param.Cargo);
    const alocado = alocadoByCargo.get(key) ?? 0;
    const disponivel = param.HH_Semana || 0;
    const saldo = disponivel - alocado;
    const ocupacao = disponivel > 0 ? (alocado / disponivel) * 100 : 0;
    return { cargo: param.Cargo, disponivel, alocado, saldo, ocupacao };
  });

  const totalDisp = rows.reduce((s, r) => s + r.disponivel, 0);
  const totalAloc = rows.reduce((s, r) => s + r.alocado, 0);
  const totalOc = totalDisp > 0 ? (totalAloc / totalDisp) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">HH Semanal</h1>
          <p className="text-xs text-muted-foreground">
            Capacidade vs alocação de horas-homem por cargo
          </p>
        </div>
        <ExportButton
          filename="hh-semanal"
          rows={rows}
          columns={[
            { header: "Cargo", value: (r) => r.cargo },
            { header: "Disponível (h)", value: (r) => Number(r.disponivel.toFixed(2)) },
            { header: "Alocado (h)", value: (r) => Number(r.alocado.toFixed(2)) },
            { header: "Saldo (h)", value: (r) => Number(r.saldo.toFixed(2)) },
            { header: "Ocupação (%)", value: (r) => Number(r.ocupacao.toFixed(2)) },
          ]}
        />
      </div>

      <Panel title="OCUPAÇÃO TOTAL DA EQUIPE">
        <Gauge
          label="Capacidade semanal global"
          disponivel={totalDisp}
          alocado={totalAloc}
          ocupacao={totalOc}
          large
        />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Panel key={r.cargo} title={r.cargo}>
            <Gauge
              label="HH"
              disponivel={r.disponivel}
              alocado={r.alocado}
              ocupacao={r.ocupacao}
            />
          </Panel>
        ))}
        {rows.length === 0 && (
          <Panel>
            <p className="text-sm text-muted-foreground">Sem parâmetros de HH cadastrados.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Gauge({
  label,
  disponivel,
  alocado,
  ocupacao,
  large,
}: {
  label: string;
  disponivel: number;
  alocado: number;
  ocupacao: number;
  large?: boolean;
}) {
  const color =
    ocupacao > 100 ? "bg-destructive" : ocupacao > 60 ? "bg-warning" : "bg-success";
  const textColor =
    ocupacao > 100 ? "text-destructive" : ocupacao > 60 ? "text-warning" : "text-success";
  const saldo = disponivel - alocado;
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
          <div className={cn("num font-bold", large ? "text-5xl" : "text-3xl", textColor)}>
            {formatBRNumber(ocupacao, 1)}%
          </div>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <div>
            <span className="num text-foreground">{formatBRNumber(alocado, 1)}h</span> alocado
          </div>
          <div>
            <span className="num text-foreground">{formatBRNumber(disponivel, 1)}h</span> disponível
          </div>
          <div className={cn("font-medium", saldo < 0 ? "text-destructive" : "text-success")}>
            saldo: <span className="num">{formatBRNumber(saldo, 1)}h</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-background/60">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${Math.min(ocupacao, 100)}%` }}
        />
      </div>
      {ocupacao > 100 && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
          <AlertOctagon className="h-3.5 w-3.5" />
          Sobrecarga: equipe acima da capacidade semanal
        </div>
      )}
    </div>
  );
}
