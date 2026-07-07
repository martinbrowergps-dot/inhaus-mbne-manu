import { cn } from "@/lib/utils";

function Chip({
  label,
  active,
  onClick,
  extraClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  extraClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary bg-primary/15 text-primary shadow-[0_0_10px_rgba(14,165,255,0.3)]"
          : cn(
              "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              extraClass,
            ),
      )}
    >
      {label}
    </button>
  );
}

export function FilterRow({
  label,
  value,
  options,
  onChange,
  colorFor,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  colorFor?: (v: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase w-24">
        {label}
      </span>
      <Chip label="Todos" active={!value} onClick={() => onChange(null)} />
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={value === opt}
          onClick={() => onChange(value === opt ? null : opt)}
          extraClass={colorFor?.(opt)}
        />
      ))}
    </div>
  );
}
