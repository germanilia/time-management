import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee, EmployeeCreate, Role } from "@/types/employee";

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeCreate) => Promise<void>;
  employee?: Employee | null;
  roles: Role[];
}

/**
 * Dialog form for creating or editing an employee.
 * Accepts a list of dynamic roles for the role selection dropdown.
 */
export function EmployeeForm({ open, onClose, onSubmit, employee, roles }: EmployeeFormProps) {
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [roleId, setRoleId] = useState(employee?.roleId ?? "");
  const [hourlyRate, setHourlyRate] = useState(
    employee?.hourlyRate?.toString() ?? "",
  );
  const [jobPercentage, setJobPercentage] = useState(
    employee?.jobPercentage?.toString() ?? "100",
  );
  const [targetUtilization, setTargetUtilization] = useState(
    employee?.targetUtilizationPercentage?.toString() ?? "100",
  );
  const [department, setDepartment] = useState(employee?.department ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(employee?.name ?? "");
    setEmail(employee?.email ?? "");
    setRoleId(employee?.roleId ?? "");
    setHourlyRate(employee?.hourlyRate?.toString() ?? "");
    setJobPercentage(employee?.jobPercentage?.toString() ?? "100");
    setTargetUtilization(employee?.targetUtilizationPercentage?.toString() ?? "100");
    setDepartment(employee?.department ?? "");
    setError(null);
  }, [employee]);

  const selectedRole = roles.find((r) => r.id === roleId);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        email,
        roleId,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        jobPercentage: parseInt(jobPercentage, 10),
        targetUtilizationPercentage: parseInt(targetUtilization, 10),
        department: department || undefined,
      });
      onClose();
    } catch {
      setError("Failed to save employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="employee-form-title">
            {employee ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
          <DialogDescription>
            {employee ? "Update employee details below." : "Fill in the details to add a new team member."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4" data-testid="employee-form">
          {error && (
            <p className="text-sm text-destructive" data-testid="employee-form-error">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="emp-name">Name</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="employee-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="employee-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <SearchableSelect
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              value={roleId}
              onChange={setRoleId}
              placeholder="Select a role"
              required
              data-testid="employee-role-select"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-rate">Hourly Rate Override</Label>
            <Input
              id="emp-rate"
              type="number"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder={
                selectedRole
                  ? `Default: $${selectedRole.defaultHourlyRate}/hr`
                  : "Select a role first"
              }
              data-testid="employee-rate-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emp-job-pct">Job % (FTE)</Label>
              <Input
                id="emp-job-pct"
                type="number"
                min="0"
                max="100"
                value={jobPercentage}
                onChange={(e) => setJobPercentage(e.target.value)}
                required
                placeholder="100 = full-time"
                data-testid="employee-job-percentage-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-target">Target Utilization %</Label>
              <Input
                id="emp-target"
                type="number"
                min="0"
                max="100"
                value={targetUtilization}
                onChange={(e) => setTargetUtilization(e.target.value)}
                required
                data-testid="employee-target-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-dept">Department</Label>
            <Input
              id="emp-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              data-testid="employee-department-input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="employee-form-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="employee-form-save-button"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
