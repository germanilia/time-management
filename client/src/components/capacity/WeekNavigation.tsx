import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekNavigationProps {
  weekOffset: number;
  weeksToShow: number;
  onOffsetChange: (offset: number) => void;
  onWeeksToShowChange: (weeks: number) => void;
  /** Label like "Starting week of March 31, 2026" */
  label: string;
}

const WEEKS_OPTIONS = [4, 8, 12];

/**
 * Navigation controls for week-based capacity views.
 */
export function WeekNavigation({
  weekOffset,
  weeksToShow,
  onOffsetChange,
  onWeeksToShowChange,
  label,
}: WeekNavigationProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-testid="week-navigation"
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOffsetChange(weekOffset - weeksToShow)}
          data-testid="week-nav-prev-button"
        >
          <ChevronLeft className="mr-1 size-4" aria-hidden="true" />
          Previous {weeksToShow}w
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOffsetChange(0)}
          data-testid="week-nav-today-button"
        >
          This Week
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOffsetChange(weekOffset + weeksToShow)}
          data-testid="week-nav-next-button"
        >
          Next {weeksToShow}w
          <ChevronRight className="ml-1 size-4" aria-hidden="true" />
        </Button>

        <select
          value={weeksToShow}
          onChange={(e) => onWeeksToShowChange(Number(e.target.value))}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          data-testid="week-nav-weeks-select"
        >
          {WEEKS_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w} weeks
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
