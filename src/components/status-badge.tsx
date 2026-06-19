import { cn } from "@/lib/utils";
import { STATUS_STYLES, type ExecStatus } from "@/lib/status";

export function StatusBadge({ status, className }: { status: ExecStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
        s.badgeClass,
        s.pulse && "pulse-critical",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dotClass)} />
      {s.label}
    </span>
  );
}
