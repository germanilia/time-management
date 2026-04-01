import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Plus, Wallet, Receipt, TrendingUp, Percent, FolderKanban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { AssignmentFormDialog } from "@/components/assignments/AssignmentFormDialog";
import { ProjectEditDialog } from "@/components/projects/ProjectEditDialog";
import * as projectService from "@/services/project-service";
import * as employeeService from "@/services/employee-service";
import * as assignmentService from "@/services/assignment-service";
import * as analyticsService from "@/services/analytics-service";
import type { ProjectWithPhases } from "@/types/project";
import type { Employee } from "@/types/employee";
import type { Assignment, AssignmentCreate } from "@/types/assignment";
import type { ProjectFinancialInsight } from "@/types/analytics";
import type { ProjectCreate, ProjectUpdate } from "@/types/project";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName?: string;
  testId: string;
}

function BudgetCard({ title, value, icon: Icon, iconClassName, valueClassName, testId }: BudgetCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", iconClassName)}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("text-xl font-bold tabular-nums", valueClassName)} data-testid={testId}>
          {value}
        </p>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US");
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit, canDelete } = useRole();
  const [project, setProject] = useState<ProjectWithPhases | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [financialInsights, setFinancialInsights] = useState<ProjectFinancialInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [assignmentPhaseId, setAssignmentPhaseId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const proj = await projectService.getProject(id);
      setProject(proj);

      // Load employees and assignments independently — don't let one failure block the other
      try {
        const emps = await employeeService.listEmployees();
        setEmployees(emps);
      } catch {
        // Employee list may fail — page still works for project/phase viewing
      }

      try {
        const assigns = await assignmentService.listAssignments({ projectId: id });
        setAssignments(assigns);
      } catch {
        // Assignments may fail
      }

      try {
        const insights = await analyticsService.getFinancialInsights(id);
        setFinancialInsights(insights);
      } catch {
        // Financial insights may not be available — not critical
      }
    } catch {
      setError("Failed to load project details");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateAssignment = async (data: AssignmentCreate) => {
    await assignmentService.createAssignment(data);
    await load();
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    await assignmentService.deleteAssignment(assignmentId);
    await load();
  };

  const handleUpdateProject = async (data: ProjectCreate, _pendingAssignments: unknown[], status?: string) => {
    if (!id) return;
    const updateData: ProjectUpdate = {
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      billingType: data.billingType,
      fixedPriceAmount: data.fixedPriceAmount,
      fundingSourceId: data.fundingSourceId,
      phases: data.phases,
      status,
    };
    await projectService.updateProject(id, updateData);
    await load();
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await projectService.deleteProject(id);
      navigate("/projects");
    } catch {
      setError("Failed to delete project");
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <div className="skeleton size-10 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-60 w-full rounded-xl" />
      </div>
    );
  }

  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <FolderKanban className="size-5 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="project-detail-title">
              {project.name}
            </h1>
          </div>
          {(canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFormOpen(true)}
                  data-testid="project-detail-edit-button"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteProject}
                  data-testid="project-detail-delete-button"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3" data-testid="project-detail-dates">
          <span className="text-sm text-muted-foreground">
            {project.startDate} — {project.endDate ?? "Ongoing"}
          </span>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
            data-testid="project-detail-status"
          >
            {project.status}
          </Badge>
          <Badge variant="outline" data-testid="project-detail-billing-type">
            {project.billingType === "fixed_price" ? "Fixed Price" : "T&M"}
          </Badge>
          {project.fundingSourceName && (
            <Badge variant="secondary" data-testid="project-detail-funding-source">
              {project.fundingSourceName}
            </Badge>
          )}
          {project.billingType === "fixed_price" && project.fixedPriceAmount != null && (
            <span className="text-sm font-medium text-muted-foreground">
              Budget: ${formatCurrency(project.fixedPriceAmount)}
            </span>
          )}
        </div>
      </div>

      {/* Financial Overview — always visible */}
      <div data-testid="financial-insights-section" className="space-y-4">
        <h2 className="text-lg font-semibold">Financial Overview</h2>
        {financialInsights ? (
          <>
            <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-4">
              <BudgetCard
                title={financialInsights.billingType === "fixed_price" ? "Client Budget" : "Budget"}
                value={`$${formatCurrency(financialInsights.totalBudget)}`}
                icon={Wallet}
                iconClassName="bg-primary/10 text-primary"
                testId="financial-budget"
              />
              <BudgetCard
                title="Income Generated"
                value={`$${formatCurrency(financialInsights.income)}`}
                icon={Receipt}
                iconClassName="bg-chart-2/10 text-chart-2"
                testId="financial-income"
              />
              <BudgetCard
                title="Profit"
                value={`$${formatCurrency(financialInsights.profit)}`}
                icon={TrendingUp}
                iconClassName={financialInsights.profit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                valueClassName={financialInsights.profit >= 0 ? "text-success" : "text-destructive"}
                testId="financial-profit"
              />
              {financialInsights.remaining != null ? (
                <BudgetCard
                  title="Budget Remaining"
                  value={`$${formatCurrency(financialInsights.remaining)}`}
                  icon={Percent}
                  iconClassName={financialInsights.remaining >= 0 ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"}
                  valueClassName={financialInsights.remaining < 0 ? "text-destructive" : undefined}
                  testId="financial-remaining"
                />
              ) : (
                <BudgetCard
                  title="Total Hours"
                  value={`${financialInsights.totalHours}h`}
                  icon={Percent}
                  iconClassName="bg-chart-3/10 text-chart-3"
                  testId="financial-total-hours"
                />
              )}
            </div>

            {financialInsights.totalBudget > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget Usage</span>
                  <span className="font-medium">
                    {financialInsights.totalBudget > 0
                      ? `${Math.round((financialInsights.income / financialInsights.totalBudget) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      financialInsights.income / financialInsights.totalBudget > 1
                        ? "bg-destructive"
                        : financialInsights.income / financialInsights.totalBudget > 0.8
                          ? "bg-warning"
                          : "bg-primary",
                    )}
                    style={{
                      width: `${Math.min(100, (financialInsights.income / financialInsights.totalBudget) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {financialInsights.phases.length > 0 && (
              <div className="animate-slide-up rounded-xl border bg-card shadow-sm">
                <Table data-testid="financial-phases-table">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Phase</TableHead>
                      <TableHead className="font-semibold">Budget</TableHead>
                      <TableHead className="font-semibold">Income</TableHead>
                      <TableHead className="font-semibold">Profit</TableHead>
                      <TableHead className="font-semibold">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialInsights.phases.map((phase) => (
                      <TableRow key={phase.phaseId}>
                        <TableCell className="font-medium">{phase.phaseName}</TableCell>
                        <TableCell>
                          {phase.budget != null ? `$${formatCurrency(phase.budget)}` : "-"}
                        </TableCell>
                        <TableCell data-testid={`financial-phase-${phase.phaseId}-cost`}>
                          ${formatCurrency(phase.cost)}
                        </TableCell>
                        <TableCell data-testid={`financial-phase-${phase.phaseId}-profit`}>
                          {phase.profit != null ? (
                            <span className={phase.profit < 0 ? "text-destructive" : "text-success"}>
                              ${formatCurrency(phase.profit)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {phase.marginPercentage != null ? `${phase.marginPercentage}%` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No financial data yet. Add assignments with hourly rates to see income and profitability.
          </div>
        )}
      </div>

      <div data-testid="project-phases-section" className="space-y-6">
        <h2 className="text-lg font-semibold">Phases</h2>
        {project.phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phases defined.</p>
        ) : (
          project.phases.map((phase) => {
            const phaseAssignments = assignments.filter((a) => a.phaseId === phase.id);
            return (
              <div
                key={phase.id}
                className="rounded-lg border p-4 space-y-3"
                data-testid={`phase-section-${phase.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{phase.name}</h3>
                    <Badge variant="outline">{phase.allocationType}</Badge>
                    <Badge variant={phase.status === "active" ? "default" : "secondary"}>
                      {phase.status?.replace("_", " ") ?? "planning"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {phase.startDate} — {phase.endDate}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setAssignmentPhaseId(phase.id);
                        setAssignmentFormOpen(true);
                      }}
                      data-testid={`phase-add-assignment-${phase.id}`}
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      Add Assignment
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {phase.requiredHours != null && (
                    <span>Hours: {phase.requiredHours}</span>
                  )}
                  {phase.requiredHeadcount != null && (
                    <span>Headcount: {phase.requiredHeadcount}</span>
                  )}
                  {phase.budget != null && (
                    <span data-testid={`phase-budget-${phase.id}`}>
                      Budget: {formatCurrency(phase.budget)}
                    </span>
                  )}
                </div>

                {phase.roleRequirements && phase.roleRequirements.length > 0 && (
                  <div
                    className="flex flex-wrap gap-1"
                    data-testid={`phase-role-reqs-${phase.id}`}
                  >
                    {phase.roleRequirements.map((rr) => (
                      <Badge
                        key={rr.id}
                        variant="secondary"
                        className="text-xs"
                        data-testid={`role-req-badge-${rr.id}`}
                      >
                        {rr.count}x {rr.roleName}
                        {rr.allocationPercentage < 100
                          ? ` (${rr.allocationPercentage}%)`
                          : ""}
                      </Badge>
                    ))}
                  </div>
                )}

                {phaseAssignments.length > 0 ? (
                  <Table data-testid={`phase-assignments-table-${phase.id}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Allocation</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phaseAssignments.map((assign) => {
                        const emp = employeeMap.get(assign.employeeId);
                        return (
                          <TableRow
                            key={assign.id}
                            data-testid={`assignment-row-${assign.id}`}
                          >
                            <TableCell className="font-medium">
                              {emp?.name ?? assign.employeeId}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {emp?.roleName ?? "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{assign.allocationType}</Badge>
                            </TableCell>
                            <TableCell>
                              {assign.allocationType === "percentage"
                                ? `${assign.allocationPercentage}%`
                                : `${assign.allocatedHours}h`}
                            </TableCell>
                            <TableCell>
                              {assign.hourlyRateOverride != null ? (
                                <span className="font-medium">
                                  ${assign.hourlyRateOverride}/hr
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  ${emp?.effectiveHourlyRate ?? "-"}/hr
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{assign.startDate}</TableCell>
                            <TableCell>{assign.endDate}</TableCell>
                            <TableCell>
                              {canDelete && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(assign.id)}
                                  data-testid={`assignment-delete-${assign.id}`}
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" />
                                  Delete
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assignments for this phase.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <AssignmentFormDialog
        open={assignmentFormOpen}
        onClose={() => {
          setAssignmentFormOpen(false);
          setAssignmentPhaseId(null);
        }}
        onSubmit={handleCreateAssignment}
        projectId={project.id}
        phases={project.phases}
        employees={employees}
        defaultPhaseId={assignmentPhaseId ?? undefined}
      />

      {project && (
        <ProjectEditDialog
          key={project.id}
          open={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          onSubmit={handleUpdateProject}
          project={project}
          assignments={assignments}
          employees={employees}
        />
      )}
    </div>
  );
}
