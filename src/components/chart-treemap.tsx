import { useState, useCallback, useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_FONT, treemapStatusColor, TREEMAP_COLORS } from "@/lib/chart-utils";
import type { HierarchicalNode } from "@/lib/chart-utils";
import { Empty } from "@/components/visao-geral/empty";
import { ChevronRight, ArrowLeft, Hash, Clock, ZoomIn, ZoomOut } from "lucide-react";

// ── Helpers ──

function getNodeSize(node: HierarchicalNode): number {
  if (node.size !== undefined) return node.size;
  if (node.children) return node.children.reduce((s, c) => s + getNodeSize(c), 0);
  return 0;
}

function getNodeHH(node: HierarchicalNode): number {
  if (node.totalHH !== undefined) return node.totalHH;
  if (node.children) return node.children.reduce((s, c) => s + getNodeHH(c), 0);
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

function getAllRawRows(node: HierarchicalNode): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  if (node.rawRows) rows.push(...node.rawRows);
  if (node.children) {
    for (const child of node.children) {
      rows.push(...getAllRawRows(child));
    }
  }
  return rows;
}

// ── Treemap cell renderer (industrial map style) ──

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
  totalHH?: number;
  servicio?: string;
}

function TreemapCell({ x, y, width, height, name, status, size, totalHH, servicio }: CellProps) {
  if (width < 24 || height < 16) return null;

  const bgColor = treemapStatusColor(status);
  const fontSize = Math.min(13, Math.max(9, width / 9));
  const subFontSize = Math.max(8, fontSize - 2);
  const countText = size !== undefined ? `${size}` : "";
  const hhText = totalHH !== undefined && totalHH > 0 ? `${totalHH.toFixed(1)}h` : "";

  const showTitle = width > 36 && height > 14;
  const showSubtitle = width > 50 && height > 28 && servicio;
  const showIndicators = width > 50 && height > 42;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bgColor}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={1.5}
        rx={1}
        ry={1}
        style={{ cursor: "pointer" }}
      />
      {/* Dark overlay for depth effect */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.min(height, 3)}
        fill="rgba(0,0,0,0.2)"
        rx={1}
      />
      {showTitle && (
        <text
          x={x + width / 2}
          y={showSubtitle ? y + 14 : y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize={fontSize}
          fontFamily={CHART_FONT}
          fontWeight={700}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          {name}
        </text>
      )}
      {showSubtitle && (
        <text
          x={x + width / 2}
          y={y + 28}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.8)"
          fontSize={subFontSize}
          fontFamily={CHART_FONT}
          fontWeight={400}
        >
          {servicio}
        </text>
      )}
      {showIndicators && (
        <g>
          {countText && (
            <text
              x={x + width / 2 - (hhText ? 16 : 0)}
              y={y + height - 10}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.9)"
              fontSize={Math.max(8, subFontSize - 1)}
              fontFamily={CHART_FONT}
              fontWeight={600}
            >
              {countText} {Number(countText) === 1 ? "ação" : "ações"}
            </text>
          )}
          {hhText && (
            <text
              x={x + width / 2 + (countText ? 16 : 0)}
              y={y + height - 10}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.7)"
              fontSize={Math.max(8, subFontSize - 1)}
              fontFamily={CHART_FONT}
            >
              {hhText}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

// ── Rich Tooltip ──

interface TooltipPayload {
  payload: HierarchicalNode & { servicio?: string; rootLabel?: string };
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
  const totalHH = getNodeHH(data);
  const rootLabel = data.rootLabel ?? "Cabo de Santo Agostinho";
  const path = `${rootLabel} / ${data.name}`;
  const statusCounts = countAllStatuses(data);
  const rows = getAllRawRows(data);

  return (
    <div
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: 6,
        fontSize: 11,
        color: "#E2E8F0",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        padding: "10px 12px",
        fontFamily: CHART_FONT,
        maxWidth: 320,
        maxHeight: 400,
        overflowY: "auto",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12, color: "#F8FAFC" }}>
        {path}
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
        <span>
          <span style={{ color: "#94A3B8" }}>Registros: </span>
          <span style={{ fontWeight: 600 }}>{total}</span>
        </span>
        {totalHH > 0 && (
          <span>
            <span style={{ color: "#94A3B8" }}>HH: </span>
            <span style={{ fontWeight: 600 }}>{totalHH.toFixed(1)}h</span>
          </span>
        )}
      </div>
      {Object.keys(statusCounts).length > 0 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 6, marginBottom: 6 }}>
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([st, count]) => (
              <div
                key={st}
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: treemapStatusColor(st),
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#94A3B8" }}>{st}:</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))}
        </div>
      )}
      {rows.length > 0 && rows.length <= 10 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#94A3B8", fontSize: 10 }}>
            DETALHES
          </div>
          {rows.slice(0, 5).map((row, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                padding: "4px 6px",
                marginBottom: 4,
                fontSize: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontWeight: 600, color: "#F8FAFC" }}>
                  {String(row.CodigoReferencia || row.Codigo || "—")}
                </span>
                <span style={{ color: treemapStatusColor(String(row.Status || "")) }}>
                  {String(row.Status || "—")}
                </span>
              </div>
              <div style={{ color: "#CBD5E1", marginBottom: 1 }}>
                {String(row.Titulo || row.Categoria || "—")}
              </div>
              <div style={{ display: "flex", gap: 8, color: "#64748B" }}>
                {row.Data ? <span>{String(row.Data)}</span> : null}
                {row.Prioridade ? <span>Prio: {String(row.Prioridade)}</span> : null}
                {row.HH ? <span>HH: {String(row.HH)}</span> : null}
              </div>
            </div>
          ))}
          {rows.length > 5 && (
            <div style={{ color: "#64748B", fontSize: 10, textAlign: "center" }}>
              +{rows.length - 5} registros
            </div>
          )}
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
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 flex-wrap">
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
    { label: "Pendente", color: TREEMAP_COLORS.pendente },
    { label: "Em Andamento", color: TREEMAP_COLORS.emAndamento },
    { label: "Finalizado", color: TREEMAP_COLORS.finalizado },
    { label: "Sem Status", color: TREEMAP_COLORS.semStatus },
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

// ── Weight toggle ──

function WeightToggle({
  value,
  onChange,
}: {
  value: "count" | "hh";
  onChange: (v: "count" | "hh") => void;
}) {
  return (
    <div className="flex items-center gap-1 text-[10px] mb-2">
      <span className="text-muted-foreground mr-1">Peso:</span>
      <button
        type="button"
        onClick={() => onChange("count")}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
          value === "count"
            ? "bg-primary/20 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Hash className="h-3 w-3" />
        Qtd
      </button>
      <button
        type="button"
        onClick={() => onChange("hh")}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
          value === "hh"
            ? "bg-primary/20 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Clock className="h-3 w-3" />
        HH
      </button>
    </div>
  );
}

// ── Main component ──

export function ChartTreemap({
  data,
  height = 500,
  rootLabel = "Cabo de Santo Agostinho",
}: {
  data: HierarchicalNode[];
  height?: number;
  rootLabel?: string;
}) {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [weightMode, setWeightMode] = useState<"count" | "hh">("count");
  const [zoom, setZoom] = useState(1);

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
        setZoom(1);
      }
    },
    [currentNode],
  );

  const handleBreadcrumbNavigate = useCallback((index: number) => {
    setDrillPath((prev) => prev.slice(0, index));
    setZoom(1);
  }, []);

  const handleBack = useCallback(() => {
    setDrillPath((prev) => prev.slice(0, -1));
    setZoom(1);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const canGoBack = drillPath.length > 0;

  if (data.length === 0) return <Empty />;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0F172A" }}>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <StatusLegend />
            <WeightToggle value={weightMode} onChange={setWeightMode} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
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
      </div>
      <div
        style={{
          height: height * zoom,
          minHeight: height,
          transition: "height 0.3s ease",
        }}
        onClick={(e) => {
          const target = e.target as SVGElement;
          if (target.tagName === "rect") {
            const g = target.parentElement;
            const textEl = g?.querySelector("text");
            if (textEl) {
              const text = textEl.textContent ?? "";
              if (text) handleDrillDown(text);
            }
          }
        }}
      >
        <ResponsiveContainer>
          <Treemap
            data={displayData}
            dataKey={weightMode === "hh" ? "totalHH" : "size"}
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
