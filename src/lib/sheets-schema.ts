import { z } from "zod/v4";
import type { ProgramacaoRow, MedicaoRow, BacklogRow } from "./sheets-types";

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

// --- Zod runtime validators (coerce + constraint) ---

const hhSchema = z.coerce.number().nonnegative("HH não pode ser negativo").safe().catch(0);

const criticidadeSchema = z
  .string()
  .optional()
  .transform((v) => (v ?? "").toUpperCase())
  .pipe(
    z.enum(["", "AA", "A", "B", "C", "D"]).catch(""),
  );

const statusExecucaoSchema = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.toLowerCase())
  .pipe(
    z.enum([
      "",
      "finalizada",
      "concluída",
      "concluido",
      "em execução",
      "em andamento",
      "programada",
      "cancelada",
      "pausada",
    ]).catch(""),
  );

/**
 * Valida uma linha de ProgramacaoRow com coerção de tipos.
 * Apenas emite warnings para o console, NÃO bloqueia o parse.
 * Retorna { field, value, reason }[] para logging auditável.
 */
export function validateProgramacaoRow(
  row: ProgramacaoRow,
  index: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.NumeroOS) errors.push(`[${index}] NumeroOS vazio`);
  if (!row.DataProgramada && !row.DataReprogramada)
    errors.push(`[${index}] DataProgramada e DataReprogramada vazios`);

  const hh = hhSchema.parse(row.HH);
  if (hh < 0) errors.push(`[${index}] HH negativo: ${hh}`);

  const crit = criticidadeSchema.parse(row.Criticidade);
  if (crit && !["AA", "A", "B", "C"].includes(crit))
    errors.push(`[${index}] Criticidade inválida: "${row.Criticidade}"`);

  const se = statusExecucaoSchema.parse(row.StatusExecucao || row.Status);
  if (se && !["finalizada", "concluída", "concluido", "em execução", "em andamento",
              "programada", "cancelada", "pausada"].includes(se))
    errors.push(`[${index}] StatusExecucao atípico: "${row.StatusExecucao}"`);

  return { valid: errors.length === 0, errors };
}

// --- Temperaturas ---

const temperaturaSchema = z.coerce.number().finite().optional();

/**
 * Valida MedicaoRow para garantir que temperaturas são números finitos.
 */
export function validateMedicaoRow(row: MedicaoRow, index: number): string[] {
  const issues: string[] = [];
  if (!row.LOCAL) issues.push(`[${index}] Medição sem LOCAL`);
  
  const t1 = temperaturaSchema.safeParse(row.TEMPERATURA_01);
  if (row.TEMPERATURA_01 !== null && (!t1.success || t1.data === undefined || !Number.isFinite(t1.data)))
    issues.push(`[${index}] TEMPERATURA_01 não-finito: ${row.TEMPERATURA_01}`);
  
  const t2 = temperaturaSchema.safeParse(row.TEMPERATURA_02);
  if (row.TEMPERATURA_02 !== null && (!t2.success || t2.data === undefined || !Number.isFinite(t2.data)))
    issues.push(`[${index}] TEMPERATURA_02 não-finito: ${row.TEMPERATURA_02}`);
  
  return issues;
}

// --- Backlog ---

const backlogPrioridadeSchema = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.toLowerCase())
  .pipe(
    z.enum(["", "alta", "média", "media", "baixa", "normal", "urgente", "critico"]).catch(""),
  );

/**
 * Valida BacklogRow: prioridade atípica, identificação vazia.
 */
export function validateBacklogRow(row: BacklogRow, index: number): string[] {
  const issues: string[] = [];
  if (!row.Identificacao) issues.push(`[${index}] Identificação vazia no backlog`);
  const pri = backlogPrioridadeSchema.parse(row.Prioridade);
  if (pri && !["alta", "média", "media", "baixa", "normal"].includes(pri))
    issues.push(`[${index}] Prioridade atípica: "${row.Prioridade}"`);
  return issues;
}
