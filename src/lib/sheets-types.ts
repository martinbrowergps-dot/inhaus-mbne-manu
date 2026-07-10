export interface ProgramacaoRow {
  NumeroOS: string;
  IDPlano: string;
  DataProgramada: string;
  DataReprogramada: string;
  TAG: string;
  Descricao: string;
  Sistema: string;
  Criticidade: string;
  Cargo: string;
  HH: number;
  Status: string;
  Executante: string;
  StatusExecucao: string;
  LocalMacro?: string;
  Localidade?: string;
  Tipo?: string;
  SolicitanteQuebra?: string;
  TempoRealExec?: number;
  DataCriacao?: string;
  DataInicioExecucao?: string;
  DataFimExecucao?: string;
  ObservacoesExecucao?: string;
  TemNaoConformidade?: string;
  DescricaoNaoConformidade?: string;
}

export interface MedicaoRow {
  LOCAL: string;
  DATA: string;
  HORA: string;
  TEMPERATURA_01: number | null;
  TEMPERATURA_02: number | null;
  TEMPERATURA_03: number | null;
  TEMPERATURA_04: number | null;
  TECNICO: string;
}

export interface ChecklistRow {
  ID: string;
  Data: string;
  Local?: string;
  Responsavel?: string;
  raw: Record<string, string>;
}

export interface PassagemTurnoRow {
  ID?: string;
  Data: string;
  Turno: string;
  HorarioInicio?: string;
  HorarioTermino?: string;
  Supervisor: string;
  EquipeSaida: string;
  EquipeEntrada: string;
  TecnicoPassa: string;
  TecnicoRecebe: string;
  Aprovador?: string;
  StatusGeral: string;
  Pendencias: string;
  Observacoes: string;
  ResumoOcorrencias?: string;
  ResumoOSAbertas?: string;
  ResumoOSConcluidas?: string;
  DataHoraRegistro?: string;
  AssinadoPor?: string;
}

export interface TecnicoRow {
  ID: string;
  Nome: string;
  Cargo: string;
}

export interface ParametroHHRow {
  Cargo: string;
  HH_Dia: number;
  HH_Semana: number;
}

export interface BacklogRow {
  Numero: string;
  Identificacao: string;
  Solicitante: string;
  DataCriacao: string;
  Assunto: string;
  Tecnico: string;
  Prioridade: string;
  DataVencimento: string;
  SolicitacaoServico: string;
  Estado: string;
  Grupo: string;
  StatusOficial: string;
  HHEstimado: number;
  OQuePrecisa?: string;
}

export interface NcRow {
  Codigo: string;
  Ocorrencia: string;
  MedidasCorretivas: string;
  Responsavel: string;
  DataConclusao: string;
  Andamento: string;
  OQueFazer: string;
  Status: string;
}

export interface PreditivaRow {
  CodigoReferencia: string;
  Tipo: string;
  Categoria: string;
  Prioridade: string;
  Titulo: string;
  Objetivo: string;
  DescricaoAtividade: string;
  HH: string;
}

export interface SheetsData {
  programacao: ProgramacaoRow[];
  medicoes: MedicaoRow[];
  checklistDocas: ChecklistRow[];
  checklistGeral: ChecklistRow[];
  checklistPortas: ChecklistRow[];
  passagemTurno: PassagemTurnoRow[];
  tecnicos: TecnicoRow[];
  parametrosHH: ParametroHHRow[];
  backlog: BacklogRow[];
  nc: NcRow[];
  preditiva: PreditivaRow[];
  fetchedAt: number;
}
