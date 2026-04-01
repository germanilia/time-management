import { useCallback, useEffect, useMemo, useState } from "react";
import { GanttChart, Calendar, Clock, Pencil, Wallet } from "lucide-react";
import * as projectService from "@/services/project-service";
import * as analyticsService from "@/services/analytics-service";
import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { PhaseDetailPanel } from "@/components/timeline/PhaseDetailPanel";
import { ProjectEditDialog } from "@/components/projects/ProjectEditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import type { ProjectWithPhases, Phase, ProjectCreate, ProjectUpdate } from "@/types/project";
import type { PendingAssignment } from "@/components/projects/ProjectFormDialog/useProjectForm";
import type { ProjectFinancialInsight } from "@/types/analytics";
import { cn } from "@/lib/utils";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeProgress(startDate: string, endDate: string | null): number {
  if (!endDate) return 0;
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now <= start) return 0;
  if (now >= end) return 100;
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const raw = (elapsedMs / totalMs) * 100;
  return raw < 1 ? Math.round(raw * 10) / 10 : Math.round(raw);
}

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilStart(startDate: string): number {
  const now = new Date();
  const start = new Date(startDate);
  return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isNotStarted(startDate: string): boolean {
  return new Date() < new Date(startDate);
}

/** Generate month tick marks between two dates. */
function getMonthMarkers(start: Date, end: Date): { label: string; pct: number }[] {
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return [];
  const markers: { label: string; pct: number }[] = [];
  const cursor = new Date(start);
  cursor.setDate(1);
  if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor <= end) {
    const pct = ((cursor.getTime() - start.getTime()) / totalMs) * 100;
    markers.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      pct,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return markers;
}

const BAR_COLORS = [
  "bg-primary",
  "bg-chart-5",
  "bg-chart-4",
  "bg-chart-3",
  "bg-chart-2",
];

interface ProjectTimelineRowProps {
  project: ProjectWithPhases;
  colorIndex: number;
  onPhaseClick: (phase: Phase, projectId: string) => void;
  onEdit?: (project: ProjectWithPhases) => void;
  financials?: ProjectFinancialInsight;
}

/**
 * A self-contained timeline row for a single project.
 * Has its own date ruler based on the project's start/end dates.
 */
function ProjectTimelineRow({ project, colorIndex, onPhaseClick, onEdit, financials }: ProjectTimelineRowProps) {
  const today = new Date();
  const projStart = new Date(project.startDate);
  const projEnd = project.endDate ? new Date(project.endDate) : projStart;
  const totalMs = projEnd.getTime() - projStart.getTime();
  const progress = computeProgress(project.startDate, project.endDate);
  const remaining = daysRemaining(project.endDate);
  const notStarted = isNotStarted(project.startDate);
  const startsIn = daysUntilStart(project.startDate);
  const monthMarkers = getMonthMarkers(projStart, projEnd);
  const color = BAR_COLORS[colorIndex % BAR_COLORS.length];

  // Today position as percentage within this project's span
  const todayPct = totalMs > 0
    ? Math.max(0, Math.min(100, ((today.getTime() - projStart.getTime()) / totalMs) * 100))
    : 0;
  const showToday = todayPct > 0 && todayPct < 100;

  /** Convert a date string to a percentage position within this project's span. */
  const toPct = (dateStr: string): number => {
    if (totalMs <= 0) return 0;
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, ((d.getTime() - projStart.getTime()) / totalMs) * 100));
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm" data-testid={`timeline-project-${project.id}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("size-3 rounded-full", color)} />
          <h3 className="text-sm font-semibold">{project.name}</h3>
          {notStarted ? (
            <Badge variant="outline" className="text-[10px]">Starts in {startsIn}d</Badge>
          ) : progress >= 100 ? (
            <Badge className="bg-success text-success-foreground text-[10px]">Complete</Badge>
          ) : remaining !== null && remaining <= 0 ? (
            <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">In Progress</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
          {financials && financials.totalBudget > 0 && (
            <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-primary">
              <Wallet className="size-3" aria-hidden="true" />
              ${financials.totalBudget.toLocaleString("en-US")}
              <span className="text-muted-foreground">
                ({financials.totalBudget > 0
                  ? Math.round((financials.income / financials.totalBudget) * 100)
                  : 0}% used)
              </span>
            </span>
          )}
          <span>{project.startDate}</span>
          <span>→</span>
          <span>{project.endDate ?? "Ongoing"}</span>
          {!notStarted && progress < 100 && remaining !== null && remaining > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {remaining}d left
            </span>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onEdit(project)}
              data-testid={`timeline-project-edit-${project.id}`}
            >
              <Pencil className="size-3" aria-hidden="true" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3">
        <div className="flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full transition-all", color)}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-primary">{progress}%</span>
        </div>
      </div>

      {/* Gantt area with dedicated date ruler */}
      <div className="px-5 pb-4 pt-2">
        {/* Month tick marks */}
        <div className="relative h-5">
          {monthMarkers.map((m) => (
            <div key={m.label} className="absolute top-0 flex flex-col items-center" style={{ left: `${m.pct}%` }}>
              <span className="text-[9px] text-muted-foreground -translate-x-1/2">{m.label}</span>
              <div className="mt-0.5 h-1.5 w-px bg-border" />
            </div>
          ))}
          {/* Today label */}
          {showToday && (
            <div
              className="absolute -top-0.5 z-20 -translate-x-1/2"
              style={{ left: `${todayPct}%` }}
            >
              <span className="rounded bg-destructive px-1 py-px text-[8px] font-bold text-white">
                Today
              </span>
            </div>
          )}
        </div>

        {/* Phase bars */}
        <div className="relative mt-1 h-9 rounded-md bg-muted/30">
          {/* Elapsed background overlay */}
          {progress > 0 && (
            <div
              className={cn("absolute inset-y-0 left-0 rounded-l-md opacity-10", color)}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          )}

          {/* Today vertical line */}
          {showToday && (
            <div
              className="absolute inset-y-0 z-10 w-px bg-destructive"
              style={{ left: `${todayPct}%` }}
            />
          )}

          {/* Phase bars */}
          {project.phases.map((phase) => {
            const phaseEnd = phase.endDate ?? project.endDate ?? phase.startDate;
            const left = toPct(phase.startDate);
            const right = toPct(phaseEnd);
            const width = right - left;
            const phaseProgress = computeProgress(phase.startDate, phaseEnd);

            return (
              <button
                key={phase.id}
                type="button"
                className={cn(
                  "absolute top-1 h-7 cursor-pointer overflow-hidden rounded-md text-[11px] font-medium leading-7 text-white shadow-sm transition-all hover:brightness-110",
                  color,
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${phase.name}: ${phase.startDate} — ${phase.endDate} (${phaseProgress}%)`}
                aria-label={`Phase ${phase.name}, ${phaseProgress}% complete`}
                onClick={() => onPhaseClick(phase, project.id)}
                data-testid={`timeline-phase-${phase.id}`}
              >
                {/* Elapsed darker shade within the phase */}
                <div
                  className="absolute inset-y-0 left-0 rounded-l-md bg-black/15"
                  style={{ width: `${phaseProgress}%` }}
                />
                <span className="relative z-10 block truncate px-2">{phase.name}</span>
              </button>
            );
          })}

          {/* Diamond marker at today position */}
          {showToday && !notStarted && progress > 0 && progress < 100 && (
            <div
              className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${todayPct}%` }}
            >
              <div className={cn("size-3 rotate-45 rounded-sm border-2 border-white shadow", color)} />
            </div>
          )}
        </div>

        {/* Start / End labels below the bar */}
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground tabular-nums">
          <span>{project.startDate}</span>
          <span>{project.endDate ?? ""}</span>
        </div>
      </div>
    </div>
  );
}

export function TimelinePage() {
  const { canEdit } = useRole();
  const [allProjects, setAllProjects] = useState<ProjectWithPhases[]>([]);
  const [financialMap, setFinancialMap] = useState<Map<string, ProjectFinancialInsight>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [editingProject, setEditingProject] = useState<ProjectWithPhases | null>(null);

  const load = useCallback(async () => {
    try {
      const projects = await projectService.listProjects();
      setAllProjects(projects);

      if (projects.length > 0) {
        const allDates = projects.flatMap((p) => [
          new Date(p.startDate),
          ...(p.endDate ? [new Date(p.endDate)] : []),
          ...p.phases.flatMap((ph) => [
            new Date(ph.startDate),
            ...(ph.endDate ? [new Date(ph.endDate)] : []),
          ]),
        ]);
        const earliest = new Date(Math.min(...allDates.map((d) => d.getTime())));
        const latest = new Date(Math.max(...allDates.map((d) => d.getTime())));
        setRangeStart(toISODate(earliest));
        setRangeEnd(toISODate(latest));
      }

      try {
        const summary = await analyticsService.getFinancialSummary();
        const map = new Map<string, ProjectFinancialInsight>();
        for (const proj of summary.projects) {
          map.set(proj.projectId, proj);
        }
        setFinancialMap(map);
      } catch {
        // Financial data not critical
      }
    } catch {
      setError("Failed to load timeline data");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProjects = useMemo(() => {
    let result = allProjects;
    if (selectedProjectIds.length > 0) {
      result = result.filter((p) => selectedProjectIds.includes(p.id));
    }
    return result;
  }, [allProjects, selectedProjectIds]);

  const handlePhaseClick = (phase: Phase, projectId: string) => {
    setSelectedPhase(phase);
    setSelectedProjectId(projectId);
  };

  const handleEditProject = (project: ProjectWithPhases) => {
    setEditingProject(project);
  };

  const handleUpdateProject = async (data: ProjectCreate, _pendingAssignments: PendingAssignment[]) => {
    if (!editingProject) return;
    const updateData: ProjectUpdate = {
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      billingType: data.billingType,
      fixedPriceAmount: data.fixedPriceAmount,
      fundingSourceId: data.fundingSourceId,
      phases: data.phases,
    };
    await projectService.updateProject(editingProject.id, updateData);
    await load();
  };

  if (allProjects.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold" data-testid="timeline-title">Timeline</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <GanttChart className="size-10 opacity-40" aria-hidden="true" />
          <p>No projects to display.</p>
        </div>
      </div>
    );
  }

  const selectedProjectName = selectedProjectId
    ? allProjects.find((p) => p.id === selectedProjectId)?.name ?? ""
    : "";

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="timeline-title">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <TimelineFilters
        projects={allProjects}
        selectedProjectIds={selectedProjectIds}
        onProjectFilterChange={setSelectedProjectIds}
        startDate={rangeStart}
        endDate={rangeEnd}
        onStartDateChange={setRangeStart}
        onEndDateChange={setRangeEnd}
      />

      {/* Each project gets its own card with dedicated timeline */}
      <div className="stagger-children space-y-4">
        {filteredProjects.map((proj, pi) => (
          <ProjectTimelineRow
            key={proj.id}
            project={proj}
            colorIndex={pi}
            onPhaseClick={handlePhaseClick}
            onEdit={canEdit ? handleEditProject : undefined}
            financials={financialMap.get(proj.id)}
          />
        ))}
      </div>

      {/* Summary cards */}
      <div className="stagger-children grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((proj, pi) => {
          const progress = computeProgress(proj.startDate, proj.endDate);
          const remaining = daysRemaining(proj.endDate);
          const color = BAR_COLORS[pi % BAR_COLORS.length];

          return (
            <div key={proj.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("size-2.5 rounded-full", color)} />
                  <h3 className="text-sm font-semibold">{proj.name}</h3>
                </div>
                {progress >= 100 ? (
                  <Badge className="bg-success text-success-foreground text-[10px]">Complete</Badge>
                ) : remaining !== null && remaining <= 0 ? (
                  <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">In Progress</Badge>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      progress >= 100 ? "bg-success" : color,
                    )}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="tabular-nums font-medium">{progress}% complete</span>
                  {remaining !== null && remaining > 0 && (
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="size-3" aria-hidden="true" />
                      {remaining} days remaining
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {proj.phases.map((phase) => {
                  const pp = computeProgress(phase.startDate, phase.endDate);
                  return (
                    <div key={phase.id} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 truncate text-muted-foreground">{phase.name}</span>
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-full",
                            pp >= 100 ? "bg-success" : color,
                          )}
                          style={{ width: `${Math.min(100, pp)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums font-medium text-muted-foreground">{pp}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>{proj.startDate}</span>
                <span>{proj.endDate ?? "Ongoing"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPhase && selectedProjectId && (
        <PhaseDetailPanel
          phase={selectedPhase}
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          open={!!selectedPhase}
          onClose={() => {
            setSelectedPhase(null);
            setSelectedProjectId(null);
          }}
        />
      )}

      {editingProject && (
        <ProjectEditDialog
          key={editingProject.id}
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSubmit={handleUpdateProject}
          project={editingProject}
        />
      )}
    </div>
  );
}
