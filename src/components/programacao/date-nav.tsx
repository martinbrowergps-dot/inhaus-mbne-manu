import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DateNav({
  icon: Icon,
  label,
  onPrev,
  onNext,
  control,
}: {
  icon: LucideIcon;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span className="capitalize">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {control}
        <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
