import type { ProjectSummaryEntry } from "@/types/analytics";

interface ProjectLegendProps {
  projects: ProjectSummaryEntry[];
  colorMap: Map<string, { hex: string; bg: string; text: string }>;
}

/**
 * Color-coded project legend shared by Calendar and Spreadsheet views.
 */
export function ProjectLegend({ projects, colorMap }: ProjectLegendProps) {
  if (projects.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4" data-testid="project-legend">
      <span className="text-sm font-medium text-muted-foreground">Color legend:</span>
      {projects.map((p) => {
        const color = colorMap.get(p.projectId);
        return (
          <div key={p.projectId} className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ backgroundColor: color?.hex ?? "#888" }}
              aria-hidden="true"
            />
            <span className="text-sm">{p.projectName}</span>
          </div>
        );
      })}
    </div>
  );
}
