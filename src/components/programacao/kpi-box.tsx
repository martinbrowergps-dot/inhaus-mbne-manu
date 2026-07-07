export function KpiBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
