import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ProjectWithPhases } from "@/types/project";

interface TimelineFiltersProps {
  projects: ProjectWithPhases[];
  selectedProjectIds: string[];
  onProjectFilterChange: (ids: string[]) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

/**
 * Filter bar for the timeline view with date range pickers and project filter.
 */
export function TimelineFilters({
  projects,
  selectedProjectIds,
  onProjectFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: TimelineFiltersProps) {
  const toggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
      onProjectFilterChange(selectedProjectIds.filter((pid) => pid !== id));
    } else {
      onProjectFilterChange([...selectedProjectIds, id]);
    }
  };

  const clearFilters = () => {
    onProjectFilterChange([]);
    onStartDateChange("");
    onEndDateChange("");
  };

  const hasFilters =
    selectedProjectIds.length > 0 || startDate !== "" || endDate !== "";

  return (
    <div className="space-y-3 rounded-lg border p-4" data-testid="timeline-filters">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="timeline-start">From</Label>
          <Input
            id="timeline-start"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-40"
            data-testid="timeline-filter-start-date"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="timeline-end">To</Label>
          <Input
            id="timeline-end"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-40"
            data-testid="timeline-filter-end-date"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            data-testid="timeline-clear-filters-button"
          >
            Clear Filters
          </Button>
        )}
      </div>
      {projects.length > 0 && (
        <div className="space-y-1">
          <Label>Projects</Label>
          <div className="flex flex-wrap gap-2" data-testid="timeline-project-filter">
            {projects.map((p) => {
              const isSelected =
                selectedProjectIds.length === 0 || selectedProjectIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProject(p.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground opacity-50"
                  }`}
                  data-testid={`timeline-project-toggle-${p.id}`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
