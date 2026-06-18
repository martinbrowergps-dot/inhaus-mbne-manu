
# Martin Brower CDNE — Centro de Controle de Manutenção Industrial

Dashboard executivo dark-blue premium estilo "sala de controle", lendo dados ao vivo da planilha Google pública via CSV export, com refresh automático a cada 5 minutos.

## Pré-requisito (ação do usuário)

A planilha precisa estar configurada como **"Qualquer pessoa com o link → Leitor"**. Sem isso o app não conseguirá ler. Confirme antes de eu construir.

## Arquitetura técnica

- **Stack**: React + TypeScript + Tailwind v4 + Shadcn UI + Recharts + Lucide (já no template TanStack Start).
- **Fonte de dados**: fetch direto do endpoint `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=<NOME_ABA>` para cada aba. Parse com `papaparse`.
- **Server function** (`src/lib/sheets.functions.ts`): faz o fetch das 8 abas em paralelo no servidor (evita CORS, cache do edge). Retorna DTO normalizado.
- **TanStack Query**: `useSuspenseQuery` com `refetchInterval: 5 * 60_000` e `staleTime: 5min`. Botão "Atualizar" chama `queryClient.invalidateQueries`.
- **Loader na rota raiz `_app`** prime o cache; cada página consome o mesmo query.

## Identidade visual

Tokens em `src/styles.css` (`@theme inline`):
- `--background: #02152D`, `--card: #05254A`
- `--primary: #0EA5FF`, `--secondary: #1D4ED8`
- `--success: #22C55E`, `--warning: #EAB308`, `--destructive: #EF4444`
- `--foreground: #FFFFFF`, `--muted-foreground: #94A3B8`
- Gradientes: `--gradient-card`, `--gradient-glow`; shadows `--shadow-elevated`, `--shadow-glow-cyan`
- Glassmorphism leve: `backdrop-blur` + borda `1px solid rgba(14,165,255,0.15)` iluminada
- Animações: `pulse-critical` (vermelho pulsante), `fade-in-up`, transições suaves 200ms
- Fonte: Inter (já no template) + JetBrains Mono para números KPI

## Estrutura de rotas (TanStack file-based)

```
src/routes/
  __root.tsx                  # shell + QueryClient + html head
  _app.tsx                    # layout: sidebar fixa + header sticky + <Outlet/>
  _app.index.tsx              # Visão Geral (dashboard executivo)
  _app.programacao.tsx        # Tabela completa de OS
  _app.equipe.tsx             # Técnicos cadastrados
  _app.hh-semanal.tsx         # Capacidade vs alocação
  _app.temperaturas.tsx       # Cards por local
  _app.checklists.tsx         # 3 painéis + passagem
  _app.passagem-turno.tsx     # Tabela com filtros
  _app.alertas.tsx            # Central de alertas
  _app.indicadores.tsx        # Gráficos consolidados
```

## Componentes principais

- `<AppSidebar/>` — sidebar shadcn collapsible com 9 itens, ícones Lucide, item ativo iluminado
- `<TopHeader/>` — logo "MARTIN BROWER CDNE", subtítulo, badge "● Online" verde, última atualização, botão Atualizar
- `<KpiCard/>` — variantes (primary/success/warning/danger), valor grande mono, ícone, delta opcional
- `<ChartCard/>` — wrapper com título e Recharts (pizza, donut, barras, barras horizontais)
- `<TempCard/>` — local, temperatura grande, técnico, hora, status; animação pulsante quando crítico
- `<DataTable/>` — pesquisa, filtros (Select por coluna), ordenação, paginação (TanStack Table)
- `<AlertItem/>` — prioridade colorida, ícone, descrição, timestamp
- `<HHGauge/>` — barra de ocupação verde/amarelo/vermelho

## Lógica de cálculos

- **Faixas de temperatura**:
  - Antecâmara: 1°C–7°C
  - Congelados: -23°C a -20°C
  - Resfriados: 1°C–4°C
  - Status: Normal (dentro), Alerta (±1°C borda), Crítico (fora)
- **HH**: por cargo, somar `HH` da PROGRAMAÇÃO agrupado por Cargo; comparar com `PARAMETROS_HH.HH_Semana`. Ocupação% define cor.
- **Alertas auto-gerados**: agrega temperaturas fora da faixa + HH > 100% + OS criticidade AA com Status≠Finalizada + OS com DataProgramada < hoje e StatusExecucao≠Finalizada + falta de checklist do dia + falta de passagem de turno do turno corrente.

## Tratamento de dados ausentes / robustez

- Parser tolerante a colunas faltantes (zod com `.optional()` por campo)
- Estado vazio "Sem registros" em todas as listas
- Skeleton loaders durante fetch
- Erro de fetch → toast + botão retry, mantém último snapshot

## Detalhes técnicos chave

- `papaparse` adicionado via `bun add papaparse @types/papaparse`
- `@tanstack/react-table` para tabelas (já alinha com shadcn)
- Datas BR (dd/mm/yyyy) — utilitário `parseBRDate` + `date-fns` (já no template)
- Todos os valores numéricos exibidos formatados pt-BR
- Refresh manual e auto não conflitam (uso de `queryClient.invalidateQueries`)

## Entrega

Construo tudo de uma vez: 9 páginas funcionando, lendo a planilha real, com refresh 5min, identidade visual completa, sidebar colapsável, alertas e gráficos.

**Aprove para eu começar.** Confirme também se a planilha já está pública com link.
