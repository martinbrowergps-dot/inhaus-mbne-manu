/**
 * Converte string numérica (BR ou EN/US) para número float.
 * Detecta locale automaticamente:
 *   - "1.234,56" → BR (milhar = ponto, decimal = vírgula) → 1234.56
 *   - "25.3"     → EN (decimal = ponto, sem milhar)       → 25.3
 *   - "1,234.56" → EN (decimal = ponto com vírgula de separador) → 1234.56
 * Regra: se existe vírgula E ponto, conta qual aparece mais à direita.
 * O caractere mais à direita é tratado como separador decimal.
 */
export function parseNumberSafe(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const raw = String(value).trim();

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  // Ambos presentes: decide locale pela posição
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      // BR: milhar é ponto (joga fora), decimal é vírgula
      const cleaned = raw.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    } else {
      // EN/US: milhar é vírgula (joga fora), decimal é ponto
      const cleaned = raw.replace(/,/g, "");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
  }

  // Só ponto OU só vírgula: trata o único como decimal
  if (lastDot >= 0 && lastComma < 0) {
    const cleaned = raw.replace(/,/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (lastComma >= 0 && lastDot < 0) {
    const cleaned = raw.replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // Sem pontuação: inteiro puro
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Versão com fallback para `null` em vez de `0`. */
export function parseNumberSafeOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const raw = String(value).trim();

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      const cleaned = raw.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : null;
    } else {
      const cleaned = raw.replace(/,/g, "");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : null;
    }
  }

  if (lastDot >= 0 && lastComma < 0) {
    const cleaned = raw.replace(/,/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (lastComma >= 0 && lastDot < 0) {
    const cleaned = raw.replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

// -- legacy aliases compatíveis com call-sites existentes --

/** BR-pessimista: sempre trata ponto como milhar (ignora) e vírgula como decimal. */
export function parseBRNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseBRNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatBRNumber(n: number, digits = 1): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

function tryParseDate(s: string): Date | null {
  // dd/MM/yyyy or dd/MM/yyyy HH:mm(:ss)?
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const [, d, mo, y, h, mi, se] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0), Number(se ?? 0));
  }
  // yyyy-MM-dd or yyyy-MM-dd HH:mm(:ss)? or ISO with T
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0), Number(se ?? 0));
  }
  // dd/MMM/yyyy (e.g. 01/Jan/2024)
  m = s.match(/^(\d{1,2})\/([A-Za-z]{3,})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const [, d, moStr, y, h, mi, se] = m;
    const mo = months[moStr.toLowerCase().slice(0, 3)];
    if (mo !== undefined) return new Date(Number(y), mo, Number(d), Number(h ?? 0), Number(mi ?? 0), Number(se ?? 0));
  }
  return null;
}

export function parseBRDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = tryParseDate(s);
  if (d && !isNaN(d.getTime())) return d;
  // Excel serial date number (e.g. 45123.456)
  const num = parseFloat(s.replace(",", "."));
  if (Number.isFinite(num) && num > 40000 && num < 200000) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + num * 86_400_000);
  }
  // Last resort: native Date.parse
  const native = new Date(s);
  if (!isNaN(native.getTime())) return native;
  return null;
}

export function formatBRDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatBRDateTime(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameWeek(a: Date, b: Date): boolean {
  return getWeekStart(a).getTime() === getWeekStart(b).getTime();
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
