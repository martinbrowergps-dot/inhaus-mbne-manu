import type { ReactNode } from "react";

export function SectionHeader({ label, insight, children }: { label: string; insight: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 border-b border-border/30 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
          {label}
        </span>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          {insight}
        </p>
      </div>
      {children}
    </section>
  );
}
