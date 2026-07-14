import { useState, useCallback, useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_FONT, treemapStatusColor, TREEMAP_COLORS } from "@/lib/chart-utils";
import type { HierarchicalNode } from "@/lib/chart-utils";
import { Empty } from "@/components/visao-geral/empty";
import { ChevronRight, ArrowLeft, ZoomIn, ZoomOut, Hash, Clock } from "lucide-react";

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

// ── Treemap cell (clean industrial) ──

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
}

function TreemapCell({ x, y, width, height, name, status, size, totalHH }: CellProps) {
  if (width < 4 || height < 4) return null;

  const bgColor = treemapStatusColor(status);
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  if (innerW < 20 || innerH < 12) return null;

  const canShowName = innerW > 30 && innerH > 14;
  const canShowCount = innerW > 40 && innerH > 28;
  const canShowHH = innerW > 50 && innerH > 40;

  const nameFontSize = Math.min(13, Math.max(9, innerW / 12));
  const countFontSize = Math.max(8, nameFontSize - 2);

  return (
    <g>
      <rect
        x={x + pad}
        y={y + pad}
        width={innerW}
        height={innerH}
        fill={bgColor}
        stroke="rgba(15,23,42,0.6)"
        strokeWidth={2}
        rx={3}
        ry={3}
        style={{ cursor: "pointer" }}
      />
      {canShowName && (
        <text
          x={x + width / 2}
          y={canShowCount ? y + pad + 16 : y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize={nameFontSize}
          fontFamily={CHART_FONT}
          fontWeight={700}
        >
          {innerW > 80 ? name : name.substring(0, 8) + (name.length > 8 ? "…" : "")}
        </text>
      )}
      {canShowCount && (
        <text
          x={x + width / 2}
          y={y + pad + 30}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.85)"
          fontSize={countFontSize}
          fontFamily={CHART_FONT}
          fontWeight={500}
        >
          {size} {size === 1 ? "ação" : "ações"}
        </text>
      )}
      {canShowHH && totalHH !== undefined && totalHH > 0 && (
        <text
          x={x + width / 2}
          y={y + pad + 44}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.65)"
          fontSize={countFontSize}
          fontFamily={CHART_FONT}
        >
          {totalHH.toFixed(1)}h
        </text>
      )}
    </g>
  );
}

// ── Tooltip (clean, dark, structured) ──

interface TooltipPayload {
  payload: HierarchicalNode & { rootLabel?: string };
}

function TreemapTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const total = getNodeSize(data);
  const totalHH = getNodeHH(data);
  const rootLabel = data.rootLabel ?? "Cabo de Santo Agostinho";
  const statusCounts = countAllStatuses(data);
  const rows = getAllRawRows(data);

  return (
    <div
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: 8,
        fontSize: 11,
        color: "#E2E8F0",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        padding: 12,
        fontFamily: CHART_FONT,
        maxWidth: 300,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#F8FAFC", marginBottom: 8 }}>
        {rootLabel} / {data.name}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 12 }}>
        <span>
          <span style={{ color: "#94A3B8" }}>Registros: </span>
          <span style={{ fontWeight: 700 }}>{total}</span>
        </span>
        {totalHH > 0 && (
          <span>
            <span style={{ color: "#94A3B8" }}>HH: </span>
            <span style={{ fontWeight: 700 }}>{totalHH.toFixed(1)}h</span>
          </span>
        )}
      </div>

      {Object.keys(statusCounts).length > 0 && (
        <div
          style={{
            borderTop: "1px solid #334155",
            paddingTop: 8,
            marginBottom: 8,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([st, count]) => (
              <span key={st} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: treemapStatusColor(st),
                    flexShrink: 0,
                  }}
                />
                {st}: {count}
              </span>
            ))}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 8 }}>
          <div style={{ fontSize: 10, color: "#64748B", marginBottom: 6, fontWeight: 600 }}>
            ÚLTIMOS REGISTROS
          </div>
          {rows.slice(0, 3).map((row, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                padding: "6px 8px",
                marginBottom: 4,
                fontSize: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontWeight: 600, color: "#F8FAFC" }}>
                  {String(row.CodigoReferencia || "—")}
                </span>
                <span style={{ color: treemapStatusColor(String(row.Status || "")), fontWeight: 600 }}>
                  {String(row.Status || "—")}
                </span>
              </div>
              <div style={{ color: "#CBD5E1", marginBottom: 2 }}>
                {String(row.Titulo || "—")}
              </div>
              <div style={{ display: "flex", gap: 8, color: "#64748B" }}>
                {row.Data ? <span>{String(row.Data)}</span> : null}
                {row.Prioridade ? <span>Prio: {String(row.Prioridade)}</span> : null}
                {row.HH ? <span>HH: {String(row.HH)}</span> : null}
              </div>
            </div>
          ))}
          {rows.length > 3 && (
            <div style={{ color: "#64748B", fontSize: 10, textAlign: "center", marginTop: 4 }}>
              +{rows.length - 3} mais registros
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
  onNavigate: (i: number) => void;
}) {
  const items = [rootLabel, ...path];
  return (
    <div className="flex items-center gap-1 text-xs flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
          {i === items.length - 1 ? (
            <span className="font-bold text-white">{item}</span>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(i)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {item}
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Legend ──

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      {[
        { label: "Pendente", color: TREEMAP_COLORS.pendente },
        { label: "Em Andamento", color: TREEMAP_COLORS.emAndamento },
        { label: "Finalizado", color: TREEMAP_COLORS.finalizado },
        { label: "Sem Status", color: TREEMAP_COLORS.semStatus },
      ].map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-slate-400">{item.label}</span>
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
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onChange("count")}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
          value === "count"
            ? "bg-blue-600 text-white font-semibold shadow"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Hash className="h-3 w-3" />
        Quantidade
      </button>
      <button
        type="button"
        onClick={() => onChange("hh")}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
          value === "hh"
            ? "bg-blue-600 text-white font-semibold shadow"
            : "text-slate-400 hover:text-white"
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
  height = 360,
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
      if (node?.children && node.children.length > 0) {
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

  if (data.length === 0) return <Empty />;

  return (
    <div
      className="rounded-xl overflow-hidden border border-slate-700/50"
      style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}
    >
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <StatusLegend />
          <WeightToggle value={weightMode} onChange={setWeightMode} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-1.5 rounded-md hover:bg-slate-700 transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500 w-10 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
            className="p-1.5 rounded-md hover:bg-slate-700 transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumb + back */}
      <div className="px-4 py-2 flex items-center gap-3">
        {drillPath.length > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        )}
        <Breadcrumb rootLabel={rootLabel} path={drillPath} onNavigate={handleBreadcrumbNavigate} />
      </div>

      {/* Treemap area */}
      <div
        className="px-2 pb-2 overflow-hidden"
        style={{ height: height * zoom }}
        onClick={(e) => {
          const target = e.target as SVGElement;
          if (target.tagName === "rect") {
            const g = target.parentElement;
            const textEl = g?.querySelector("text");
            if (textEl) {
              const text = textEl.textContent?.replace("…", "") ?? "";
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
