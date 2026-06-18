import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Thermometer,
  CalendarX,
  ClipboardX,
} from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeLocais } from "@/lib/temperature";
import { formatBRNumber, parseBRDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_app/alertas")({
  component: AlertasPage,
});

type Prio = "alta" | "media" | "baixa";

interface Alerta {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  prio: Prio;
  when?: string;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function AlertasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );

  if (!data) return null;

  const alerts: Alerta[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Temperaturas fora da faixa
  const locais = summarizeLocais(data.medicoes);
  for (const l of locais) {
    if (l.status === "critico") {
      alerts.push({
        id: `temp-${l.local}`,
        icon: Thermometer,
        title: `Temperatura crítica em ${l.local}`,
        desc: `Leitura ${l.temperatura}°C fora da faixa permitida`,
        prio: "alta",
        when: l.tecnico,
      });
    } else if (l.status === "alerta") {
      alerts.push({
        id: `temp-${l.local}`,
        icon: Thermometer,
        title: `Temperatura em alerta em ${l.local}`,
        desc: `Leitura ${l.temperatura}°C próxima do limite`,
        prio: "media",
        when: l.tecnico,
      });
    }
  }

  // HH sobrecarregado
  const alocadoByCargo = new Map<string, number>();
  for (const p of data.programacao) {
    const k = normalize(p.Cargo);
    if (k) alocadoByCargo.set(k, (alocadoByCargo.get(k) ?? 0) + (p.HH || 0));
  }
  for (const p of data.parametrosHH) {
    const aloc = alocadoByCargo.get(normalize(p.Cargo)) ?? 0;
    const oc = p.HH_Semana > 0 ? (aloc / p.HH_Semana) * 100 : 0;
    if (oc > 100) {
      alerts.push({
        id: `hh-${p.Cargo}`,
        icon: Clock,
        title: `Sobrecarga de HH: ${p.Cargo}`,
        desc: `Ocupação ${formatBRNumber(oc, 1)}% • alocado ${formatBRNumber(aloc, 1)}h de ${formatBRNumber(p.HH_Semana, 1)}h`,
        prio: "alta",
      });
    }
  }

  // OS AA pendentes
  for (const p of data.programacao) {
    if (p.Criticidade?.toUpperCase() === "AA" && !/finaliz|conclu/i.test(p.StatusExecucao)) {
      alerts.push({
        id: `os-aa-${p.NumeroOS}`,
        icon: AlertOctagon,
        title: `OS AA pendente: ${p.NumeroOS}`,
        desc: `${p.Descricao} • ${p.Sistema}`,
        prio: "alta",
        when: p.DataProgramada,
      });
    }
  }

  // OS atrasadas
  for (const p of data.programacao) {
    const d = parseBRDate(p.DataProgramada);
    if (d && d < today && !/finaliz|conclu/i.test(p.StatusExecucao)) {
      alerts.push({
        id: `os-late-${p.NumeroOS}`,
        icon: CalendarX,
        title: `OS atrasada: ${p.NumeroOS}`,
        desc: `${p.Descricao}`,
        prio: "media",
        when: p.DataProgramada,
      });
    }
  }

  // Falta de checklist diário (hoje)
  const todayKey = today.toLocaleDateString("pt-BR");
  const hasChecklistToday = [
    ...data.checklistDocas,
    ...data.checklistGeral,
    ...data.checklistPortas,
  ].some((r) => r.Data?.startsWith(todayKey));
  if (!hasChecklistToday) {
    alerts.push({
      id: "no-checklist",
      icon: ClipboardX,
      title: "Sem checklist registrado hoje",
      desc: "Nenhuma inspeção de docas, geral ou portas registrada nas últimas horas",
      prio: "media",
    });
  }

  // Falta passagem de turno hoje
  const hasPassagemToday = data.passagemTurno.some((p) => p.Data?.startsWith(todayKey));
  if (!hasPassagemToday && data.passagemTurno.length > 0) {
    alerts.push({
      id: "no-passagem",
      icon: AlertTriangle,
      title: "Sem passagem de turno hoje",
      desc: "Nenhuma passagem de turno registrada no dia",
      prio: "media",
    });
  }

  const order: Record<Prio, number> = { alta: 0, media: 1, baixa: 2 };
  alerts.sort((a, b) => order[a.prio] - order[b.prio]);

  const counts = {
    alta: alerts.filter((a) => a.prio === "alta").length,
    media: alerts.filter((a) => a.prio === "media").length,
    baixa: alerts.filter((a) => a.prio === "baixa").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Central de Alertas</h1>
        <p className="text-xs text-muted-foreground">
          Alertas gerados automaticamente a partir das condições operacionais
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryChip label="ALTA" value={counts.alta} variant="danger" />
        <SummaryChip label="MÉDIA" value={counts.media} variant="warning" />
        <SummaryChip label="BAIXA" value={counts.baixa} variant="success" />
      </div>

      <Panel title={`${alerts.length} ALERTAS ATIVOS`}>
        {alerts.length === 0 ? (
          <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-success">
            Tudo sob controle — nenhum alerta ativo no momento.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <AlertItem key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "danger" | "warning" | "success";
}) {
  const cls = {
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-warning",
    success: "border-success/40 bg-success/10 text-success",
  }[variant];
  return (
    <div className={cn("panel rounded-xl border p-4", cls)}>
      <div className="text-[10px] tracking-[0.18em] uppercase opacity-80">PRIORIDADE {label}</div>
      <div className="num mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function AlertItem({ alert }: { alert: Alerta }) {
  const Icon = alert.icon;
  const styles = {
    alta: "border-destructive/40 bg-destructive/10",
    media: "border-warning/40 bg-warning/10",
    baixa: "border-primary/40 bg-primary/10",
  }[alert.prio];
  const iconColor = {
    alta: "text-destructive",
    media: "text-warning",
    baixa: "text-primary",
  }[alert.prio];

  return (
    <li className={cn("flex items-start gap-3 rounded-lg border p-3", styles)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{alert.title}</p>
          {alert.when && <span className="num text-[10px] text-muted-foreground">{alert.when}</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.desc}</p>
      </div>
    </li>
  );
}
