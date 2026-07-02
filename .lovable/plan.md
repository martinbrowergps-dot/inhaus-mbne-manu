## Problema

O export "PDF Visual" (html2canvas) quebra com erro `oklab`/`oklch`. Já existe um patch em `getPatchedCss()` que substitui `oklch(...)` e `oklab(...)` nas regras de CSS clonadas, mas o erro persiste porque:

1. **Estilos inline** — Recharts, Radix e alguns componentes shadcn injetam `style="fill: oklch(...)"` / `stroke` / `background-color` diretamente nos elementos DOM (via CSS custom properties resolvidas em runtime). Esses valores não vivem em stylesheets, então o regex atual não os alcança.
2. **CSS custom properties** — `--primary`, `--destructive` etc. estão definidos em `oklch()` no `styles.css`. Quando um elemento faz `color: hsl(var(--primary))` ou `fill: var(--chart-1)`, o valor computado é `oklch(...)` e html2canvas falha ao parsear.
3. **Remoção agressiva de stylesheets** — o `onclone` atual remove TODOS os `<link rel="stylesheet">` e `<style>` e re-injeta só as regras patcheadas. Fontes web e alguns estilos de terceiros somem, mas o problema principal (inline) continua.

## Correção

### 1. Patchar `styles.css` no clone antes de qualquer coisa
Reescrever `getPatchedCss()` para também substituir as definições de custom properties em `:root`/`.dark` que usam `oklch`/`oklab` por equivalentes hex/rgb. Assim `var(--primary)` já resolve para uma cor html2canvas-safe.

### 2. Varrer o DOM clonado e sanitizar estilos inline
Dentro do `onclone`, percorrer `doc.querySelectorAll('*')` e:
- Ler `el.getAttribute('style')`; se contém `oklch(` ou `oklab(`, substituir por `#0EA5FF` (ou por uma cor derivada do nome da propriedade — primary=azul, destructive=vermelho, success=verde, warning=âmbar, muted=cinza).
- Para SVGs (Recharts), checar atributos `fill` e `stroke` e aplicar a mesma substituição.

### 3. Não remover stylesheets externas
Manter os `<link>`/`<style>` originais e apenas **acrescentar** um `<style>` no final do `<head>` do clone com overrides que redefinem `--primary`, `--destructive`, `--success`, `--warning`, `--muted`, `--foreground`, `--background`, `--card`, `--border`, `--chart-1..5` para valores hex. Como CSS respeita ordem, esse override vence sem quebrar fontes/layout.

### 4. Fallback com mapa de cores nomeadas
Definir um mapa fixo:
```
--primary       → #0EA5FF
--destructive   → #EF4444
--success       → #22C55E
--warning       → #EAB308
--muted         → #64748B
--foreground    → #0F172A
--background    → #FFFFFF
--card          → #FFFFFF
--border        → #E2E8F0
--chart-1..5    → paleta azul/verde/âmbar/vermelho/roxo
```
Isso garante que o PDF visual saia com as cores corporativas mesmo quando o parser falha.

### 5. Reforçar `exportExecutiveSummary`
Aplicar a mesma sanitização (a função hoje usa `getPatchedCss` + `makeOncloneInject`, então herda automaticamente).

### 6. Try/catch com fallback claro
Se `html2canvas` ainda falhar depois disso, mostrar toast: *"Não foi possível gerar PDF visual. Exportando como PDF tabular."* e chamar `exportTableToPdf` como fallback, em vez de deixar o erro estourar no console.

## Arquivos afetados

- `src/lib/export-pdf.ts` — reescrever `getPatchedCss` + `makeOncloneInject`, adicionar sanitização inline/SVG, adicionar mapa de cores.
- `src/components/export-button.tsx` — no `catch` do PDF visual, cair no `exportTableToPdf` como fallback.

## Sem impacto em

- PDF Tabela (`jspdf-autotable`) — não usa html2canvas.
- CSV — inalterado.
- Tema/UI da aplicação — patches vivem só no documento clonado do html2canvas.

Posso implementar assim?
