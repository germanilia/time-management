import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import * as analyticsService from "@/services/analytics-service";
import * as employeeService from "@/services/employee-service";
import type {
  UtilizationProjectionResponse,
  WeeklyAllocationsResponse,
} from "@/types/analytics";
import type { Employee } from "@/types/employee";
import { buildProjectColorMap } from "@/lib/project-colors";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { CapacityViewToggle } from "@/components/capacity/CapacityViewToggle";
import { WeekNavigation } from "@/components/capacity/WeekNavigation";
import { CalendarView } from "@/components/capacity/CalendarView";
import { AllocationSpreadsheet } from "@/components/capacity/AllocationSpreadsheet";
import { UtilizationProjection } from "@/components/capacity/UtilizationProjection";
import { ProjectLegend } from "@/components/capacity/ProjectLegend";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type CapacityView = "calendar" | "spreadsheet" | "projection";

const PROJECTION_RANGE_OPTIONS = [
  { value: "12", label: "3 months" },
  { value: "24", label: "6 months" },
  { value: "52", label: "1 year" },
];

function getSunday(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = -day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff + offset * 7);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatStartLabel(d: Date): string {
  return `Starting week of ${d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function CapacityPage() {
  const [activeView, setActiveView] = useState<CapacityView>("calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeksToShow, setWeeksToShow] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allocData, setAllocData] = useState<WeeklyAllocationsResponse | null>(null);
  const [projData, setProjData] = useState<UtilizationProjectionResponse | null>(null);

  // Projection controls
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projWeeksBack, setProjWeeksBack] = useState(12);
  const [projWeeksForward, setProjWeeksForward] = useState(12);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

  const startSunday = useMemo(() => getSunday(weekOffset), [weekOffset]);
  const endDate = useMemo(() => {
    const d = new Date(startSunday);
    d.setDate(d.getDate() + weeksToShow * 7 - 1);
    return d;
  }, [startSunday, weeksToShow]);

  useEffect(() => {
    employeeService.listEmployees().then(setEmployees).catch(() => {});
  }, []);

  const loadAllocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyticsService.getWeeklyAllocations(
        toISODate(startSunday),
        toISODate(endDate),
      );
      setAllocData(result);
    } catch {
      setError("Failed to load allocation data");
    } finally {
      setLoading(false);
    }
  }, [startSunday, endDate]);

  const loadProjection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projStart = getSunday(-projWeeksBack);
      const projEnd = new Date(projStart);
      projEnd.setDate(projEnd.getDate() + (projWeeksBack + projWeeksForward) * 7 - 1);
      const result = await analyticsService.getUtilizationProjection(
        toISODate(projStart),
        toISODate(projEnd),
        selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
      );
      setProjData(result);
    } catch {
      setError("Failed to load projection data");
    } finally {
      setLoading(false);
    }
  }, [projWeeksBack, projWeeksForward, selectedEmployeeIds]);

  useEffect(() => {
    if (activeView === "projection") {
      loadProjection();
    } else {
      loadAllocations();
    }
  }, [activeView, loadAllocations, loadProjection]);

  const colorMap = useMemo(
    () =>
      allocData
        ? buildProjectColorMap(allocData.projects.map((p) => p.projectId))
        : new Map(),
    [allocData],
  );

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const totalWeeks = projWeeksBack + projWeeksForward;

  if (loading && !allocData && !projData) {
    return <PageSkeleton />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <LayoutGrid className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="capacity-title">
              Capacity Planning
            </h1>
            <p className="text-sm text-muted-foreground">
              Weekly allocation overview
            </p>
          </div>
        </div>
        <CapacityViewToggle activeView={activeView} onViewChange={setActiveView} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Week navigation (only for calendar/spreadsheet) */}
      {activeView !== "projection" && (
        <WeekNavigation
          weekOffset={weekOffset}
          weeksToShow={weeksToShow}
          onOffsetChange={setWeekOffset}
          onWeeksToShowChange={setWeeksToShow}
          label={formatStartLabel(startSunday)}
        />
      )}

      {/* Projection controls */}
      {activeView === "projection" && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="space-y-1">
            <Label>Time Range</Label>
            <select
              value={String(totalWeeks)}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const total = parseInt(e.target.value, 10);
                const half = Math.floor(total / 2);
                setProjWeeksBack(half);
                setProjWeeksForward(total - half);
              }}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="projection-range-select"
            >
              {PROJECTION_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative space-y-1">
            <Label>Employees</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEmpDropdownOpen((v) => !v)}
              className="h-9 min-w-[180px] justify-start text-sm font-normal"
              data-testid="projection-employee-filter-button"
            >
              {selectedEmployeeIds.length === 0
                ? "All Employees"
                : `${selectedEmployeeIds.length} selected`}
            </Button>
            {empDropdownOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                <button
                  type="button"
                  className="w-full rounded px-3 py-1.5 text-left text-sm font-medium hover:bg-accent"
                  onClick={() => {
                    setSelectedEmployeeIds([]);
                    setEmpDropdownOpen(false);
                  }}
                  data-testid="projection-employee-select-all"
                >
                  All Employees
                </button>
                <div className="my-1 border-t" />
                {employees.map((emp) => {
                  const checked = selectedEmployeeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(emp.id)}
                        className="size-3.5 rounded border-input"
                        data-testid={`projection-employee-checkbox-${emp.id}`}
                      />
                      {emp.name}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {selectedEmployeeIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {selectedEmployeeIds.map((id) => {
                const emp = employees.find((e) => e.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => toggleEmployee(id)}
                  >
                    {emp?.name ?? id} ×
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active view */}
      {activeView === "calendar" && allocData && (
        <>
          <CalendarView data={allocData} colorMap={colorMap} />
          <ProjectLegend projects={allocData.projects} colorMap={colorMap} />
        </>
      )}

      {activeView === "spreadsheet" && allocData && (
        <>
          <AllocationSpreadsheet data={allocData} colorMap={colorMap} />
          <ProjectLegend projects={allocData.projects} colorMap={colorMap} />
        </>
      )}

      {activeView === "projection" && projData && (
        <UtilizationProjection data={projData} />
      )}

      {/* Footer note for calendar/spreadsheet */}
      {activeView !== "projection" && (
        <p className="text-xs italic text-muted-foreground">
          Each cell shows weekly allocation for that engineer. Hover for details.
          Over-allocated weeks shown in red. Available weeks show &quot;Available&quot;.
        </p>
      )}
    </div>
  );
}
