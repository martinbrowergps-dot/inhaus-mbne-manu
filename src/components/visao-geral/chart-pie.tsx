import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { COLORS, CHART_TOOLTIP_STYLE } from "@/lib/chart-utils";
import { Empty } from "./empty";

export function ChartPie({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            label={({ value }) => value}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
