import { useState, useMemo } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  type Row,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RowDetailSheet } from "@/components/row-detail-sheet";
import { MobileCardView } from "@/components/mobile-card-view";
import { DesktopTableView } from "@/components/desktop-table-view";

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Pesquisar…",
  searchKeys,
  pageSize = 12,
  rowCriticalKey,
  rowCriticalValue,
  detailTitle,
  detailSubtitle,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  rowCriticalKey?: keyof T;
  rowCriticalValue?: unknown;
  detailTitle?: (row: T) => string;
  detailSubtitle?: (row: T) => string | undefined;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [q, setQ] = useState("");
  const [detailRow, setDetailRow] = useState<Row<T> | null>(null);
  const hasDetail = Boolean(detailTitle);

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

      <MobileCardView
        rows={table.getRowModel().rows}
        columns={columns}
        isRowCritical={isRowCritical}
      />

      <DesktopTableView
        headerGroups={table.getHeaderGroups()}
        rows={table.getRowModel().rows}
        columns={columns}
        isRowCritical={isRowCritical}
        hasDetail={hasDetail}
        onRowClick={(row) => setDetailRow(row)}
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {filtered.length} registro{filtered.length === 1 ? "" : "s"} • página{" "}
          {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-border/40 bg-card/30 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-border/40 bg-card/30 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hasDetail && (
        <RowDetailSheet
          open={Boolean(detailRow)}
          onOpenChange={(v) => {
            if (!v) setDetailRow(null);
          }}
          row={detailRow}
          title={detailRow ? detailTitle?.(detailRow.original) : undefined}
          subtitle={detailRow ? detailSubtitle?.(detailRow.original) : undefined}
        />
      )}
    </div>
  );
}
