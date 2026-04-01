import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import type { UtilizationProjectionResponse } from "@/types/analytics";

interface UtilizationProjectionProps {
  data: UtilizationProjectionResponse;
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Utilization projection chart showing historical + future utilization trends.
 * Uses a composed chart with bars for capacity/allocated and an area for utilization %.
 */
export function UtilizationProjection({ data }: UtilizationProjectionProps) {
  const chartData = data.points.map((p) => ({
    week: formatWeekLabel(p.weekStart),
    rawWeek: p.weekStart,
    capacityHours: p.capacityHours,
    allocatedHours: p.allocatedHours,
    availableHours: p.availableHours,
    utilization: p.utilizationPercentage,
  }));

  const todayLabel =
    data.currentWeekIndex >= 0 && data.currentWeekIndex < chartData.length
      ? chartData[data.currentWeekIndex].week
      : undefined;

  return (
    <div
      className="space-y-6"
      data-testid="utilization-projection"
    >
      {/* Utilization % area chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Utilization Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
              <XAxis dataKey="week" className="text-xs" axisLine={false} tickLine={false} />
              <YAxis
                className="text-xs"
                axisLine={false}
                tickLine={false}
                domain={[0, "auto"]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                }}
                formatter={(value) => [`${value}%`, "Utilization"]}
              />
              {todayLabel && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="var(--color-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Today",
                    position: "top",
                    fill: "var(--color-foreground)",
                    fontSize: 12,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="utilization"
                name="Utilization %"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity vs Allocated bar chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Capacity vs Allocated Hours</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
              <XAxis dataKey="week" className="text-xs" axisLine={false} tickLine={false} />
              <YAxis className="text-xs" axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                }}
                formatter={(value, name) => [`${value}h`, name]}
              />
              <Legend iconType="circle" iconSize={8} />
              {todayLabel && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="var(--color-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
              )}
              <Bar
                dataKey="allocatedHours"
                name="Allocated"
                fill="var(--color-chart-1)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="capacityHours"
                name="Capacity"
                fill="var(--color-chart-2)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
