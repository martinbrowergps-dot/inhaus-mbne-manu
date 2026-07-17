import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Thermometer,
  CalendarX,
  ClipboardX,
  Timer,
} from "lucide-react";
import { sheetsQueryOptions } from "@/lib/sheets";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import { summarizeLocais, computeDurationAlerts } from "@/lib/temperature";
import { formatBRNumber, parseBRDate, formatDateBR } from "@/lib/format";
import { useDateFilter } from "@/hooks/use-date-filter";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/section-header";
import { PageHeader } from "@/components/page-header";
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
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function AlertasPage() {
  const { data, isLoading } = useQuery(sheetsQueryOptions);
  const dateFilter = useDateFilter();

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

  const prevAlertCount = (() => {
    try {
      const raw = localStorage.getItem("alertas_prev");
      if (raw) return JSON.parse(raw) as { total: number; ts: number };
    } catch { /* ignore */ }
    return null;
  })();

  // Temperaturas fora da faixa
  const medicoesFiltradas = (data.medicoes ?? []).filter((m) =>
    dateFilter.filterByDateRange(m.DATA),
  );
  const locais = summarizeLocais(medicoesFiltradas);
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

  // Violação por duração (>4h fora da faixa)
  const durationAlertsMap = computeDurationAlerts(medicoesFiltradas);
  for (const [local, dur] of durationAlertsMap) {
    if (dur.isViolation) {
      alerts.push({
        id: `temp-duracao-${local}`,
        icon: Timer,
        title: `Temperatura fora da faixa há mais de 4h: ${local}`,
        desc: `Há ${dur.currentDurationLabel} com temperatura fora do range permitido`,
        prio: "alta",
        when: undefined,
      });
    }
  }

  // HH sobrecarregado
  const programacaoFiltrada = (data.programacao ?? []).filter((p) =>
    dateFilter.filterByDateRange(p.DataReprogramada || p.DataProgramada),
  );
  const alocadoByCargo = new Map<string, number>();
  for (const p of programacaoFiltrada) {
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
  for (const p of programacaoFiltrada) {
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
  for (const p of programacaoFiltrada) {
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
  const checklistAll = [
    ...(data.checklistDocas ?? []),
    ...(data.checklistGeral ?? []),
    ...(data.checklistPortas ?? []),
  ].filter((r) => dateFilter.filterByDateRange(r.Data));
  const hasChecklistToday = checklistAll.some((r) => r.Data?.startsWith(todayKey));
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
  const passagemFiltrada = (data.passagemTurno ?? []).filter((p) =>
    dateFilter.filterByDateRange(p.Data),
  );
  const hasPassagemToday = passagemFiltrada.some((p) => p.Data?.startsWith(todayKey));
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

  const newAlerts = prevAlertCount ? alerts.length - prevAlertCount.total : 0;

  useEffect(() => {
    try {
      localStorage.setItem(
        "alertas_prev",
        JSON.stringify({ total: alerts.length, ts: Date.now() }),
      );
    } catch { /* ignore */ }
  }, [alerts.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Alertas"
        subtitle={
          (prevAlertCount
            ? `Última verificação: ${new Date(prevAlertCount.ts).toLocaleString("pt-BR")} · ${prevAlertCount.total} alertas · `
            : "") + "Alertas gerados automaticamente a partir das condições operacionais"
        }
        filterBadge={
          dateFilter.isActive ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
              {formatDateBR(dateFilter.startDate)} – {formatDateBR(dateFilter.endDate)}
            </span>
          ) : newAlerts > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              {newAlerts} novo{newAlerts !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
        exportButton={
          <ExportButton
            filename="alertas"
            rows={alerts}
            columns={[
              { header: "Prioridade", value: (a) => a.prio.toUpperCase() },
              { header: "Título", value: (a) => a.title },
              { header: "Descrição", value: (a) => a.desc },
              { header: "Referência", value: (a) => a.when ?? "" },
            ]}
            pdfTitle="Central de Alertas · Centro de Controle"
            pdfSubtitle={
              dateFilter.isActive
                ? `${formatDateBR(dateFilter.startDate)} a ${formatDateBR(dateFilter.endDate)}`
                : undefined
            }
          />
        }
      />

      <SectionHeader
        label="Resumo"
        insight={`${alerts.length} alertas ativos · ${counts.alta} alta · ${counts.media} média · ${counts.baixa} baixa`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryChip label="ALTA" value={counts.alta} variant="danger" />
          <SummaryChip label="MÉDIA" value={counts.media} variant="warning" />
          <SummaryChip label="BAIXA" value={counts.baixa} variant="success" />
        </div>
      </SectionHeader>

      <SectionHeader
        label="Detalhamento"
        insight={
          alerts.length > 0 ? `${alerts.length} alertas requerem atenção` : "Tudo sob controle"
        }
      >
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
      </SectionHeader>
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
      <div className="text-[11px] tracking-[0.18em] uppercase opacity-80">PRIORIDADE {label}</div>
      <div className="num mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function alertHref(id: string): string | undefined {
  if (id.startsWith("temp")) return "/temperaturas";
  if (id.startsWith("hh")) return "/hh-semanal";
  if (id.startsWith("os-aa") || id.startsWith("os-late")) return "/programacao";
  if (id === "no-checklist") return "/checklists";
  if (id === "no-passagem") return "/passagem-turno";
  return undefined;
}

function AlertItem({ alert }: { alert: Alerta }) {
  const Icon = alert.icon;
  const href = alertHref(alert.id);
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

  const body = (
    <>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{alert.title}</p>
          {alert.when && (
            <span className="num text-[11px] text-muted-foreground">{alert.when}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.desc}</p>
      </div>
      {href && (
        <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Ver →
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <li>
        <Link
          to={href}
          className={cn(
            "group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/60 hover:bg-primary/[0.04]",
            styles,
          )}
        >
          {body}
        </Link>
      </li>
    );
  }

  return <li className={cn("flex items-start gap-3 rounded-lg border p-3", styles)}>{body}</li>;
}
