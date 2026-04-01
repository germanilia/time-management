import { Pencil, Trash2, Users } from "lucide-react";
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
import { useRole } from "@/hooks/useRole";
import type { Employee } from "@/types/employee";

interface EmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

/**
 * Renders a visual employee table with status badges, tabular numbers,
 * and action buttons wrapped in a card container.
 */
export function EmployeeList({ employees, onEdit, onDelete }: EmployeeListProps) {
  const { canManageEmployees } = useRole();

  if (employees.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-3 rounded-xl border bg-card py-16 text-muted-foreground shadow-sm" data-testid="employee-list-empty">
        <Users className="size-12 opacity-30" aria-hidden="true" />
        <p className="text-lg font-medium">No employees found</p>
        <p className="text-sm">Try adjusting your search or add a new employee.</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up rounded-xl border bg-card shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Team Members</h2>
        <p className="text-sm text-muted-foreground">
          {employees.length} employee{employees.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Table data-testid="employee-list-table">
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Rate</TableHead>
            <TableHead className="font-semibold">Availability</TableHead>
            <TableHead className="font-semibold">Target</TableHead>
            <TableHead className="font-semibold">Department</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            {canManageEmployees && <TableHead className="text-right font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id} data-testid={`employee-row-${emp.id}`} className="hover:bg-muted/40 transition-colors">
              <TableCell className="font-medium">{emp.name}</TableCell>
              <TableCell className="text-muted-foreground">{emp.email}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">{emp.roleName}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">${Number(emp.effectiveHourlyRate).toFixed(2)}/hr</TableCell>
              <TableCell className="tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  {emp.jobPercentage}%
                </span>
              </TableCell>
              <TableCell className="tabular-nums">{emp.targetUtilizationPercentage}%</TableCell>
              <TableCell>
                {emp.department ? (
                  <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={emp.status === "active" ? "default" : "secondary"}
                  data-testid={`employee-status-${emp.id}`}
                >
                  {emp.status}
                </Badge>
              </TableCell>
              {canManageEmployees && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(emp)}
                      data-testid={`employee-edit-button-${emp.id}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(emp.id)}
                      data-testid={`employee-delete-button-${emp.id}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
