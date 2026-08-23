import Papa from "papaparse";
import { queryOptions } from "@tanstack/react-query";
import type {
  BacklogRow,
  MedicaoRow,
  NcRow,
  ParametroHHRow,
  PassagemTurnoRow,
  PlanoManutencaoRow,
  PreditivaRow,
  ProgramacaoRow,
  SheetsData,
  TecnicoRow,
} from "./sheets-types";
import { validateMedicaoRow, validateBacklogRow } from "./sheets-schema";
import * as M from "./sheets/mapping";

const SHEET_ID = /* @__PURE__ */ (() => {
  try { return import.meta.env.VITE_SHEET_ID || "1WmfsQ0ATzSnuS3gkQKGbUAE623NKGHuHUPJ2SjihQmA"; }
  catch { return "1WmfsQ0ATzSnuS3gkQKGbUAE623NKGHuHUPJ2SjihQmA"; }
})();

const SHEETS = {
  programacao: "PROGRAMAÇÃO",
  medicoes: "MEDIÇÕES",
  checklistDocas: "CHECKLIST DOCAS",
  checklistGeral: "CHECKLIST GERAL",
  checklistPortas: "CHECKLIST PORTAS",
  passagemTurno: "PASSAGEM DE TURNO",
  tecnicos: "TECNICOS",
  parametrosHH: "PARAMETROS_HH",
  backlog: "BACKLOG",
  nc: "NC",
  preditiva: "PREDITIVA",
  planoManutencao: "PLANO DE MANUTENÇÃO",
} as const;

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const SHEET_FETCH_TIMEOUT_MS = 5000;

function csvUrl(sheet: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

function logSheetError(sheet: string, err: unknown) {
  console.error(`[sheets] Falha ao carregar aba "${sheet}":`, err);
}

async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(SHEET_FETCH_TIMEOUT_MS) });
    if (!res.ok && attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.warn(`[sheets] Tentativa ${attempt}/${MAX_RETRIES} falhou (${res.status}). Retry em ${backoff}ms.`);
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, attempt + 1);
    }
    return res;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.warn(`[sheets] Tentativa ${attempt}/${MAX_RETRIES} erro de rede. Retry em ${backoff}ms.`);
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, attempt + 1);
    }
    throw err;
  }
}

async function fetchCsv(sheet: string): Promise<Record<string, string>[]> {
  const res = await fetchWithRetry(csvUrl(sheet));
  if (!res.ok) throw new Error(`Falha ao ler aba "${sheet}" (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return parsed.data.filter((r) => Object.values(r).some((v) => v && String(v).trim() !== ""));
}

const NC_COL_INDEX = {
  Codigo: 0,
  Ocorrencia: 1,
  MedidasCorretivas: 2,
  Responsavel: 3,
  DataConclusao: 4,
  Andamento: 5,
  OQueFazer: 6,
  Status: 7,
} as const;
const NC_EXPECTED_COLS = 8;

async function fetchNcRows(): Promise<NcRow[]> {
  const res = await fetch(csvUrl(SHEETS.nc), { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Falha ao ler aba "NC" (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });
  const rows = parsed.data as string[][];
  if (rows.length > 0 && (rows[0] ?? []).length < NC_EXPECTED_COLS) {
    throw new Error(`Aba NC: esperadas ${NC_EXPECTED_COLS} colunas, recebidas ${(rows[0] ?? []).length}.`);
  }
  const result: NcRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i] ?? [];
    if (c.length < NC_EXPECTED_COLS) continue;
    const numero = (c[NC_COL_INDEX.Codigo] ?? "").trim();
    const ocorrencia = (c[NC_COL_INDEX.Ocorrencia] ?? "").trim();
    const medidas = (c[NC_COL_INDEX.MedidasCorretivas] ?? "").trim();
    const resp = (c[NC_COL_INDEX.Responsavel] ?? "").trim();
    const dataConc = (c[NC_COL_INDEX.DataConclusao] ?? "").trim();
    const andamento = (c[NC_COL_INDEX.Andamento] ?? "").trim();
    const oQueFazer = (c[NC_COL_INDEX.OQueFazer] ?? "").trim();
    const status = (c[NC_COL_INDEX.Status] ?? "").trim();
    if (!ocorrencia) continue;
    if (ocorrencia.toUpperCase().startsWith("OCORRÊNCIA") || numero.toUpperCase().startsWith("NUMERO DE NC")) continue;
    result.push({
      Codigo: numero,
      Ocorrencia: ocorrencia,
      MedidasCorretivas: medidas,
      Responsavel: resp,
      DataConclusao: dataConc,
      Andamento: andamento,
      OQueFazer: oQueFazer,
      Status: status || andamento,
    });
  }
  return result;
}

const EXPECTED_HEADERS: Record<string, string[]> = {
  programacao: ["NumeroOS", "DataProgramada", "Sistema", "Descricao", "HH", "StatusExecucao"],
  medicoes: ["LOCAL", "DATA", "HORA", "TEMPERATURA 01", "TECNICO"],
  passagemTurno: ["Data", "Turno", "Supervisor", "EquipeSaida"],
  tecnicos: ["ID", "NOME", "Cargo"],
  backlog: ["NUMERO", "Solicitante", "Assunto", "Prioridade"],
  nc: ["NUMERO DE NC", "OCORRÊNCIA", "STATUS"],
  preditiva: ["Equipamento", "Serviço", "Status"],
};

function validateHeaders(sheetName: string, rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const expected = EXPECTED_HEADERS[sheetName];
  if (!expected) return [];
  const missing = expected.filter((h) => !headers.some((ch) => ch.toLowerCase() === h.toLowerCase()));
  if (missing.length > 0) {
    return [`[${sheetName}] Colunas ausentes: ${missing.join(", ")}`];
  }
  return [];
}

export async function fetchSheetsData(): Promise<SheetsData> {
  const errors: string[] = [];
  const SHEET_FETCH_DELAY_MS = 200;

  async function sequentialFetch<T>(fetchers: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];
    for (const fn of fetchers) {
      results.push(await fn());
      await new Promise((r) => setTimeout(r, SHEET_FETCH_DELAY_MS));
    }
    return results;
  }

  const fetchers: (() => Promise<unknown>)[] = [
    () => fetchCsv(SHEETS.programacao),
    () => fetchCsv(SHEETS.medicoes),
    () => fetchCsv(SHEETS.checklistDocas),
    () => fetchCsv(SHEETS.checklistGeral),
    () => fetchCsv(SHEETS.checklistPortas),
    () => fetchCsv(SHEETS.passagemTurno),
    () => fetchCsv(SHEETS.tecnicos),
    () => fetchCsv(SHEETS.parametrosHH),
    () => fetchCsv(SHEETS.backlog).catch(() => []),
    () => fetchNcRows().catch(() => []),
    () => fetchCsv(SHEETS.preditiva).catch(() => []),
    () => fetchCsv(SHEETS.planoManutencao).catch(() => []),
  ];

  const raw = await sequentialFetch(fetchers);
  const [pRaw, mRaw, docRaw, gerRaw, porRaw, pasRaw, tecRaw, parRaw, bacRaw, ncRaw, preRaw, plaRaw] = raw as any[];

  const programacao: ProgramacaoRow[] = pRaw.map(M.mapProgramacao);
  const medicoes: MedicaoRow[] = mRaw.map(M.mapMedicao);
  const passage: PassagemTurnoRow[] = pasRaw.map(M.mapPassagemTurno);
  const tecnicos: TecnicoRow[] = tecRaw.map(M.mapTecnico);
  const parametros: ParametroHHRow[] = parRaw.map(M.mapParametroHH);
  const backlog: BacklogRow[] = bacRaw.map(M.mapBacklog);
  const nc: NcRow[] = ncRaw;
  const plano: PlanoManutencaoRow[] = plaRaw.map(M.mapPlanoManutencao);
  const preditiva: PreditivaRow[] = preRaw.map(M.mapPreditiva);

  // Validations
  medicoes.forEach((m, i) => validateMedicaoRow(m, i));
  backlog.forEach((b, i) => validateBacklogRow(b, i));

  return {
    programacao,
    medicoes,
    checklistDocas: docRaw.map(M.mapChecklist),
    checklistGeral: gerRaw.map(M.mapChecklist),
    checklistPortas: porRaw.map(M.mapChecklist),
    passagemTurno: passage,
    tecnicos,
    parametrosHH: parametros,
    backlog,
    nc,
    preditiva,
    planoManutencao: plano,
    fetchedAt: Date.now(),
  };
}

export const sheetsQueryOptions = queryOptions({
  queryKey: ["sheets"],
  queryFn: fetchSheetsData,
  staleTime: 5 * 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: false,
});
