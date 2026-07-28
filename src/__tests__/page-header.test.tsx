// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PageHeader } from "@/components/page-header";

afterEach(cleanup);

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="Teste" />);
    expect(screen.getByRole("heading", { name: "Teste", level: 1 })).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="Foo" subtitle="Sub" />);
    expect(screen.getByText("Sub")).toBeInTheDocument();
  });

  it("renders export button when provided", () => {
    render(<PageHeader title="Foo" exportButton={<button>Export</button>} />);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });
});
