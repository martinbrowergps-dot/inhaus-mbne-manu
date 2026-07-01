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
  MotivoCancelamento?: string;
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
  Supervisor: string;
  EquipeSaida: string;
  EquipeEntrada: string;
  TecnicoPassa: string;
  TecnicoRecebe: string;
  StatusGeral: string;
  Pendencias: string;
  Observacoes: string;
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
  fetchedAt: number;
}
