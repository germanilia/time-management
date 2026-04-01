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
import { Check } from "lucide-react";

interface CalendarViewProps {
  data: WeeklyAllocationsResponse;
  colorMap: Map<string, { hex: string; bg: string; text: string }>;
}

function formatWeekRange(isoDate: string): string {
  const sunday = new Date(isoDate + "T00:00:00");
  const thursday = new Date(sunday);
  thursday.setDate(thursday.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(sunday)} - ${fmt(thursday)}`;
}

function formatDays(days: number): string {
  if (days === Math.floor(days)) return `${days}d`;
  return `${days.toFixed(1)}d`;
}

/**
 * Calendar View - shows colored project pills per engineer per week.
 * Matches the "Calendar View - Weekly Summary" screenshot style.
 */
export function CalendarView({ data, colorMap }: CalendarViewProps) {
  return (
    <div
      className="overflow-x-auto rounded-xl border bg-card shadow-sm"
      data-testid="calendar-view"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-primary">
            <TableHead className="min-w-[140px] font-semibold text-primary-foreground">
              Engineer
            </TableHead>
            {data.weekStarts.map((ws) => (
              <TableHead
                key={ws}
                className="min-w-[180px] text-center font-semibold text-primary-foreground"
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
                <div>
                  {emp.employeeName}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({emp.maxDaysPerWeek} max)
                  </span>
                </div>
              </TableCell>
              {data.weekStarts.map((ws) => {
                const week = emp.weeks[ws];
                const isOver = week && week.totalDays > week.maxDays;
                return (
                  <TableCell
                    key={ws}
                    className={cn(
                      "text-center",
                      isOver && "bg-destructive/10",
                    )}
                  >
                    {!week || week.allocations.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm text-success">
                        <Check className="size-3.5" aria-hidden="true" />
                        Available
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {week.allocations.map((alloc) => {
                          const color = colorMap.get(alloc.projectId);
                          return (
                            <span
                              key={alloc.projectId}
                              className={cn(
                                "inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold",
                                color?.bg ?? "bg-muted",
                                color?.text ?? "text-foreground",
                              )}
                            >
                              {formatDays(alloc.allocatedDays)} - {alloc.projectName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
