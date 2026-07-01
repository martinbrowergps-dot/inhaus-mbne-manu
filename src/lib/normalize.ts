/** Case/accent-insensitive normalization. */
export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type TipoCanonico =
  | "Preventiva"
  | "Corretiva"
  | "Preditiva"
  | "Quebra de Programação"
  | "Não Planejada"
  | "Melhoria"
  | "Outro";

/** Maps free-text `Tipo` column values into the canonical closed list. */
export function normalizeTipo(raw: string | null | undefined): TipoCanonico {
  const n = normalize(raw);
  if (!n) return "Outro";
  if (/quebra|qp\b|nao programad/.test(n)) return "Quebra de Programação";
  if (/nao planej|n planej|np\b/.test(n)) return "Não Planejada";
  if (/prevent/.test(n)) return "Preventiva";
  if (/corret/.test(n)) return "Corretiva";
  if (/predit/.test(n)) return "Preditiva";
  if (/melhor/.test(n)) return "Melhoria";
  return "Outro";
}

export const TIPOS_CANONICOS: TipoCanonico[] = [
  "Preventiva",
  "Corretiva",
  "Preditiva",
  "Quebra de Programação",
  "Não Planejada",
  "Melhoria",
  "Outro",
];
