import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, DollarSign, Users, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as assignmentService from "@/services/assignment-service";
import * as employeeService from "@/services/employee-service";
import type { Phase } from "@/types/project";
import type { Assignment } from "@/types/assignment";
import type { Employee } from "@/types/employee";

interface PhaseDetailPanelProps {
  phase: Phase;
  projectId: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Premium dialog showing detailed information about a phase including
 * role requirements, budget, and assignments with sticky header/footer.
 */
export function PhaseDetailPanel({
  phase,
  projectId,
  projectName,
  open,
  onClose,
}: PhaseDetailPanelProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const load = useCallback(async () => {
    try {
      const [assigns, emps] = await Promise.all([
        assignmentService.listAssignments({ projectId }),
        employeeService.listEmployees(),
      ]);
      setAssignments(assigns.filter((a) => a.phaseId === phase.id));
      setEmployees(emps);
    } catch {
      // Non-critical — panel still shows phase info
    }
  }, [projectId, phase.id]);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle data-testid="phase-detail-title">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="size-4 text-primary" aria-hidden="true" />
              </div>
              {phase.name}
            </div>
          </DialogTitle>
          <DialogDescription data-testid="phase-detail-project">
            Project: {projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-4">
          {/* Info cards grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 p-3">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Start</p>
                <p className="text-sm font-semibold tabular-nums">{phase.startDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 p-3">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">End</p>
                <p className="text-sm font-semibold tabular-nums">{phase.endDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 p-3">
              <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Allocation</p>
                <Badge variant="outline" className="mt-0.5 text-xs">{phase.allocationType}</Badge>
              </div>
            </div>
            {phase.budget != null && (
              <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 p-3">
                <DollarSign className="size-4 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Budget</p>
                  <p className="text-sm font-semibold tabular-nums">{phase.budget.toLocaleString("en-US")}</p>
                </div>
              </div>
            )}
            {phase.requiredHours != null && (
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 p-3">
                <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Hours</p>
                  <p className="text-sm font-semibold tabular-nums">{phase.requiredHours}</p>
                </div>
              </div>
            )}
            {phase.requiredHeadcount != null && (
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 p-3">
                <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Headcount</p>
                  <p className="text-sm font-semibold tabular-nums">{phase.requiredHeadcount}</p>
                </div>
              </div>
            )}
          </div>

          {/* Role requirements */}
          {phase.roleRequirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Role Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {phase.roleRequirements.map((rr) => (
                  <Badge
                    key={rr.id}
                    variant="secondary"
                    className="text-xs"
                    data-testid={`phase-detail-role-req-${rr.id}`}
                  >
                    {rr.count}× {rr.roleName}
                    {rr.allocationPercentage < 100
                      ? ` (${rr.allocationPercentage}%)`
                      : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Assignments */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Assignments
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium tabular-nums">
                {assignments.length}
              </span>
            </h3>
            {assignments.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                <Users className="size-4 opacity-50" aria-hidden="true" />
                No assignments for this phase.
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table data-testid="phase-detail-assignments-table">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Employee</TableHead>
                      <TableHead className="text-xs font-semibold">Allocation</TableHead>
                      <TableHead className="text-xs font-semibold">Dates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assign) => (
                      <TableRow key={assign.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium">
                          {employeeMap.get(assign.employeeId)?.name ??
                            assign.employeeId}
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {assign.allocationType === "percentage"
                            ? `${assign.allocationPercentage}%`
                            : `${assign.allocatedHours}h`}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs text-muted-foreground">
                          {assign.startDate} — {assign.endDate}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="phase-detail-close-button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
