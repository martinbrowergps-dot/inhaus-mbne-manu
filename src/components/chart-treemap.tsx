import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { PBI_COLORS, CHART_TOOLTIP_STYLE, CHART_FONT } from "@/lib/chart-utils";
import type { HierarchicalNode } from "@/lib/chart-utils";
import { Empty } from "@/components/visao-geral/empty";

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  depth: number;
  index: number;
}

function TreemapContent({ x, y, width, height, name, depth, index }: TreemapContentProps) {
  if (width < 30 || height < 20) return null;

  const colorIndex = index % PBI_COLORS.length;
  const bgColor = PBI_COLORS[colorIndex];
  const textColor = "#FFFFFF";
  const fontSize = Math.min(12, Math.max(9, width / 8));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bgColor}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1}
        rx={2}
        ry={2}
      />
      {width > 50 && height > 25 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontSize={fontSize}
          fontFamily={CHART_FONT}
          fontWeight={600}
        >
          {name}
        </text>
      )}
    </g>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: HierarchicalNode & { path?: string };
  }>;
}

function TreemapTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const path = data.path || data.name;
  const value = data.size ?? 0;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{path}</div>
      <div>{value} {value === 1 ? "ação" : "ações"}</div>
    </div>
  );
}

function addPaths(nodes: HierarchicalNode[], parentPath = ""): (HierarchicalNode & { path: string })[] {
  return nodes.map((node) => {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    return {
      ...node,
      path,
      children: node.children ? addPaths(node.children, path) : undefined,
    };
  });
}

function flattenNodes(nodes: HierarchicalNode[], parentPath = ""): Array<HierarchicalNode & { path: string }> {
  const result: Array<HierarchicalNode & { path: string }> = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    if (node.children && node.children.length > 0) {
      result.push(...flattenNodes(node.children, path));
    } else {
      result.push({ ...node, path });
    }
  }
  return result;
}

export function ChartTreemap({
  data,
  height = 400,
}: {
  data: HierarchicalNode[];
  height?: number;
}) {
  if (data.length === 0) return <Empty />;

  const flatData = flattenNodes(data);

  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <Treemap
          data={flatData}
          dataKey="size"
          nameKey="name"
          content={<TreemapContent x={0} y={0} width={0} height={0} name="" depth={0} index={0} />}
          isAnimationActive={false}
        >
          <Tooltip content={<TreemapTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
