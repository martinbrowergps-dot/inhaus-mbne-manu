import { useState, useMemo, type ReactNode } from "react";
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
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

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

  const mobileColumns = columns.filter((c) => {
    const id = (c as { accessorKey?: string }).accessorKey ?? "";
    return !/^(id|código|codigo|_)/i.test(id);
  });

  const visibleColumns = columns.filter((c) => {
    const id = (c as { accessorKey?: string }).accessorKey ?? "";
    return !/^_/.test(id);
  });

  const getHeaderLabel = (col: ColumnDef<T, unknown>) => {
    return typeof col.header === "string" ? col.header : "";
  };

  const getCellValue = (row: T, col: ColumnDef<T, unknown>) => {
    const id = (col as { accessorKey?: string }).accessorKey;
    if (!id) return "";
    return String((row as Record<string, unknown>)[id] ?? "");
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

      {/* ── Mobile cards ── */}
      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-border/40 text-sm text-muted-foreground">
            Sem registros
          </div>
        ) : (
          table.getRowModel().rows.map((row, idx) => {
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
                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
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
                      {expandedRows.has(idx) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </button>
                {expandedRows.has(idx) && rest.length > 0 && (
                  <div className="mt-2 space-y-2 border-t border-border/30 pt-2">
                    {rest.map((cell) => {
                      const label = getHeaderLabel(cell.column.columnDef);
                      return (
                        <div key={cell.id} className="flex items-baseline justify-between gap-2">
                          {label && (
                            <span className="shrink-0 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
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
          })
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/40 bg-card/20 backdrop-blur-sm md:block">
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
