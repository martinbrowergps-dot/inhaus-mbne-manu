import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export function RowDetailSheet<T>({
  open,
  onOpenChange,
  row,
  title,
  subtitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: Row<T> | null;
  title?: string;
  subtitle?: string;
}) {
  const cells =
    row?.getVisibleCells().filter((c) => {
      const id = (c.column.columnDef as { accessorKey?: string }).accessorKey ?? "";
      return !id.startsWith("_");
    }) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 p-4">
          <SheetTitle className="num pr-6 text-base">{title || "Detalhes"}</SheetTitle>
          {subtitle && (
            <SheetDescription className="line-clamp-3 text-xs leading-relaxed">
              {subtitle}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {cells.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <div className="divide-y divide-border/30">
              {cells.map((cell) => {
                const label =
                  typeof cell.column.columnDef.header === "string"
                    ? cell.column.columnDef.header
                    : "";
                const value = flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext(),
                );
                return (
                  <div key={cell.id} className="grid grid-cols-3 gap-3 px-4 py-3 text-sm">
                    <div className="self-start pt-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {label}
                    </div>
                    <div className="col-span-2 break-words">{value}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
