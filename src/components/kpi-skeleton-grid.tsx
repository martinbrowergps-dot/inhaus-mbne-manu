import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function KpiSkeletonGrid({
  count = 8,
  className,
  heightClass = "h-28",
}: {
  count?: number;
  className?: string;
  heightClass?: string;
}) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("rounded-xl border border-white/5", heightClass)} />
      ))}
    </div>
  );
}
