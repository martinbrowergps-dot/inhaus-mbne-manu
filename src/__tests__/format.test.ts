import { describe, it, expect } from "vitest";
import {
  parseBRNumber,
  parseNumberSafe,
  parseNumberSafeOrNull,
  formatBRNumber,
  formatInt,
  parseBRDate,
  formatBRDate,
  formatDateBR,
  getWeekStart,
} from "@/lib/format";

describe("parseBRNumber", () => {
  it("converte string BR para número", () => {
    expect(parseBRNumber("1.234,56")).toBe(1234.56);
  });
  it("converte vírgula decimal", () => {
    expect(parseBRNumber("99,9")).toBe(99.9);
  });
  it("lida com null/undefined", () => {
    expect(parseBRNumber(null)).toBe(0);
    expect(parseBRNumber(undefined)).toBe(0);
  });
  it("retorna número diretamente", () => {
    expect(parseBRNumber(42)).toBe(42);
  });
  it("valor vazio retorna 0", () => {
    expect(parseBRNumber("")).toBe(0);
  });
});

describe("formatBRNumber", () => {
  it("formata com locale BR", () => {
    // 1234.5 -> "1.234,5"
    expect(formatBRNumber(1234.5, 1)).toBe("1.234,5");
  });
  it("usa dígitos configuráveis", () => {
    expect(formatBRNumber(1.2, 2)).toBe("1,20");
  });
});

describe("formatInt", () => {
  it("formata inteiro BR", () => {
    expect(formatInt(1234)).toBe("1.234");
  });
});

describe("parseBRDate", () => {
  it("parse dd/MM/yyyy", () => {
    const d = parseBRDate("15/03/2025");
    expect(d).not.toBeNull();
    expect(d!.getDate()).toBe(15);
    expect(d!.getMonth()).toBe(2); // 0-indexed
    expect(d!.getFullYear()).toBe(2025);
  });
  it("parse yyyy-MM-dd", () => {
    const d = parseBRDate("2025-03-15");
    expect(d).not.toBeNull();
    expect(d!.getDate()).toBe(15);
    expect(d!.getMonth()).toBe(2);
  });
  it("retorna null para valor vazio", () => {
    expect(parseBRDate("")).toBeNull();
    expect(parseBRDate(null)).toBeNull();
    expect(parseBRDate(undefined)).toBeNull();
  });
  it("parse ISO datetime", () => {
    const d = parseBRDate("2025-03-15T10:30:00");
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(10);
    expect(d!.getMinutes()).toBe(30);
  });
  it("parse dd/MM/yyyy HH:mm", () => {
    const d = parseBRDate("15/03/2025 08:45");
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(8);
    expect(d!.getMinutes()).toBe(45);
  });
});

describe("formatBRDate", () => {
  it("formata Date para string BR", () => {
    const d = new Date(2025, 2, 15);
    expect(formatBRDate(d)).toBe("15/03/2025");
  });
  it("retorna — para null", () => {
    expect(formatBRDate(null)).toBe("—");
  });
});

describe("formatDateBR", () => {
  it("converte ISO yyyy-MM-dd para dd/MM/yyyy", () => {
    expect(formatDateBR("2025-03-15")).toBe("15/03/2025");
  });
  it("lida com string vazia", () => {
    expect(formatDateBR("")).toBe("");
  });
});

describe("getWeekStart", () => {
  it("segunda-feira é início da semana", () => {
    // 2025-03-17 é segunda
    const d = new Date(2025, 2, 19); // quarta
    const start = getWeekStart(d);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(17);
  });
});

describe("parseNumberSafe", () => {
  it("BR: milhar + decimal (1.234,56)", () => {
    expect(parseNumberSafe("1.234,56")).toBe(1234.56);
  });
  it("EN: decimal only (25.5) — NOT mangled to 255", () => {
    expect(parseNumberSafe("25.5")).toBe(25.5);
  });
  it("EN: milhar + decimal (1,234.56)", () => {
    expect(parseNumberSafe("1,234.56")).toBe(1234.56);
  });
  it("BR: vírgula decimal (99,9)", () => {
    expect(parseNumberSafe("99,9")).toBe(99.9);
  });
  it("integer string (42)", () => {
    expect(parseNumberSafe("42")).toBe(42);
  });
  it("number passthrough", () => {
    expect(parseNumberSafe(42)).toBe(42);
  });
  it("null/undefined/empty → 0", () => {
    expect(parseNumberSafe(null)).toBe(0);
    expect(parseNumberSafe(undefined)).toBe(0);
    expect(parseNumberSafe("")).toBe(0);
  });
  it("non-numeric → 0", () => {
    expect(parseNumberSafe("abc")).toBe(0);
  });
});

describe("parseNumberSafeOrNull", () => {
  it("null/undefined/empty → null", () => {
    expect(parseNumberSafeOrNull(null)).toBeNull();
    expect(parseNumberSafeOrNull(undefined)).toBeNull();
    expect(parseNumberSafeOrNull("")).toBeNull();
  });
  it("EN decimal (25.5) → 25.5", () => {
    expect(parseNumberSafeOrNull("25.5")).toBe(25.5);
  });
  it("BR decimal (99,9) → 99.9", () => {
    expect(parseNumberSafeOrNull("99,9")).toBe(99.9);
  });
  it("non-numeric → null", () => {
    expect(parseNumberSafeOrNull("abc")).toBeNull();
  });
  it("number passthrough", () => {
    expect(parseNumberSafeOrNull(7)).toBe(7);
  });
});
