
# Especificação Técnica — Ajustes Dashboard PCM (Martin Brower CDNE)

Documento de especificação executável. Cada seção descreve: **o que muda**, **como deve funcionar**, **regras de cálculo/filtro** e **dependências**. Ao final há o mapa de consistência entre filtros e componentes.

---

## 0. Fundamento: `FiltersContext` global

Antes dos ajustes individuais, é necessário criar um **contexto único de filtros** consumido por todas as páginas. Hoje cada página lê `sheetsQueryOptions` e filtra localmente, o que causa divergência entre KPIs.

**O que muda**
- Novo `src/lib/filters-context.tsx` expõe `useFilters()` com estado sincronizado à URL via `validateSearch` (TanStack Router).
- Novo componente `GlobalFiltersBar` no `TopHeader` (persistente em todas as rotas `_app.*`).

**Estado do filtro (search params)**
```
dataInicial   ISO yyyy-mm-dd | undefined
dataFinal     ISO yyyy-mm-dd | undefined
semana        ISO week "2026-W25" | undefined
sistema       string[] (multi)
tipo          string[] (multi)  // Preventiva, Corretiva, Quebra de Programação, Não Planejada...
status        ExecStatus[] (multi)
responsavel   string[] (multi)  // Executante
criticidade   string[] (multi)
```

**Comportamento padrão (nenhum filtro selecionado)**
- `dataInicial`/`dataFinal` → **mês corrente** (1º dia às 00:00 até hoje 23:59).
- `semana` → semana ISO corrente.
- Multi-selects vazios = "todos".
- Botão "Limpar filtros" e "Últimos 7/30/90 dias" como atalhos.

**Regra crítica**: todo componente (KPI, gráfico, tabela) deve importar `useFilteredProgramacao()` / `useFilteredBacklog()` / etc. — hooks derivados que já aplicam o filtro. **Proibido** filtrar `data.programacao` diretamente em uma página.

**Dependências**: afeta todas as rotas `_app.*`, `sheets.ts` (não muda), `router.tsx` (registrar provider no `__root.tsx`).

---

## 1. Filtro por período global

**O que muda**
- `GlobalFiltersBar` inclui dois `DatePicker` (Data Inicial / Data Final) + presets ("Hoje", "Semana atual", "Mês atual", "Últimos 30 dias", "Personalizado").
- Todos os componentes consomem `useFilteredProgramacao()`.

**Como deve funcionar**
- Selecionar `01/06/2026` → `23/06/2026`: **toda** a página (KPIs, gauges, gráficos, tabelas) re-renderiza mostrando apenas OS cuja `DataProgramada` (ou `DataReprogramada`, se preenchida) cai no intervalo, **inclusivo**.
- Persistir na URL: `?dataInicial=2026-06-01&dataFinal=2026-06-23` (compartilhável).
- Se `dataInicial > dataFinal`: mostrar toast de erro, manter valores anteriores.

**Regra de cálculo do "período efetivo" de uma OS**
```
dataRef = parseBRDate(row.DataReprogramada) ?? parseBRDate(row.DataProgramada)
incluir = dataRef && dataRef >= dataInicial && dataRef <= dataFinal
```
Linhas sem data válida → **excluídas** dos KPIs baseados em período (aparecem apenas em uma seção "Sem data").

**Dependências**: `_app.index.tsx`, `_app.indicadores.tsx`, `_app.programacao.tsx`, `_app.hh-semanal.tsx`, `_app.equipe.tsx`, `_app.alertas.tsx`.

---

## 2. KPI "Quebra de Programação"

**O que muda**
- Novo `KpiCard` no painel de indicadores principais (Visão Geral + Indicadores).

**Regra de cálculo**
```
quebraProgramacao = programacaoFiltrada.filter(
  os => normalize(os.Tipo) === "quebra de programacao"
).length
```
- Usa `programacaoFiltrada` (já respeita período + sistema + responsável + demais filtros ativos).
- Fonte: coluna `Tipo` da aba `PROGRAMAÇÃO`.
- **Não** deriva de status — precisa vir explícito da planilha.

**Exibição**
- Variante `warning`, ícone `AlertTriangle`.
- Hint: `"{n} no período · {pct}% do total programado"`.

**Dependência**: exige que a coluna `Tipo` esteja preenchida com valor canônico. Documentar em `AGENTS.md` a lista fechada: `Preventiva | Corretiva | Preditiva | Quebra de Programação | Não Planejada | Melhoria`.

---

## 3. Seção Programação redesenhada

**O que muda**
- Reescrita de `_app.programacao.tsx` mantendo as abas atuais mas com estrutura visual padronizada Planejado × Executado.

**Layout proposto (wireframe textual)**
```
┌─────────────────────────────────────────────────────────────┐
│ [Diária] [Semanal] [Mensal] [Tabela]      [Filtros globais] │
├─────────────────────────────────────────────────────────────┤
│ TIMELINE SEMANAL (aba Semanal)                              │
│  Seg 16 │ Ter 17 │ Qua 18 │ Qui 19 │ Sex 20 │ Sáb 21 │ Dom │
│  ▓▓░░░  │ ▓▓▓░░  │ ▓░░░░  │ ▓▓▓▓▓  │ ▓▓▓░░  │ ▓░░░░  │ ─  │
│  8/12   │ 6/9    │ 2/8    │ 10/10  │ 5/7    │ 1/3    │ 0  │
│  (exec/prog — cor verde se ≥90%, âmbar 60-89%, vermelho <60%)│
├─────────────────────────────────────────────────────────────┤
│ CARDS DIÁRIOS (uma linha por dia da semana selecionada)     │
│ ┌── Segunda 16/06 ─────────────────────────────────────┐    │
│ │ Planejado: 12 OS · 48h HH                            │    │
│ │ Executado: 8 OS · 32h HH  (Aderência 66,7%)          │    │
│ │ ─────────────────────────────────────────────────    │    │
│ │ Refrigerista (João): 5 prog / 4 exec                 │    │
│ │ Meio Oficial (Carlos): 7 prog / 4 exec               │    │
│ │ [Ver OS ▾]  ← expande lista Planejado | Executado    │    │
│ └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Regras**
- **Planejado** = OS com `StatusExecucao ∈ PROGRAMADO_STATUSES` no dia.
- **Executado** = OS com `StatusExecucao ∈ EXECUTADO_STATUSES` no dia (data efetiva = `DataReprogramada ?? DataProgramada`).
- Distribuição por dia usa a **data efetiva**; se OS foi reprogramada, aparece só no dia novo.
- Cards diários mostram lado a lado duas colunas: `Planejado` (ícone calendário) e `Executado` (ícone check).

**Dependências**: usa `deriveExecStatus` já existente; requer helper novo `groupByDay(rows, weekStart)`.

---

## 4. Backlog simplificado

**O que muda**
- Remover **todos** os gráficos e cards de KPI de `_app.backlog.tsx`.
- Manter apenas: cabeçalho com contagem total + `ExportButton` + `DataTable` (já existente).

**Colunas da tabela** (todas ordenáveis + busca global)
```
Número | Identificação | Solicitante | Data Criação | Assunto |
Técnico | Prioridade | Data Vencimento | Estado | Grupo |
Status Oficial | HH Estimado | Idade (dias)
```

**Filtros locais adicionais** (barra acima da tabela, além dos globais)
- Prioridade (multi)
- Estado (multi)
- Status Oficial (multi)
- Vencimento: "Vencidas" / "Vencem em 7 dias" / "Todas"

**Regra**
- "Idade" = `hoje - DataCriacao` em dias.
- Linha destacada em `text-destructive` se `DataVencimento < hoje` e estado ≠ "Concluído".

**Dependências**: nenhuma além do `DataTable` atual.

---

## 5. HH Semanal — correção da lógica

### Lógica atual (incorreta)
```ts
// _app.hh-semanal.tsx
for (const p of data.programacao) {
  alocadoByCargo.set(key, (alocadoByCargo.get(key) ?? 0) + (p.HH || 0));
}
```
Soma **toda** a aba PROGRAMAÇÃO — inclui OS de semanas passadas e futuras, inflando a ocupação artificialmente. Também ignora status (OS canceladas continuam alocando HH).

### Nova lógica

**O que muda**
- Adicionar seletor de semana (`WeekPicker`) no topo da página, default = semana ISO atual.
- Cálculo respeita a semana selecionada **e** os filtros globais.

**Regra de cálculo**
```
weekStart = segunda da semana selecionada 00:00
weekEnd   = domingo da semana selecionada 23:59:59

osDaSemana = programacaoFiltrada.filter(os => {
  const d = parseBRDate(os.DataReprogramada) ?? parseBRDate(os.DataProgramada)
  return d && d >= weekStart && d <= weekEnd
    && deriveExecStatus(os) !== "Cancelada"   // canceladas não consomem HH
})

alocadoByCargo[cargo] = sum(osDaSemana.filter(o => normalize(o.Cargo)===cargo).HH)
disponivelByCargo[cargo] = PARAMETROS_HH.HH_Semana * headcount(cargo)
ocupacao = alocado / disponivel * 100
```

**Exibir também**:
- Coluna "Executado" = soma HH das OS `Finalizada` na semana → medir aderência real (`executado/alocado`).
- Navegação `← Semana anterior | Semana X (dd/mm–dd/mm) | Semana seguinte →`.

**Dependências**: usa `parametrosHH` da planilha; exige coluna `HH_Semana` correta por cargo; `headcount` vem de `tecnicos` agrupado por `Cargo`.

---

## 6. Painel de Indicadores Principais (6 KPIs)

**O que muda**
- Bloco unificado no topo de `_app.index.tsx` e `_app.indicadores.tsx`, todos consumindo `programacaoFiltrada`.

| # | KPI | Cálculo | Variante |
|---|-----|---------|----------|
| 1 | **Total OS Programadas** | `count(programacaoFiltrada)` | primary |
| 2 | **Executadas** | `count(status ∈ {Finalizada})` | success |
| 3 | **Pendentes** | `count(status ∈ {Programada, Em execução, Pausada, Reprogramada, Atrasada})` | warning |
| 4 | **Quebra de Programação** | `count(Tipo == "Quebra de Programação")` | warning |
| 5 | **Anormais** | `count(status == "Atrasada") + count(reprogramações > 1)` | danger |
| 6 | **Não Planejadas** | `count(Tipo == "Não Planejada")` | neutral |

**Regras comuns**
- Todos respeitam **todos** os filtros globais (período + sistema + tipo + status + responsável).
- Cada card mostra hint com `% do total programado` no período.
- Clique no card → navega para `/programacao` com o filtro correspondente já aplicado via URL.

**Dependências**: `FiltersContext`, `deriveExecStatus`, coluna `Tipo` normalizada.

---

## 7. Atividades Canceladas — justificativa obrigatória

**O que muda (planilha + app)**
- Nova coluna na aba `PROGRAMAÇÃO`: `MotivoCancelamento` (texto livre, mín. 10 caracteres).
- `sheets-types.ts`: adicionar `MotivoCancelamento?: string` em `ProgramacaoRow`.
- `sheets.ts`: mapear em `pick(r, "MotivoCancelamento", "Motivo Cancelamento")`.

**Regra**
- Uma OS com `StatusExecucao == "Cancelada"` **sem** `MotivoCancelamento` preenchido aparece:
  - Em `_app.alertas.tsx` como alerta crítico "Cancelamento sem justificativa".
  - Marcada em vermelho na tabela de programação.
  - Excluída dos gráficos de aderência (não conta como executada nem cancelada válida — vai para bucket "Pendência de justificativa").

**Exibição**
- Tooltip no badge "Cancelada" mostra o motivo ao passar o mouse.
- Coluna opcional "Motivo" na `DataTable` de programação.

**Dependências**: exige atualização da planilha antes do deploy; validação no `sheets.ts` gera warning no console em dev.

---

## 8. Gráfico de Barras — incluir "Não Planejadas"

**O que muda**
- Gráfico atual de "Finalizadas × Canceladas" (Visão Geral e Indicadores) ganha terceira barra.

**Novo dataset por período (dia/semana/mês conforme granularidade da tela)**
```
[
  { periodo: "Sem 24", finalizadas: 45, canceladas: 3, naoPlanejadas: 12 },
  { periodo: "Sem 25", finalizadas: 52, canceladas: 1, naoPlanejadas: 8 },
  ...
]
```

**Regras**
- `naoPlanejadas` = `count(Tipo == "Não Planejada")` no bucket.
- Cores: `finalizadas` = `--success`, `canceladas` = `--destructive`, `naoPlanejadas` = `--warning`.
- Tooltip do Recharts mostra os 3 valores + total.
- Legenda clicável (esconde/mostra série).

**Dependências**: mesmo dataset já filtrado; sem mudança em `sheets.ts`.

---

## 9. Mapa de Consistência (Filtros × Componentes)

Matriz que **deve** ser satisfeita — todo "✓" significa "o componente re-renderiza quando o filtro muda":

| Componente | Período | Semana | Sistema | Tipo | Status | Responsável | Criticidade |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| KPIs Visão Geral (1–6) | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gráfico Barras Fin/Canc/NP | ✓ | – | ✓ | ✓ | – | ✓ | ✓ |
| Programação · Diária | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Programação · Semanal | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Programação · Mensal | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| HH Semanal | – | ✓ | ✓ | ✓ | (exclui Cancelada) | ✓ | – |
| Backlog | ✓ (DataCriacao) | – | – | – | – | ✓ (Técnico) | ✓ (Prioridade) |
| Alertas | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Indicadores | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Equipe | ✓ | – | – | – | – | ✓ | – |
| Temperaturas | ✓ (DATA) | – | – | – | – | ✓ (TECNICO) | – |

`–` = filtro não se aplica àquele componente (ex.: Backlog não tem "Sistema").

---

## 10. Ordem de implementação sugerida

1. **Base** — criar `FiltersContext` + `GlobalFiltersBar` + hooks derivados (`useFilteredProgramacao`, etc.).
2. **KPIs** — refatorar cards de `_app.index.tsx` e `_app.indicadores.tsx` para os 6 KPIs definidos.
3. **HH Semanal** — corrigir cálculo + adicionar `WeekPicker`.
4. **Programação** — nova aba Semanal (timeline) + cards diários redesenhados.
5. **Backlog** — remover gráficos, adicionar filtros locais.
6. **Cancelamentos** — nova coluna, alertas, tooltip.
7. **Gráfico de barras** — adicionar série "Não Planejadas".
8. **QA de consistência** — validar a matriz da seção 9 aplicando cada filtro e conferindo cada componente.

---

## 11. Detalhes técnicos (para o dev)

- **Semana ISO**: usar `date-fns` (`startOfISOWeek`, `endOfISOWeek`, `getISOWeek`) — já no lockfile via `react-day-picker`.
- **URL sync**: `zodValidator` + `fallback()` no `_app.tsx` (search params herdados por todas as rotas filhas).
- **Performance**: memoizar `programacaoFiltrada` com `useMemo` no hook; TanStack Query cache continua servindo os dados brutos.
- **Normalização de `Tipo`**: helper `normalizeTipo()` que mapeia variações (`"Quebra"`, `"quebra de programação"`, `"QP"`) para valores canônicos — evitar quebrar KPI 4 por typo na planilha.
- **Testes manuais mínimos**: (a) definir período de 1 semana e conferir soma dos 6 KPIs = total da tabela; (b) trocar semana no HH e ver ocupação mudar; (c) filtrar por técnico e ver todos os cards atualizarem.

---

Aprovando este plano, sigo para a implementação começando pela **Base (seção 10 item 1)** e entrego cada bloco em turnos separados para você validar visualmente antes de avançar.
