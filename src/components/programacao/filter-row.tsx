import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/ui/filter-chip";

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
      <FilterChip label="Todos" active={!value} onClick={() => onChange(null)} />
      {options.map((opt) => (
        <FilterChip
          key={opt}
          label={opt}
          active={value === opt}
          onClick={() => onChange(value === opt ? null : opt)}
          className={colorFor?.(opt)}
        />
      ))}
    </div>
  );
}
