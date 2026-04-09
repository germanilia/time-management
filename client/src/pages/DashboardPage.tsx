import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, UserX, AlertTriangle, TrendingDown, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as analyticsService from "@/services/analytics-service";
import type { CapacityForecast, UtilizationSummary } from "@/types/analytics";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { cn } from "@/lib/utils";

function getDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  icon: LucideIcon;
  iconClassName?: string;
}

function MetricCard({ title, value, subtitle, href, icon: Icon, iconClassName }: MetricCardProps) {
  const content = (
    <div className="flex h-full items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
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
        <p className="mt-0.5 text-3xl font-bold tabular-nums">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link to={href} data-testid={`dashboard-metric-${title.toLowerCase().replace(/\s/g, "-")}`}>
        {content}
      </Link>
    );
  }
  return <div data-testid={`dashboard-metric-${title.toLowerCase().replace(/\s/g, "-")}`}>{content}</div>;
}

export function DashboardPage() {
  const [summary, setSummary] = useState<UtilizationSummary | null>(null);
  const [capacity, setCapacity] = useState<CapacityForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = getDateRange();

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        analyticsService.getUtilization(startDate, endDate),
        analyticsService.getCapacityForecast(startDate, endDate),
      ]);
      setSummary(s);
      setCapacity(c);
    } catch {
      setError("Failed to load dashboard data");
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
          <LayoutDashboard className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {startDate} to {endDate}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            title="Avg Utilization"
            value={`${summary.averageUtilization}%`}
            href="/analytics"
            icon={Activity}
            iconClassName="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Idle Employees"
            value={summary.idleCount}
            subtitle={`of ${summary.totalEmployees} total`}
            href="/analytics"
            icon={UserX}
            iconClassName="bg-warning/10 text-warning"
          />
          <MetricCard
            title="Over-Allocated"
            value={summary.overAllocatedCount}
            href="/analytics"
            icon={AlertTriangle}
            iconClassName="bg-destructive/10 text-destructive"
          />
          <MetricCard
            title="Under Target"
            value={summary.underUtilizedCount}
            href="/analytics"
            icon={TrendingDown}
            iconClassName="bg-chart-2/10 text-chart-2"
          />
        </div>
      )}

      {capacity && capacity.periods.length > 0 && (
        <div className="animate-slide-up rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Capacity Overview</h2>
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
    </div>
  );
}
