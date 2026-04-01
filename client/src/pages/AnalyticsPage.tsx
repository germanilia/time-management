import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, UserX, AlertTriangle, Users, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as analyticsService from "@/services/analytics-service";
import type { CapacityForecast, EmployeeUtilizationRecord, UtilizationSummary } from "@/types/analytics";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { cn } from "@/lib/utils";

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName: string;
}

function SummaryCard({ title, value, icon: Icon, iconClassName }: SummaryCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          iconClassName,
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

interface UtilizationBarProps {
  percentage: number;
  target: number;
}

/** Inline progress bar showing utilization vs target. */
function UtilizationBar({ percentage, target }: UtilizationBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const isOver = percentage > target;
  const isLow = percentage < target * 0.7;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            isOver ? "bg-destructive" : isLow ? "bg-warning" : "bg-success",
          )}
          style={{ width: `${clamped}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/40"
          style={{ left: `${Math.min(100, target)}%` }}
        />
      </div>
      <span className={cn(
        "text-sm font-semibold tabular-nums",
        isOver ? "text-destructive" : isLow ? "text-warning" : "text-success",
      )}>
        {percentage}%
      </span>
    </div>
  );
}

export function AnalyticsPage() {
  const [summary, setSummary] = useState<UtilizationSummary | null>(null);
  const [employees, setEmployees] = useState<EmployeeUtilizationRecord[]>([]);
  const [capacity, setCapacity] = useState<CapacityForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = getDefaultDates();

  const load = useCallback(async () => {
    try {
      const [s, e, c] = await Promise.all([
        analyticsService.getUtilization(startDate, endDate),
        analyticsService.getEmployeeUtilization(startDate, endDate),
        analyticsService.getCapacityForecast(startDate, endDate),
      ]);
      setSummary(s);
      setEmployees(e);
      setCapacity(c);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <TrendingUp className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="analytics-title">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            {startDate} to {endDate}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="analytics-summary">
          <SummaryCard
            title="Avg Utilization"
            value={`${summary.averageUtilization}%`}
            icon={Activity}
            iconClassName="bg-primary/10 text-primary"
          />
          <SummaryCard
            title="Idle Employees"
            value={summary.idleCount}
            icon={UserX}
            iconClassName="bg-warning/10 text-warning"
          />
          <SummaryCard
            title="Over-Allocated"
            value={summary.overAllocatedCount}
            icon={AlertTriangle}
            iconClassName="bg-destructive/10 text-destructive"
          />
          <SummaryCard
            title="Total Employees"
            value={summary.totalEmployees}
            icon={Users}
            iconClassName="bg-chart-5/10 text-chart-5"
          />
        </div>
      )}

      {capacity && capacity.periods.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Capacity Forecast</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacity.periods} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                <XAxis dataKey="period" className="text-xs" axisLine={false} tickLine={false} />
                <YAxis className="text-xs" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar
                  dataKey="allocatedHours"
                  name="Allocated"
                  fill="var(--color-chart-1)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="availableHours"
                  name="Available"
                  fill="var(--color-chart-2)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {employees.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Employee Utilization</h2>
            <p className="text-sm text-muted-foreground">
              Utilization vs target with {employees.length} employee{employees.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Table data-testid="employee-utilization-table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Utilization</TableHead>
                <TableHead className="font-semibold">Target</TableHead>
                <TableHead className="font-semibold">Gap</TableHead>
                <TableHead className="font-semibold">Assignments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.employeeId} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{emp.employeeName}</TableCell>
                  <TableCell>
                    {emp.department ? (
                      <Badge variant="secondary" className="text-xs">
                        {emp.department}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <UtilizationBar
                      percentage={emp.averageUtilization}
                      target={emp.targetUtilization}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{emp.targetUtilization}%</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                        emp.targetGap > 0
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success",
                      )}
                    >
                      {emp.targetGap > 0 ? `+${emp.targetGap}` : emp.targetGap}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                      {emp.assignmentsCount}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
