Adicionar exportação PDF em todas as páginas que hoje só têm CSV. O componente `ExportButton` já suporta PDF quando recebe `pdfTargetRef` — basta criar um `useRef` em cada página e passá-lo.

## Páginas a atualizar

- `src/routes/_app.programacao.tsx`
- `src/routes/_app.backlog.tsx`
- `src/routes/_app.temperaturas.tsx`
- `src/routes/_app.alertas.tsx`
- `src/routes/_app.checklists.tsx`
- `src/routes/_app.passagem-turno.tsx`
- `src/routes/_app.equipe.tsx`
- `src/routes/_app.hh-semanal.tsx`

Visão Geral e Indicadores já têm PDF.

## Mudanças por arquivo

Em cada um:
1. `import { useRef } from "react"` (se ainda não importado).
2. Criar `const pdfRef = useRef<HTMLDivElement>(null)`.
3. Envolver o conteúdo principal (header + painéis) em `<div ref={pdfRef} className="space-y-...">`.
4. No `<ExportButton>`, passar `pdfTargetRef={pdfRef}` e `pdfTitle="<Nome da página> · Centro de Controle"`.

Sem novas dependências. Sem mudar layout visual.
