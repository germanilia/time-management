import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, ClipboardList, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as assignmentService from "@/services/assignment-service";
import * as projectService from "@/services/project-service";
import * as employeeService from "@/services/employee-service";
import type { Assignment } from "@/types/assignment";
import type { ProjectWithPhases, Phase } from "@/types/project";
import { ProjectStatus } from "@/types/project";
import type { Employee } from "@/types/employee";
import { useRole } from "@/hooks/useRole";

const PROJECT_STATUS_OPTIONS = [
  { value: ProjectStatus.PLANNING, label: "Planning" },
  { value: ProjectStatus.ACTIVE, label: "Active" },
  { value: ProjectStatus.COMPLETED, label: "Completed" },
  { value: ProjectStatus.WAITING_ASSIGNMENT, label: "Waiting Assignment" },
];

const ALLOCATION_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage" },
  { value: "hours", label: "Hours" },
];

interface EmployeeGroup {
  employeeId: string;
  employee: Employee | undefined;
  assignments: Assignment[];
  totalPercentage: number;
  totalHours: number;
}

export function AssignmentsPage() {
  const { canDelete } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<ProjectWithPhases[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterPhaseId, setFilterPhaseId] = useState("");
  const [filterAllocationType, setFilterAllocationType] = useState("");
  const [filterProjectStatus, setFilterProjectStatus] = useState("");

  const loadReferenceData = useCallback(async () => {
    try {
      const [projs, emps] = await Promise.all([
        projectService.listProjects(),
        employeeService.listEmployees(),
      ]);
      setProjects(projs);
      setEmployees(emps);
    } catch {
      // Reference data failure is non-critical
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const data = await assignmentService.listAssignments({
        projectId: filterProjectId || undefined,
        employeeId: filterEmployeeId || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        phaseId: filterPhaseId || undefined,
        allocationType: filterAllocationType || undefined,
        projectStatus: filterProjectStatus || undefined,
      });
      setAssignments(data);
      setError(null);
    } catch {
      setError("Failed to load assignments");
    }
  }, [filterProjectId, filterEmployeeId, filterStartDate, filterEndDate, filterPhaseId, filterAllocationType, filterProjectStatus]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const phaseMap = useMemo(() => {
    const map = new Map<string, Phase>();
    for (const proj of projects) {
      for (const phase of proj.phases) {
        map.set(phase.id, phase);
      }
    }
    return map;
  }, [projects]);

  const phaseOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (const proj of projects) {
      for (const phase of proj.phases) {
        options.push({ value: phase.id, label: `${proj.name} — ${phase.name}` });
      }
    }
    return options;
  }, [projects]);

  const employeeGroups = useMemo((): EmployeeGroup[] => {
    const groupMap = new Map<string, Assignment[]>();
    for (const assign of assignments) {
      const existing = groupMap.get(assign.employeeId) ?? [];
      existing.push(assign);
      groupMap.set(assign.employeeId, existing);
    }

    return Array.from(groupMap.entries()).map(([employeeId, empAssignments]) => {
      const employee = employeeMap.get(employeeId);
      let totalPercentage = 0;
      let totalHours = 0;
      for (const a of empAssignments) {
        if (a.allocationType === "percentage") {
          totalPercentage += a.allocationPercentage ?? 0;
        } else {
          totalHours += a.allocatedHours ?? 0;
        }
      }
      return { employeeId, employee, assignments: empAssignments, totalPercentage, totalHours };
    });
  }, [assignments, employeeMap]);

  const toggleExpand = (employeeId: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await assignmentService.deleteAssignment(id);
      await loadAssignments();
    } catch {
      setError("Failed to delete assignment");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <ClipboardList className="size-5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold" data-testid="assignments-title">
          Assignments
        </h1>
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="assignments-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="w-48 space-y-1">
          <Label>Project</Label>
          <SearchableSelect
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            value={filterProjectId}
            onChange={setFilterProjectId}
            placeholder="All Projects"
            data-testid="assignments-filter-project"
          />
        </div>
        <div className="w-48 space-y-1">
          <Label>Employee</Label>
          <SearchableSelect
            options={employees.map((e) => ({ value: e.id, label: e.name }))}
            value={filterEmployeeId}
            onChange={setFilterEmployeeId}
            placeholder="All Employees"
            data-testid="assignments-filter-employee"
          />
        </div>
        <div className="w-56 space-y-1">
          <Label>Phase</Label>
          <SearchableSelect
            options={phaseOptions}
            value={filterPhaseId}
            onChange={setFilterPhaseId}
            placeholder="All Phases"
            data-testid="assignments-filter-phase"
          />
        </div>
        <div className="w-44 space-y-1">
          <Label>Project Status</Label>
          <SearchableSelect
            options={PROJECT_STATUS_OPTIONS}
            value={filterProjectStatus}
            onChange={setFilterProjectStatus}
            placeholder="All Statuses"
            data-testid="assignments-filter-project-status"
          />
        </div>
        <div className="w-40 space-y-1">
          <Label>Allocation Type</Label>
          <SearchableSelect
            options={ALLOCATION_TYPE_OPTIONS}
            value={filterAllocationType}
            onChange={setFilterAllocationType}
            placeholder="All Types"
            data-testid="assignments-filter-allocation-type"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-start">Start Date</Label>
          <Input
            id="filter-start"
            type="date"
            value={filterStartDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterStartDate(e.target.value)}
            className="w-40"
            data-testid="assignments-filter-start-date"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-end">End Date</Label>
          <Input
            id="filter-end"
            type="date"
            value={filterEndDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterEndDate(e.target.value)}
            className="w-40"
            data-testid="assignments-filter-end-date"
          />
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="animate-fade-in flex flex-col items-center gap-3 rounded-xl border bg-card py-16 text-muted-foreground shadow-sm">
          <ClipboardList className="size-12 opacity-30" aria-hidden="true" />
          <p className="text-lg font-medium">No assignments found</p>
          <p className="text-sm">Adjust your filters or create assignments from a project.</p>
        </div>
      ) : (
        <div className="animate-slide-up rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">All Assignments</h2>
            <p className="text-sm text-muted-foreground">
              {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} across{" "}
              {employeeGroups.length} employee{employeeGroups.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Table data-testid="assignments-table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Total Allocation</TableHead>
                <TableHead className="font-semibold">Target Utilization</TableHead>
                <TableHead className="font-semibold">Assignments</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeGroups.map((group) => {
                const isExpanded = expandedEmployees.has(group.employeeId);
                const empName = group.employee?.name ?? group.employeeId;
                const targetUtil = group.employee?.targetUtilizationPercentage ?? 100;

                return (
                  <>
                    <TableRow
                      key={group.employeeId}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggleExpand(group.employeeId)}
                      data-testid={`employee-group-${group.employeeId}`}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{empName}</TableCell>
                      <TableCell className="tabular-nums">
                        {group.totalPercentage > 0 && (
                          <span className={group.totalPercentage > targetUtil ? "text-destructive font-semibold" : ""}>
                            {group.totalPercentage}%
                          </span>
                        )}
                        {group.totalPercentage > 0 && group.totalHours > 0 && " + "}
                        {group.totalHours > 0 && <span>{group.totalHours}h</span>}
                      </TableCell>
                      <TableCell className="tabular-nums">{targetUtil}%</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{group.assignments.length}</Badge>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {isExpanded &&
                      group.assignments.map((assign) => (
                        <TableRow
                          key={assign.id}
                          className="bg-muted/10 hover:bg-muted/20 transition-colors"
                          data-testid={`assignment-row-${assign.id}`}
                        >
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <span className="text-primary font-medium">
                              {projectMap.get(assign.projectId)?.name ?? assign.projectId}
                            </span>
                            <span className="mx-2 text-muted-foreground">/</span>
                            <Badge variant="secondary" className="text-xs">
                              {phaseMap.get(assign.phaseId)?.name ?? assign.phaseId}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums font-medium">
                            {assign.allocationType === "percentage"
                              ? `${assign.allocationPercentage}%`
                              : `${assign.allocatedHours}h`}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {assign.startDate} — {assign.endDate}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {assign.allocationType}
                            </Badge>
                          </TableCell>
                          {canDelete && (
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleDelete(assign.id);
                                }}
                                data-testid={`assignment-delete-${assign.id}`}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                                Delete
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
