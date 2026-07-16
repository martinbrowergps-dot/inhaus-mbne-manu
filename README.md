# IN HAUS Industrial — Centro de Controle de Manutenção

Painel executivo de manutenção industrial. Leitura de Google Sheets como banco de dados, sem backend próprio. Hospedado no Lovable.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start (React 19) |
| Build | Vite 8 + Nitro |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Roteamento | TanStack Router (file-based) |
| Dados | TanStack Query + Google Sheets (gviz/tq CSV) |
| Gráficos | Recharts |
| Export | jsPDF + html-to-image + html2canvas |
| Testes | Vitest 4 |

## Rápido

```bash
npm install
npm run dev          # dev server
npm run build        # produção
npm run test         # testes unitários
npx tsc --noEmit     # typecheck
```

## Estrutura

```
src/
├── __tests__/           # Testes unitários (vitest)
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── visao-geral/     # gráficos reutilizáveis (ChartPie, ChartDonut, ChartBarHorizontal)
│   └── *.tsx            # componentes compostos (DataTable, KpiCard, Panel, ExportButton, etc.)
├── hooks/
│   └── use-date-filter  # filtro global de datas (sidebar)
├── lib/
│   ├── domain/          # ❗ LÓGICA DE NEGÓCIO PURA (sem React)
│   │   ├── aggregates.ts     # agregações (por mês, por cargo, quebras…)
│   │   ├── observations.ts   # extração de observações de OS
│   │   ├── programacao-filter.ts  # hook useProgramacaoFilter (filter + enrich)
│   │   └── tag-map.ts        # mapeamento TAG → Equipamento/Máquina
│   ├── chart-utils.ts   # helpers de gráfico (cores, eixos, aggregate, prio badges)
│   ├── export-csv.ts    # builder CSV com BOM
│   ├── export-pdf.ts    # export PDF visual + tabela
│   ├── format.ts        # ❗ formatação/parse de datas e números BR
│   ├── pdf-css-patch.ts # patch oklch→hex para html2canvas
│   ├── pdf-report.ts    # relatório executivo PDF
│   ├── sheets-schema.ts # ❗ validação de headers/rows do Sheets
│   ├── sheets-types.ts  # ❗ tipos TypeScript (ProgramacaoRow, NcRow, etc.)
│   ├── sheets.ts        # ❗ fetch + parse de TODAS as abas do Google Sheets
│   ├── status.ts        # ❗ deriveExecStatus + constantes de status
│   ├── temperature.ts   # helpers de temperatura
│   └── utils.ts         # cn() (tailwind-merge + clsx)
├── routes/              # Páginas (file-based routing)
│   ├── __root.tsx       # Layout raiz
│   ├── _app.tsx         # Layout autenticado/sidebar
│   ├── _app.index.tsx   # Visão Geral (/)
│   ├── _app.ativos.tsx  # Ativos (/ativos)
│   ├── _app.backlog.tsx # Backlog
│   ├── _app.checklists.tsx  # Planos de Manutenção
│   ├── _app.hh-semanal.tsx  # HH Semanal
│   ├── _app.indicadores.tsx # Indicadores
│   ├── _app.nc.tsx      # NC
│   ├── _app.passagem-turno.tsx
│   ├── _app.preditivas.tsx  # Preditiva - SEMEQ
│   ├── _app.programacao.tsx # Programação Semanal
│   ├── _app.relatorios.tsx  # Relatórios
│   ├── _app.temperaturas.tsx
│   └── _app.alertas.tsx
└── styles.css
```

## Mapa Sheets → Tipos

| Aba Google Sheets | Tipo TypeScript | Rota |
|---|---|---|
| PROGRAMAÇÃO | `ProgramacaoRow` | todas |
| MEDIÇÕES | `MedicaoRow` | Temperaturas |
| CHECKLIST DOCAS | `ChecklistRow` | Planos de Manutenção |
| CHECKLIST GERAL | `ChecklistRow` | Planos de Manutenção |
| CHECKLIST PORTAS | `ChecklistRow` | Planos de Manutenção |
| PASSAGEM DE TURNO | `PassagemTurnoRow` | Passagem de Turno |
| TECNICOS | `TecnicoRow` | Visão Geral |
| PARAMETROS_HH | `ParametroHHRow` | HH Semanal |
| BACKLOG | `BacklogRow` | Backlog |
| NC | `NcRow` | NC |
| PREDITIVA | `PreditivaRow` | Preditivas |
| PLANO DE MANUTENÇÃO | `PlanoManutencaoRow` | Ativos (mapa TAG→Equipamento) |

## Arquitetura (Decisões)

### Read-only com Google Sheets como banco

O app é **read-only**. Google Sheets é o banco de dados de escritura (editado manualmente ou por outro sistema). O app lê via Google Visualization API (`gviz/tq?tqx=out:csv`). Isso elimina necessidade de backend próprio, auth, ou escrita concorrente.

**Trade-off assumido**: latência de fetch (~1-3s), sem writes, sem cache server-side.

### Sem estado global além do TanStack Query

Dados fluem de `sheetsQueryOptions` (fetch + cache com staleTime 5min). Cada página filtra e agrega localmente. Não há Redux/Zustand — o estado é derivado dos dados brutos.

### UseProgramacaoFilter (hook central)

Toda página que exibe OS usa o mesmo padrão:
1. `useQuery(sheetsQueryOptions)`
2. `useDateFilter()` (sidebar global)
3. Filtrar por data → enriquecer com `deriveExecStatus` + `tagMap`

Esse padrão está encapsulado em `useProgramacaoFilter()` em `lib/domain/programacao-filter.ts`.

### Separação de concerns

- **`lib/domain/`**: lógica pura (sem React, sem fetch). Testável.
- **`lib/*.ts`**: utilitários de formatação, export, chart helpers.
- **`components/`**: UI reutilizável (DataTable, KpiCard, Panel, gráficos).
- **`routes/`**: páginas — orquestram componentes e chamam domain.

### Testes

Testes unitários com Vitest cobrem as funções puras de `lib/` (format, status, aggregates, tag-map, observations). Não testam componentes React (por enquanto). A meta é cobrir >90% da lógica de transformação de dados.

### CSS e tema

Tailwind v4 com variáveis CSS no `:root` (via shadcn/ui). Tema escuro por default. Gráficos usam paleta Power BI (10 cores) + cores semânticas (status, criticidade).

### HTML2Canvas e oklch

O export PDF visual usa `html2canvas`. Como a lib não suporta `oklch()`/`oklab()`, o `onclone` callback faz patch no documento clonado — converte regras CSS com oklch para hex.

## ADR — Registro de Decisões Arquiteturais

### ADR-001: Google Sheets como fonte de dados
- **Contexto**: Sem backend, sem orçamento para DB. Planilha já usada pela operação.
- **Decisão**: Fetch via gviz/tq CSV. Sem write-back.
- **Consequências**: App read-only. Latência de rede. Mudança de schema da planilha quebra o app.

### ADR-002: TanStack Query como única camada de estado
- **Contexto**: Dados vêm de uma fonte (Sheets), sem mutações.
- **Decisão**: Sem estado global. Cada página deriva do query cache.
- **Consequências**: Sem problemas de sincronização. Cache simples (stale-while-revalidate).

### ADR-003: Sem testes de componente (por enquanto)
- **Contexto**: Time pequeno (1 dev), protótipo em produção mista.
- **Decisão**: Testar só funções puras em `lib/`. Componentes são testados visualmente (dev).
- **Consequências**: Risco de regressão visual não coberto. Trade-off aceito para velocidade.

### ADR-004: Export via html2canvas (em vez de PDF server-side)
- **Contexto**: App é client-side, sem servidor.
- **Decisão**: html2canvas captura DOM do navegador. jsPDF monta PDF.
- **Consequências**: Dependência de oklch→hex patch. Tamanho do bundle maior (~300KB gz).

## Como adicionar uma nova página

1. Criar `src/routes/_app.<nome>.tsx` (TanStack Router auto-registra).
2. Adicionar item no `items` array em `src/components/app-sidebar.tsx`.
3. Se usa OS: usar `useProgramacaoFilter()`.
4. Se usa aba diferente: adicionar fetch em `lib/sheets.ts` + tipo em `lib/sheets-types.ts`.

## Variáveis de ambiente

| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `SHEET_ID` | ✅ | `1WmfsQ0ATzSnuS3gkQKGbUAE623NKGHuHUPJ2SjihQmA` | ID da planilha Google Sheets |

(Não há outras variáveis — o app não tem backend, auth, ou serviços externos além do Google Sheets.)
