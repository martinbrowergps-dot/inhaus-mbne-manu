// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

afterEach(cleanup);

interface Item {
  id: number;
  name: string;
  status: string;
}

const cols: ColumnDef<Item, unknown>[] = [
  { header: "ID", accessorKey: "id" },
  { header: "Nome", accessorKey: "name" },
  { header: "Status", accessorKey: "status" },
];

const data: Item[] = [
  { id: 1, name: "Alpha", status: "ok" },
  { id: 2, name: "Beta", status: "warn" },
  { id: 3, name: "Charlie", status: "ok" },
];

describe("DataTable", () => {
  it("renders rows", () => {
    render(<DataTable data={data} columns={cols} />);
    // Both mobile + desktop views render in jsdom; getAllByText matches both
    expect(screen.getAllByText("Alpha")).toHaveLength(2);
    expect(screen.getAllByText("Beta")).toHaveLength(2);
    expect(screen.getAllByText("Charlie")).toHaveLength(2);
  });

  it("filters by search", async () => {
    const user = userEvent.setup();
    render(<DataTable data={data} columns={cols} searchKeys={["name"]} />);
    const inputs = screen.getAllByPlaceholderText("Pesquisar…");
    await user.type(inputs[0], "Alpha");
    expect(screen.getAllByText("Alpha")).toHaveLength(2);
    expect(screen.queryAllByText("Beta")).toHaveLength(0);
    expect(screen.queryAllByText("Charlie")).toHaveLength(0);
  });

  it("shows empty state when filtered empty", async () => {
    const user = userEvent.setup();
    render(<DataTable data={data} columns={cols} searchKeys={["name"]} />);
    const inputs = screen.getAllByPlaceholderText("Pesquisar…");
    await user.type(inputs[0], "Zzz");
    expect(screen.getAllByText("Nenhum resultado").length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when data empty", () => {
    render(<DataTable data={[]} columns={cols} />);
    expect(screen.getByText("Nenhum registro")).toBeInTheDocument();
  });

  it("shows record count", () => {
    render(<DataTable data={data} columns={cols} />);
    const spans = screen.getAllByText(/registros?/);
    expect(spans.length).toBeGreaterThanOrEqual(1);
    expect(spans[0].textContent).toContain("3");
  });
});
