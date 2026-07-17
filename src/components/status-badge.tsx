import { cn } from "@/lib/utils";
import { STATUS_STYLES, type ExecStatus } from "@/lib/status";
import { CheckCircle2, XCircle, Play, Calendar, PauseCircle, AlertTriangle, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NEON_CLASS: Partial<Record<ExecStatus, string>> = {
  Atrasada: "neon-glow-pulse",
  Cancelada: "neon-glow-pulse",
};

const STATUS_ICONS: Record<ExecStatus, LucideIcon> = {
  Finalizada: CheckCircle2,
  Cancelada: XCircle,
  "Em execução": Play,
  Programada: Calendar,
  Pausada: PauseCircle,
  Atrasada: AlertTriangle,
  Reprogramada: CalendarClock,
};

export function StatusBadge({ status, className }: { status: ExecStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase",
        s.badgeClass,
        s.pulse && "pulse-critical",
        NEON_CLASS[status],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dotClass)} />
      {s.label}
    </span>
  );
}
