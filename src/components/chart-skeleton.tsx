import { cn } from "@/lib/utils";

export function ChartSkeleton({
  height = "h-64",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-card/20", height, className)}>
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-36 rounded bg-muted/30" />
      </div>
    </div>
  );
}
