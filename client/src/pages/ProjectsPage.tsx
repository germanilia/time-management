import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ProjectEditDialog } from "@/components/projects/ProjectEditDialog";
import type { PendingAssignment } from "@/components/projects/ProjectFormDialog/useProjectForm";
import { useRole } from "@/hooks/useRole";
import * as projectService from "@/services/project-service";
import * as assignmentService from "@/services/assignment-service";
import * as projectStatusService from "@/services/project-status-service";
import * as analyticsService from "@/services/analytics-service";
import type { ProjectWithPhases, ProjectCreate, ProjectUpdate } from "@/types/project";
import type { ProjectStatusConfig } from "@/types/project-status";
import type { ProjectFinancialInsight } from "@/types/analytics";
import { cn } from "@/lib/utils";

export function ProjectsPage() {
  const { canEdit, canDelete } = useRole();
  const [projects, setProjects] = useState<ProjectWithPhases[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatusConfig[]>([]);
  const [financialMap, setFinancialMap] = useState<Map<string, ProjectFinancialInsight>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithPhases | null>(null);

  const load = useCallback(async () => {
    try {
      const [projs, sts] = await Promise.all([
        projectService.listProjects(),
        projectStatusService.listProjectStatuses(),
      ]);
      setProjects(projs);
      setStatuses(sts);

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
      setError("Failed to load projects");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createPendingAssignments = async (
    project: ProjectWithPhases,
    pendingAssignments: PendingAssignment[],
  ) => {
    const errors: string[] = [];
    for (const pa of pendingAssignments) {
      const phase = project.phases[pa.phaseIndex];
      if (!phase) continue;
      try {
        await assignmentService.createAssignment({
          projectId: project.id,
          phaseId: phase.id,
          employeeId: pa.employeeId,
          allocationType: pa.allocationType,
          allocationPercentage: pa.allocationPercentage,
          hourlyRateOverride: pa.hourlyRateOverride,
          startDate: phase.startDate,
          endDate: phase.endDate ?? phase.startDate,
        });
      } catch {
        errors.push(`Failed to assign employee to phase "${phase.name}"`);
      }
    }
    if (errors.length > 0) {
      setError(errors.join(". "));
    }
  };

  const handleCreate = async (data: ProjectCreate, pendingAssignments: PendingAssignment[]) => {
    const project = await projectService.createProject(data);
    await createPendingAssignments(project, pendingAssignments);
    await load();
  };

  const handleUpdate = async (data: ProjectCreate, pendingAssignments: PendingAssignment[]) => {
    if (!editingProject) return;
    const updateData: ProjectUpdate = {
      name: data.name,
      customer: data.customer,
      description: data.description,
      salesforceLink: data.salesforceLink,
      startDate: data.startDate,
      endDate: data.endDate,
      billingType: data.billingType,
      fixedPriceAmount: data.fixedPriceAmount,
      fundingSourceId: data.fundingSourceId,
      phases: data.phases,
    };
    const project = await projectService.updateProject(editingProject.id, updateData);
    await createPendingAssignments(project, pendingAssignments);
    await load();
  };

  const handleEdit = (project: ProjectWithPhases) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await projectService.deleteProject(id);
      await load();
    } catch {
      setError("Failed to delete project");
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      await projectService.updateProject(projectId, { status: newStatus });
      await load();
    } catch {
      setError("Failed to update project status");
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <FolderKanban className="size-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="projects-title">
            Projects
          </h1>
        </div>
        {canEdit && (
          <Button
            onClick={() => setFormOpen(true)}
            data-testid="project-create-button"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Project
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <FolderKanban className="size-10 opacity-40" aria-hidden="true" />
          <p>No projects found.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
        <Table data-testid="projects-table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Start</TableHead>
              <TableHead className="font-semibold">End</TableHead>
              <TableHead className="font-semibold">Phases</TableHead>
              <TableHead className="font-semibold">Billing</TableHead>
              <TableHead className="font-semibold">Budget</TableHead>
              <TableHead className="font-semibold">Consumption</TableHead>
              <TableHead className="font-semibold">Funding</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((proj) => (
              <TableRow key={proj.id} data-testid={`project-row-${proj.id}`} className="hover:bg-muted/40">
                <TableCell>
                  <Link
                    to={`/projects/${proj.id}`}
                    className="font-medium text-primary hover:underline"
                    data-testid={`project-link-${proj.id}`}
                  >
                    {proj.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground" data-testid={`project-customer-${proj.id}`}>
                  {proj.customer}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{proj.startDate}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{proj.endDate}</TableCell>
                <TableCell>
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                    {proj.phases.length}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" data-testid={`project-billing-${proj.id}`}>
                    {proj.billingType === "fixed_price" ? "Fixed" : "T&M"}
                  </Badge>
                </TableCell>
                {(() => {
                  const fin = financialMap.get(proj.id);
                  const budget = fin?.totalBudget ?? 0;
                  const consumption = budget > 0 ? Math.round((fin?.income ?? 0) / budget * 100) : 0;
                  return (
                    <>
                      <TableCell className="tabular-nums" data-testid={`project-budget-${proj.id}`}>
                        {fin && budget > 0 ? `$${budget.toLocaleString("en-US")}` : "-"}
                      </TableCell>
                      <TableCell data-testid={`project-consumption-${proj.id}`}>
                        {fin && budget > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  consumption > 100 ? "bg-destructive" : consumption > 80 ? "bg-warning" : "bg-primary",
                                )}
                                style={{ width: `${Math.min(100, consumption)}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">{consumption}%</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                    </>
                  );
                })()}
                <TableCell className="text-muted-foreground" data-testid={`project-funding-${proj.id}`}>
                  {proj.fundingSourceName ?? "-"}
                </TableCell>
                <TableCell>
                  {canEdit && statuses.length > 0 ? (
                    <select
                      value={proj.status}
                      onChange={(e) => handleStatusChange(proj.id, e.target.value)}
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid={`project-status-select-${proj.id}`}
                    >
                      {statuses.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={proj.status === "active" ? "default" : "secondary"}>
                      {proj.status}
                    </Badge>
                  )}
                </TableCell>
                {(canEdit || canDelete) && (
                  <TableCell>
                    <div className="flex gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(proj)}
                          data-testid={`project-edit-${proj.id}`}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(proj.id)}
                          data-testid={`project-delete-${proj.id}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      <ProjectFormDialog
        key="create"
        open={formOpen && !editingProject}
        onClose={handleCloseForm}
        onSubmit={handleCreate}
      />

      {editingProject && (
        <ProjectEditDialog
          key={editingProject.id}
          open={formOpen && !!editingProject}
          onClose={handleCloseForm}
          onSubmit={handleUpdate}
          project={editingProject}
        />
      )}
    </div>
  );
}
