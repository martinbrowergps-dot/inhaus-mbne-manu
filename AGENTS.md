<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Session Summary

## Goal

Implement dashboard improvements: fix bugs, add charts, expose fields, improve UX, add NC/PREDITIVAS pages, and enhance PDF export.

## Constraints & Preferences

- App is read-only (Google Sheets as database, no write-back forms)
- No photos needed for now
- Foco em dados de manutenção industrial (programação, temperatura, checklists/planos, backlog)

## Progress

### Done

- Added missing fields to ProgramacaoRow, PassagemTurnoRow, BacklogRow (incl. OQuePrecisa)
- Updated sheets.ts mapping to include all new fields
- Fixed status derivation bug in Visão Geral (uses deriveExecStatus() consistently)
- Added "PLANEJADO vs NÃO PLANEJADO" pie chart + "POR DIA" stacked bar chart (14 dias)
- Added "QUEBRA DE PROGRAMAÇÃO POR SOLICITANTE" horizontal bar chart
- Added Tipo, LocalMacro columns + filter in Programação table
- Expanded Passagem de Turno table with all new fields
- Added "O que precisa" column in Backlog table + search
- Rewrote Checklists page as "Plano de Manutenção" with full DataTable
- Mobile: filter date popover on small screens
- Prettier formatting pass; build + TypeScript passing with zero errors
- Created NC page (`/nc`) reading from real "NC" sheet (5 records): Código, Tipo, Categoria, Prioridade, Título, Responsável, Status
- Created PREDITIVAS page (`/preditivas`) reading from real "PREDITIVA" sheet (22 records): Código, Tipo, Categoria, Prioridade, Título, Objetivo, HH
- Sidebar: "Checklists" renamed to "Planos de Manutenção"; added "NC" and "Preditivas" links
- Aderência card: now shows breakdown (finalizadas no prazo, finalizadas c/ reprogramação, canceladas, pendentes) + total programadas + meta
- Aderência formula changed to `(finalizadas + canceladas) / total` (canceladas neutras)
- HH Semanal: defaults to current week; respects date filter if active
- Enhanced PDF export: exportVisualPdf (html2canvas DOM capture), exportExecutiveSummary (KPI dashboard PDF), ExportButton now offers CSV / PDF Tabela / PDF Visual + Resumo Executivo on Visão Geral
- PDF branding: header "MARTIN BROWER · IN HAUS INDUSTRIAL" + timestamp + footer with page numbers
- Fixed oklch/oklab color parsing in html2canvas by using `onclone` callback: reads all CSS rules, patches oklch/oklab to hex, injects into cloned document, removes external stylesheets — applied to both exportVisualPdf and exportExecutiveSummary
- Created RELATÓRIOS page (`/relatorios`) with visão semanal/mensal: KPIs, tabela agregada (OS, HH, planejadas, finalizadas, etc.), gráficos de OS/HH por período, status pie chart, quebras por solicitante; respeita filtro de data global; export CSV + PDF Visual + PDF Tabela

### In Progress

- (none)

### Blocked

- (none)

## Key Decisions

- Renamed "Checklists" to "Planos de Manutenção" because the data is the maintenance plan master (297 items per type), not executed checklists
- Created aggregateByDayAndStatus() with exact string match (`=== "Planejado"`) instead of regex to avoid false positives from "Não Planejado"
- NC and PREDITIVAS pages read from their own dedicated sheets (not filtered from programação)
- Aderência formula changed to treat canceladas as neutras: `(finalizadas + canceladas) / total`
- PDF visual export uses html2canvas `onclone` to patch oklch/oklab → hex in the cloned document because html2canvas does not support modern CSS color functions. Previous approach (patching real DOM `<style>` elements and restoring) was replaced because the CSS is in external `<link>` elements, not inline `<style>`.

## Critical Context

- Build and TypeScript compile cleanly (`npx tsc --noEmit`, `npm run build` both pass)
- **installLiveOverride fix**: CSS variables are now set as inline styles on `document.documentElement` (not via a `<style>` element with `:root`). Reason: `html-to-image` clones the element into an SVG foreignObject for `toPng`. In that context, `:root` selectors do NOT match the clone's root, causing CSS variable overrides to be ignored. By setting variables as inline styles on `<html>` in the live DOM, `getComputedStyle` resolves them to hex, and `html-to-image` inlines those hex values on the clone. This fixes both "black text on dark cards" (CSS variables not overridden) and "charts cut off" (Recharts oklch fill not parsed by html2canvas).
- Backlog: 48 valid rows after PapaParse filtering (estados: "Em Espera" e "Aberto") — page shows data correctly
- NC sheet headers: Código, Tipo, Categoria, Prioridade, Título, Objetivo, Descrição da Atividade, Procedimento, Critério de Aceitação, Evidências, HH Estimado, Responsável, Status
- PREDITIVA sheet headers: Código Referência, Tipo, Categoria, Prioridade, Título, Objetivo, Descrição da Atividade, HH
- StatusExecucao values: Cancelada (19), Finalizada (75), Programada (27)
- Status values: Não Planejado (19), Planejado (110)
- html2canvas installed as direct dependency; does not support oklch()/oklab() CSS color functions. Fix: use `onclone` callback to patch CSS rules in cloned document.
- CSV fetch uses `gviz/tq?tqx=out:csv&sheet=...` (Google Visualization API)

## Relevant Files

- `src/lib/sheets-types.ts`: all row interfaces (ProgramacaoRow, NcRow, PreditivaRow, etc.)
- `src/lib/sheets.ts`: fetch + parse logic, sheet ID = 1WmfsQ0ATzSnuS3gkQKGbUAE623NKGHuHUPJ2SjihQmA
- `src/routes/_app.index.tsx`: Visão Geral with all KPIs + chart components + executive summary
- `src/routes/_app.nc.tsx`: NC page reading from "NC" sheet
- `src/routes/_app.preditivas.tsx`: PREDITIVAS page reading from "PREDITIVA" sheet
- `src/routes/_app.hh-semanal.tsx`: default to current week, respects date filter if active
- `src/components/aderencia-card.tsx`: computeAderencia with new formula + breakdown display
- `src/components/export-button.tsx`: CSV / PDF Tabela / PDF Visual + optional Resumo Executivo
- `src/lib/export-pdf.ts`: exportTableToPdf, exportVisualPdf (html2canvas), exportExecutiveSummary — both html2canvas calls use `onclone` for oklch/oklab patching
- `src/lib/export-csv.ts`: CSV builder with BOM for Excel BR
- `src/components/app-sidebar.tsx`: navigation links (Planos de Manutenção, NC, Preditivas, Relatórios)
- `src/routes/_app.relatorios.tsx`: Relatórios page with weekly/monthly aggregation, KPIs, charts, and export
