import { useState, useCallback, useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import {
  CHART_TOOLTIP_STYLE,
  CHART_FONT,
  treemapStatusColor,
} from "@/lib/chart-utils";
import type { HierarchicalNode } from "@/lib/chart-utils";
import { Empty } from "@/components/visao-geral/empty";
import { ChevronRight, ArrowLeft } from "lucide-react";

// ── Helpers ──

function getNodeSize(node: HierarchicalNode): number {
  if (node.size !== undefined) return node.size;
  if (node.children) return node.children.reduce((s, c) => s + getNodeSize(c), 0);
  return 0;
}

function findNode(nodes: HierarchicalNode[], name: string): HierarchicalNode | undefined {
  return nodes.find((n) => n.name === name);
}

function countAllStatuses(node: HierarchicalNode): Record<string, number> {
  const counts: Record<string, number> = {};
  if (node.totalByStatus) {
    for (const [k, v] of Object.entries(node.totalByStatus)) {
      counts[k] = (counts[k] ?? 0) + v;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const childCounts = countAllStatuses(child);
      for (const [k, v] of Object.entries(childCounts)) {
        counts[k] = (counts[k] ?? 0) + v;
      }
    }
  }
  return counts;
}

// ── Treemap cell renderer ──

interface CellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  depth: number;
  index: number;
  status?: string;
  size?: number;
  rootLabel?: string;
}

function TreemapCell({ x, y, width, height, name, status, size, rootLabel }: CellProps) {
  if (width < 28 || height < 18) return null;

  const bgColor = treemapStatusColor(status);
  const textColor = "#FFFFFF";
  const label = rootLabel ? `${rootLabel}: ${name}` : name;
  const countText = size !== undefined ? `${size}` : "";
  const fontSize = Math.min(12, Math.max(9, width / 10));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bgColor}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={1}
        rx={2}
        ry={2}
        style={{ cursor: "pointer" }}
      />
      {width > 40 && height > 22 && (
        <>
          <text
            x={x + width / 2}
            y={height > 36 ? y + height / 2 - 6 : y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontSize={fontSize}
            fontFamily={CHART_FONT}
            fontWeight={600}
          >
            {width > 80 ? label : name}
          </text>
          {height > 36 && countText && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.85)"
              fontSize={Math.max(9, fontSize - 2)}
              fontFamily={CHART_FONT}
            >
              {countText} {Number(countText) === 1 ? "ação" : "ações"}
            </text>
          )}
        </>
      )}
    </g>
  );
}

// ── Tooltip ──

interface TooltipPayload {
  payload: HierarchicalNode & { rootLabel?: string };
}

function TreemapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const total = getNodeSize(data);
  const rootLabel = data.rootLabel ?? "Cabo de Santo Agostinho";
  const path = `${rootLabel} / ${data.name}`;
  const statusCounts = countAllStatuses(data);

  return (
    <div style={{ ...CHART_TOOLTIP_STYLE, minWidth: 160 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}>{path}</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#64748B" }}>Total: </span>
        <span style={{ fontWeight: 600 }}>{total} {total === 1 ? "ação" : "ações"}</span>
      </div>
      {Object.keys(statusCounts).length > 0 && (
        <div style={{ borderTop: "1px solid #E1E5EA", paddingTop: 4, marginTop: 4 }}>
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div
                key={status}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 2 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: treemapStatusColor(status),
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#64748B" }}>{status}:</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Breadcrumb ──

function Breadcrumb({
  rootLabel,
  path,
  onNavigate,
}: {
  rootLabel: string;
  path: string[];
  onNavigate: (index: number) => void;
}) {
  const items = [rootLabel, ...path];
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
            {isLast ? (
              <span className="font-semibold text-foreground">{item}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(i)}
                className="hover:text-primary transition-colors cursor-pointer underline underline-offset-2 decoration-dotted"
              >
                {item}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── Legend ──

function StatusLegend() {
  const items = [
    { label: "Pendente", color: treemapStatusColor("Pendente") },
    { label: "Em Andamento", color: treemapStatusColor("Em Andamento") },
    { label: "Finalizado", color: treemapStatusColor("Finalizada") },
  ];
  return (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-2">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ── Main component ──

export function ChartTreemap({
  data,
  height = 400,
  rootLabel = "Cabo de Santo Agostinho",
}: {
  data: HierarchicalNode[];
  height?: number;
  rootLabel?: string;
}) {
  const [drillPath, setDrillPath] = useState<string[]>([]);

  const currentNode = useMemo(() => {
    let current = { name: rootLabel, children: data } as HierarchicalNode;
    for (const name of drillPath) {
      const child = findNode(current.children ?? [], name);
      if (!child) break;
      current = child;
    }
    return current;
  }, [data, drillPath, rootLabel]);

  const displayData = useMemo(() => {
    const children = currentNode.children ?? [];
    return children.map((node) => ({
      ...node,
      rootLabel: drillPath.length > 0 ? drillPath[drillPath.length - 1] : rootLabel,
    }));
  }, [currentNode, drillPath, rootLabel]);

  const handleDrillDown = useCallback(
    (name: string) => {
      const node = findNode(currentNode.children ?? [], name);
      if (node && node.children && node.children.length > 0) {
        setDrillPath((prev) => [...prev, name]);
      }
    },
    [currentNode],
  );

  const handleBreadcrumbNavigate = useCallback((index: number) => {
    setDrillPath((prev) => prev.slice(0, index));
  }, []);

  const handleBack = useCallback(() => {
    setDrillPath((prev) => prev.slice(0, -1));
  }, []);

  const canGoBack = drillPath.length > 0;

  if (data.length === 0) return <Empty />;

  return (
    <div>
      <StatusLegend />
      <Breadcrumb rootLabel={rootLabel} path={drillPath} onNavigate={handleBreadcrumbNavigate} />
      {canGoBack && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
      )}
      <div
        style={{ height }}
        onClick={(e) => {
          // Find the clicked node name from SVG elements
          const target = e.target as SVGElement;
          if (target.tagName === "rect") {
            // Get the text sibling to find the node name
            const g = target.parentElement;
            const textEl = g?.querySelector("text");
            if (textEl) {
              const text = textEl.textContent ?? "";
              // Extract name from "RootLabel: NodeName" or just "NodeName"
              const name = text.includes(": ") ? text.split(": ").slice(1).join(": ") : text;
              if (name) handleDrillDown(name);
            }
          }
        }}
      >
        <ResponsiveContainer>
          <Treemap
            data={displayData}
            dataKey="size"
            nameKey="name"
            content={
              <TreemapCell
                x={0}
                y={0}
                width={0}
                height={0}
                name=""
                depth={0}
                index={0}
                rootLabel={drillPath.length > 0 ? drillPath[drillPath.length - 1] : rootLabel}
              />
            }
            isAnimationActive={false}
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
