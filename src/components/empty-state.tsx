import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title = "Painel limpo",
  description = "Nenhum registro para o período",
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted/40">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-[11px] text-muted-foreground/50">{description}</p>
      )}
    </div>
  );
}
