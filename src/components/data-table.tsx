import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Pesquisar…",
  searchKeys,
  pageSize = 12,
  rowCriticalKey,
  rowCriticalValue,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  rowCriticalKey?: keyof T;
  rowCriticalValue?: unknown;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const lower = q.toLowerCase();
    return data.filter((row) => {
      const keys = searchKeys ?? (Object.keys(row as object) as (keyof T)[]);
      return keys.some((k) =>
        String((row as Record<string, unknown>)[k as string] ?? "")
          .toLowerCase()
          .includes(lower),
      );
    });
  }, [data, q, searchKeys]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const isRowCritical = (row: T) => {
    if (!rowCriticalKey || rowCriticalValue === undefined) return false;
    return (row as Record<string, unknown>)[rowCriticalKey as string] === rowCriticalValue;
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 border-border/40 bg-card/40 pl-8 text-xs backdrop-blur-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/40 bg-card/20 backdrop-blur-sm">
        <Table className="min-w-[640px]">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-border/30 hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Sem registros
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-border/30 text-xs transition-colors",
                    isRowCritical(row.original)
                      ? "table-row-critical neon-glow-pulse"
                      : "hover:bg-primary/[0.04]",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {filtered.length} registro{filtered.length === 1 ? "" : "s"} • página{" "}
          {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-border/40 bg-card/30 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-border/40 bg-card/30 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
