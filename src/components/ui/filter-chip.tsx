import { cn } from "@/lib/utils";

export interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  uppercase?: boolean;
}

export function FilterChip({
  label,
  active,
  onClick,
  className,
  uppercase = true,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        uppercase && "uppercase tracking-wider",
        active
          ? "border-primary bg-primary/15 text-primary shadow-[0_0_10px_rgba(14,165,255,0.3)]"
          : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
