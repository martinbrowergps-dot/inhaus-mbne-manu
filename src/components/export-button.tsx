import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, type CsvColumn } from "@/lib/export-csv";
import { exportElementToPdf } from "@/lib/export-pdf";

interface Props<T> {
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  /** Optional: element to capture for PDF export */
  pdfTargetRef?: React.RefObject<HTMLElement | null>;
  /** Optional: title used in PDF header */
  pdfTitle?: string;
  disabled?: boolean;
}

export function ExportButton<T>({
  filename,
  rows,
  columns,
  pdfTargetRef,
  pdfTitle,
  disabled,
}: Props<T>) {
  const [busy, setBusy] = useState(false);
  const hasPdf = !!pdfTargetRef;

  const handleCsv = () => {
    if (rows.length === 0) return;
    downloadCsv(filename, rows, columns);
  };

  const handlePdf = async () => {
    if (!pdfTargetRef?.current) return;
    setBusy(true);
    try {
      await exportElementToPdf(pdfTargetRef.current, filename, pdfTitle);
    } finally {
      setBusy(false);
    }
  };

  if (!hasPdf) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleCsv}
        disabled={disabled || rows.length === 0}
        className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="text-xs">Exportar CSV</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || busy}
          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="text-xs">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCsv} disabled={rows.length === 0} className="gap-2 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf} disabled={busy} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-destructive" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
