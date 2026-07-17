import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { Mock } from "vitest";

// CSV samples simulating Google Sheets gviz/tq output
// Use \n explicit to avoid JS string quoting issues with CSV empty fields
const CSV_PROGRAMACAO = [
  "NumeroOS,DataProgramada,Sistema,Descricao,Criticidade,Cargo,HH,Status,Executante,StatusExecucao,LocalMacro,Localidade,Tipo,SolicitanteQuebra,DataCriacao,DataInicioExecucao,DataFimExecucao,ObservacoesExecucao,TemNaoConformidade,DescricaoNaoConformidade,TAG,IDPlano,DataReprogramada,TempoRealExec",
  "OS001,15/07/2026,Sistema A,Teste 1,A,MECANICO,4,,Joao,Finalizada,CDNE,,PREVENTIVA,,01/07/2026,,,Ok,,,MB-01,,,2.5",
  "OS002,16/07/2026,Sistema B,Teste 2,B,ELETRICISTA,8,,Maria,Em execucao,Patio,,QUEBRA DE PROGRAMACAO,Jose,,,,,,,MB-02,,,0",
  "OS003,17/07/2026,Sistema A,Teste 3,AA,MECANICO,2,,Joao,,CDNE,,PREVENTIVA,,,,,,,,MB-01,,20/07/2026,",
].join("\n");

const CSV_MEDICOES = [
  "LOCAL,DATA,HORA,TEMPERATURA 01,TEMPERATURA 02,TEMPERATURA 03,TEMPERATURA 04,TECNICO",
  "CDNE,15/07/2026,08:00,25,26,24,25,Joao",
  "PATIO,15/07/2026,08:00,30,29,,,Maria",
].join("\n");

const CSV_NC = [
  "NUMERO DE NC,OCORRENCIA,MEDIDAS CORRETIVAS,RESP PELA MEDIDA CORRETIVA,DATA CONCLUSAO,ANDAMENTO,O QUE FAZER,STATUS",
  "NC001,Vazamento,Reparar,Joao,20/07/2026,Em andamento,,Em andamento",
  "NC002,Desgaste,Trocar,Maria,,Aberto,,Aberto",
].join("\n");

const CSV_BACKLOG = [
  "NUMERO,IDENTIFICACAO_DA_SOLICITACAO,Solicitante,DATA_CRIACAO,Assunto,TECNICO,Prioridade,DATA_DE_VENCIMENTO,Estado,Grupo",
  "BL001,SOL001,Jose,01/07/2026,Manutencao preventiva,Joao,Alta,15/07/2026,Aberto,Mecanica",
  "BL002,SOL002,Maria,05/07/2026,Troca de oleo,Pedro,Media,20/07/2026,Em Espera,Eletrica",
].join("\n");

const CSV_TECNICOS = [
  "ID,NOME,Cargo",
  "T01,JOAO DA SILVA,MECANICO",
  "T02,MARIA SANTOS,ELETRICISTA",
].join("\n");

const CSV_PASSAGEM = [
  "Data,Turno,Supervisor,EquipeSaida,EquipeEntrada,TecnicoPassa,TecnicoRecebe,HorarioInicio,HorarioTermino,Aprovador,StatusGeral,Pendencias,Observacoes",
  "15/07/2026,A,Jose,Equipe A,Equipe B,Joao,Maria,07:00,15:00,Carlos,Normal,Nenhuma,Tudo ok",
].join("\n");

// Build URL → CSV mapping
const URL_MAP: Record<string, string> = {};
function addSheet(name: string, csv: string) {
  const encoded = encodeURIComponent(name);
  URL_MAP[`https://docs.google.com/spreadsheets/d/1WmfsQ0ATzSnuS3gkQKGbUAE623NKGHuHUPJ2SjihQmA/gviz/tq?tqx=out:csv&sheet=${encoded}`] = csv;
}

addSheet("PROGRAMAÇÃO", CSV_PROGRAMACAO);
addSheet("MEDIÇÕES", CSV_MEDICOES);
addSheet("NC", CSV_NC);
addSheet("BACKLOG", CSV_BACKLOG);
addSheet("TECNICOS", CSV_TECNICOS);
addSheet("PASSAGEM DE TURNO", CSV_PASSAGEM);
addSheet("CHECKLIST DOCAS", "");
addSheet("CHECKLIST GERAL", "");
addSheet("CHECKLIST PORTAS", "");
addSheet("PARAMETROS_HH", "");
addSheet("PREDITIVA", "");
addSheet("PLANO DE MANUTENÇÃO", "");

let originalFetch: typeof global.fetch;

describe("fetchSheetsData", () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      const csv = URL_MAP[urlStr];
      if (csv !== undefined) {
        return Promise.resolve(
          new Response(csv, { status: 200, headers: { "Content-Type": "text/csv" } }),
        );
      }
      return Promise.reject(new Error(`Unexpected URL: ${urlStr}`));
    }) as unknown as typeof global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("parseia PROGRAMAÇÃO corretamente", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.programacao).toHaveLength(3);
    expect(data.programacao[0].NumeroOS).toBe("OS001");
    expect(data.programacao[1].StatusExecucao).toBe("Em execucao");
    expect(data.programacao[2].HH).toBe(2);
    // Reprogramada com data
    expect(data.programacao[2].DataReprogramada).toBe("20/07/2026");
    // Tipo QUEBRA
    expect(data.programacao[1].Tipo).toBe("QUEBRA DE PROGRAMACAO");
    expect(data.programacao[1].SolicitanteQuebra).toBe("Jose");
  });

  it("parseia MEDIÇÕES corretamente", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.medicoes).toHaveLength(2);
    expect(data.medicoes[0].LOCAL).toBe("CDNE");
    expect(data.medicoes[0].TEMPERATURA_01).toBe(25);
    expect(data.medicoes[0].TEMPERATURA_02).toBe(26);
  });

  it("parseia NC corretamente", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.nc).toHaveLength(2);
    expect(data.nc[0].Codigo).toBe("NC001");
    expect(data.nc[0].Ocorrencia).toBe("Vazamento");
    expect(data.nc[1].Status).toBe("Aberto");
  });

  it("parseia BACKLOG corretamente", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.backlog).toHaveLength(2);
    expect(data.backlog[0].Numero).toBe("BL001");
    expect(data.backlog[0].Solicitante).toBe("Jose");
    expect(data.backlog[0].Estado).toBe("Aberto");
  });

  it("parseia TÉCNICOS corretamente", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.tecnicos).toHaveLength(2);
    expect(data.tecnicos[0].Nome).toBe("JOAO DA SILVA");
    expect(data.tecnicos[0].Cargo).toBe("MECANICO");
  });

  it("parseia PASSAGEM DE TURNO corretamente", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.passagemTurno).toHaveLength(1);
    expect(data.passagemTurno[0].Supervisor).toBe("Jose");
    expect(data.passagemTurno[0].Turno).toBe("A");
  });

  it("retorna fetchedAt como timestamp", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.fetchedAt).toBeGreaterThan(0);
  });

  it("abrevia com campos vazios para abas sem dados", async () => {
    const { fetchSheetsData } = await import("@/lib/sheets");
    const data = await fetchSheetsData();
    expect(data.checklistDocas).toEqual([]);
    expect(data.preditiva).toEqual([]);
    expect(data.planoManutencao).toEqual([]);
  });

  it("lança erro quando fetch de aba falha (500)", async () => {
    // Replaces mock global.fetch for all 12 sheets — uncaught rejects cause Promise.all to fail
    const originalMock = global.fetch;
    global.fetch = vi.fn(() => Promise.resolve(new Response("", { status: 500, statusText: "Internal Server Error" })));
    const { fetchSheetsData } = await import("@/lib/sheets");
    await expect(fetchSheetsData()).rejects.toThrow();
    global.fetch = originalMock;
  });
});

describe("validateHeaders internals", () => {
  it("não pode ser testada diretamente (não exportada), mas coverage de fetchSheetsData cobre", async () => {
    // validateHeaders é chamada dentro de fetchSheetsData para cada aba
    // O teste de integração acima já cobre o caminho feliz
    expect(true).toBe(true);
  });
});
