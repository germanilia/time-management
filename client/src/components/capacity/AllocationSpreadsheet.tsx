import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { WeeklyAllocationsResponse } from "@/types/analytics";

interface AllocationSpreadsheetProps {
  data: WeeklyAllocationsResponse;
  colorMap: Map<string, { hex: string; bg: string; text: string }>;
}

function formatWeekRange(isoDate: string): string {
  const sunday = new Date(isoDate + "T00:00:00");
  const thursday = new Date(sunday);
  thursday.setDate(thursday.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(sunday)}${fmt(thursday)}`;
}

/**
 * Allocation Spreadsheet - stacked colored bars showing capacity usage.
 * Matches the "Allocation Spreadsheet" screenshot style.
 */
export function AllocationSpreadsheet({ data, colorMap }: AllocationSpreadsheetProps) {
  // Compute team-wide totals
  const teamCapacity = data.employees.reduce((s, e) => s + e.maxDaysPerWeek, 0);
  const weeklyAllocated = data.weekStarts.map((ws) =>
    data.employees.reduce((s, e) => s + (e.weeks[ws]?.totalDays ?? 0), 0),
  );
  const avgAllocated =
    weeklyAllocated.length > 0
      ? Math.round(weeklyAllocated.reduce((a, b) => a + b, 0) / weeklyAllocated.length)
      : 0;

  return (
    <div
      className="space-y-4"
      data-testid="allocation-spreadsheet"
    >
      {/* Team summary header */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <span>
          <span className="font-semibold">Team Capacity:</span>{" "}
          {teamCapacity} days/week
        </span>
        <span>
          <span className="font-semibold">Allocated:</span>{" "}
          {avgAllocated} days/week
        </span>
        <span className="text-success font-semibold">
          Available: {teamCapacity - avgAllocated} days/week
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary">
              <TableHead className="min-w-[160px] font-semibold text-primary-foreground">
                Engineer
              </TableHead>
              {data.weekStarts.map((ws) => (
                <TableHead
                  key={ws}
                  className="min-w-[160px] text-center font-semibold text-primary-foreground"
                >
                  {formatWeekRange(ws)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.employees.map((emp) => (
              <TableRow key={emp.employeeId} className="hover:bg-muted/40">
                <TableCell className="font-medium">
                  {emp.employeeName}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({emp.maxDaysPerWeek} max)
                  </span>
                </TableCell>
                {data.weekStarts.map((ws) => {
                  const week = emp.weeks[ws];
                  const total = week?.totalDays ?? 0;
                  const max = emp.maxDaysPerWeek;
                  const isOver = total > max;

                  return (
                    <TableCell key={ws}>
                      <div className="flex items-center gap-2">
                        {/* Stacked bar */}
                        <div
                          className={cn(
                            "relative h-6 flex-1 overflow-hidden rounded-md bg-muted",
                            isOver && "ring-2 ring-destructive/30",
                          )}
                        >
                          <div className="absolute inset-0 flex">
                            {week?.allocations.map((alloc) => {
                              const pct = max > 0 ? (alloc.allocatedDays / max) * 100 : 0;
                              const color = colorMap.get(alloc.projectId);
                              return (
                                <div
                                  key={alloc.projectId}
                                  className="h-full transition-all"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: color?.hex ?? "#888",
                                  }}
                                  title={`${alloc.projectName}: ${alloc.allocatedDays}d`}
                                />
                              );
                            })}
                          </div>
                        </div>
                        {/* Label */}
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold tabular-nums",
                            isOver ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {total}/{max}
                        </span>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
