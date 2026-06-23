import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, type CsvColumn } from "@/lib/export-csv";
import { exportTableToPdf } from "@/lib/export-pdf";

interface Props<T> {
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  /** Title shown in PDF header */
  pdfTitle?: string;
  /** Subtitle below title in PDF */
  pdfSubtitle?: string;
  /** Kept for backwards compatibility — ignored (PDF now uses tabular renderer) */
  pdfTargetRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export function ExportButton<T>({
  filename,
  rows,
  columns,
  pdfTitle,
  pdfSubtitle,
  disabled,
}: Props<T>) {
  const handleCsv = () => {
    if (rows.length === 0) return;
    downloadCsv(filename, rows, columns);
  };

  const handlePdf = () => {
    if (rows.length === 0) return;
    exportTableToPdf({
      filename,
      title: pdfTitle ?? filename,
      subtitle: pdfSubtitle,
      rows,
      columns,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || rows.length === 0}
          className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCsv} className="gap-2 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-destructive" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
