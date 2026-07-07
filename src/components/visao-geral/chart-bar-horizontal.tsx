import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList,
} from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import { Empty } from "./empty";

export function ChartBarHorizontal({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 115, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#94A3B8" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            stroke="#94A3B8"
            width={110}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="value" fill="#22C55E" radius={[0, 4, 4, 0]}>
            <LabelList position="right" fill="#94A3B8" fontSize={10} formatter={(v: number) => v > 0 ? v : ""} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
