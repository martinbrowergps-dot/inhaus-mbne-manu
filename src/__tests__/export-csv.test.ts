import { describe, it, expect } from "vitest";
import { buildCsv, type CsvColumn } from "@/lib/export-csv";

function col<T>(header: string, fn: (row: T) => string | number | null | undefined): CsvColumn<T> {
  return { header, value: fn };
}

describe("buildCsv (escapeCell)", () => {
  it("prefixa =CMD com ' (CSV injection)", () => {
    const rows = [{ cmd: "=cmd|' /C calc'!A0" }];
    const result = buildCsv(rows, [col("cmd", (r) => r.cmd)]);
    expect(result).toContain("'=cmd|' /C calc'!A0");
  });

  it("prefixa +DDE com '", () => {
    const rows = [{ a: "+DDE" }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    expect(result).toContain("'+DDE");
  });

  it("prefixa -autoexec com '", () => {
    const rows = [{ a: "-JUNK" }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    expect(result).toContain("'-JUNK");
  });

  it("prefixa @hyperlink com '", () => {
    const rows = [{ a: "@SUM(A1:A10)" }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    expect(result).toContain("'@SUM(A1:A10)");
  });

  it("não prefixa texto normal", () => {
    const rows = [{ nome: "João" }];
    const result = buildCsv(rows, [col("nome", (r) => r.nome)]);
    expect(result).toBe("nome\nJoão");
  });

  it("escapa célula com ; (ponto e vírgula)", () => {
    const rows = [{ a: "valor;outro" }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    expect(result).toContain('"valor;outro"');
  });

  it("escapa célula com aspas duplas internas", () => {
    const rows = [{ a: 'ele disse "olá"' }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    expect(result).toContain('"ele disse ""olá"""');
  });

  it("não converte null em string vazia", () => {
    const rows = [{ a: null }, { a: undefined }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    // ambas devem aparecer como células vazias, não como "null" ou "undefined"
    expect(result).toBe("a\n\n");
  });

  it("célula vazia não quebra a linha", () => {
    const rows = [{ a: "" }];
    const result = buildCsv(rows, [col("a", (r) => r.a)]);
    expect(result).toBe("a\n");
  });

  it("múltiplas colunas mantêm ordem", () => {
    const rows = [{ nome: "Ana", cargo: "Mecânico" }];
    const result = buildCsv(rows, [
      col("nome", (r) => r.nome),
      col("cargo", (r) => r.cargo),
    ]);
    expect(result).toBe("nome;cargo\nAna;Mecânico");
  });
});
