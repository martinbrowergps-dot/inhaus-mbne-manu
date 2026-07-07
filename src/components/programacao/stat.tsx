import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "primary" | "success" | "muted";
}) {
  const cls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num font-semibold", cls)}>{value}</span>
    </div>
  );
}
