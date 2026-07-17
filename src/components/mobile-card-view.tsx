import { useState } from "react";
import { flexRender, type Row, type ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function getHeaderLabel<T>(col: ColumnDef<T, unknown>) {
  return typeof col.header === "string" ? col.header : "";
}

export function MobileCardView<T>({
  rows,
  columns,
  isRowCritical,
}: {
  rows: Row<T>[];
  columns: ColumnDef<T, unknown>[];
  isRowCritical: (row: T) => boolean;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleRow = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-border/40 text-sm text-muted-foreground">
        Sem registros
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => {
        const cells = row.getVisibleCells();
        const firstTwo = cells.slice(0, 2);
        const rest = cells.slice(2);
        return (
          <div
            key={row.id}
            className={cn(
              "rounded-lg border border-border/40 bg-card/30 p-3 text-xs",
              isRowCritical(row.original) && "border-destructive/40",
            )}
          >
            <button
              className="flex w-full items-start justify-between gap-2 text-left"
              onClick={() => toggleRow(idx)}
            >
              <div className="min-w-0 flex-1 space-y-1">
                {firstTwo.map((cell) => (
                  <div key={cell.id}>
                    <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {getHeaderLabel(cell.column.columnDef)}
                    </span>
                    <div className="mt-0.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                ))}
              </div>
              {rest.length > 0 && (
                <span className="mt-1 shrink-0 text-muted-foreground">
                  {expanded.has(idx) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              )}
            </button>
            {expanded.has(idx) && rest.length > 0 && (
              <div className="mt-2 space-y-2 border-t border-border/30 pt-2">
                {rest.map((cell) => {
                  const label = getHeaderLabel(cell.column.columnDef);
                  return (
                    <div key={cell.id} className="flex items-baseline justify-between gap-2">
                      {label && (
                        <span className="shrink-0 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {label}
                        </span>
                      )}
                      <div className="text-right">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
