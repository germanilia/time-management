import { CalendarDays, BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type CapacityView = "calendar" | "spreadsheet" | "projection";

interface CapacityViewToggleProps {
  activeView: CapacityView;
  onViewChange: (view: CapacityView) => void;
}

const VIEWS: { key: CapacityView; label: string; icon: typeof CalendarDays }[] = [
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "spreadsheet", label: "Spreadsheet", icon: BarChart3 },
  { key: "projection", label: "Projection", icon: TrendingUp },
];

/**
 * Three-way toggle for switching between capacity views.
 */
export function CapacityViewToggle({ activeView, onViewChange }: CapacityViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border bg-muted/30 p-1"
      data-testid="capacity-view-toggle"
    >
      {VIEWS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          data-testid={`capacity-view-${key}-button`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeView === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
