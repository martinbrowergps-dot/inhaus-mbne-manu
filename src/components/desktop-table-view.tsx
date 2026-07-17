import { flexRender, type Row, type HeaderGroup, type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DesktopTableView<T>({
  headerGroups,
  rows,
  columns,
  isRowCritical,
  hasDetail,
  onRowClick,
}: {
  headerGroups: HeaderGroup<T>[];
  rows: Row<T>[];
  columns: ColumnDef<T, unknown>[];
  isRowCritical: (row: T) => boolean;
  hasDetail: boolean;
  onRowClick: (row: Row<T>) => void;
}) {
  return (
    <div className="hidden overflow-auto rounded-lg border border-border/40 bg-card/20 backdrop-blur-sm md:block">
      <Table className="min-w-[640px]">
        <TableHeader className="sticky top-0 z-10 bg-[#082F49]">
          {headerGroups.map((hg) => (
            <TableRow key={hg.id} className="border-border/30 hover:bg-transparent">
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase"
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                Sem registros
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={hasDetail ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-border/30 text-xs transition-colors",
                  isRowCritical(row.original)
                    ? "table-row-critical neon-glow-pulse"
                    : "hover:bg-primary/[0.04]",
                  hasDetail && "cursor-pointer",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-1.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
