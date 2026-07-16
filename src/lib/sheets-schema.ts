import { z } from "zod/v4";
import type { ProgramacaoRow } from "./sheets-types";

const expectedProgramacaoHeaders = [
  "NumeroOS", "IDPlano", "DataProgramada", "DataReprogramada", "TAG",
  "Descricao", "LocalMacro", "Localidade", "Sistema", "Tipo",
  "Criticidade", "Cargo", "HH", "Status", "DataCriacao",
  "DataInicioExecucao", "Executante", "ObservacoesExecucao",
  "TemNaoConformidade", "DescricaoNaoConformidade", "DataFimExecucao",
  "StatusExecucao", "Solicitante da Quebra de Programação",
  "Tempo Real de Execução",
] as const;

export function validateProgramacaoHeaders(headers: string[]): string[] {
  const missing = expectedProgramacaoHeaders.filter(
    (h) => !headers.some((ch) => ch.toLowerCase() === h.toLowerCase()),
  );
  return missing;
}

export function validateProgramacaoRow(
  row: ProgramacaoRow,
  index: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.NumeroOS) errors.push(`[${index}] NumeroOS vazio`);
  if (!row.DataProgramada && !row.DataReprogramada)
    errors.push(`[${index}] DataProgramada e DataReprogramada vazios`);
  const hh = Number(row.HH);
  if (row.HH !== undefined && !isNaN(hh) && hh < 0)
    errors.push(`[${index}] HH negativo: ${hh}`);
  return { valid: errors.length === 0, errors };
}
