import { useEffect, useMemo, useState } from "react";
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
import type { Phase } from "@/types/project";
import type { Employee } from "@/types/employee";
import type { AssignmentCreate } from "@/types/assignment";
import { AssignmentAllocationType } from "@/types/assignment";

interface AssignmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentCreate) => Promise<void>;
  projectId: string;
  phases: Phase[];
  employees: Employee[];
  defaultPhaseId?: string;
}

/**
 * Dialog for creating an assignment — assigns an employee to a project phase
 * with allocation, date range, and optional hourly rate override.
 */
export function AssignmentFormDialog({
  open,
  onClose,
  onSubmit,
  projectId,
  phases,
  employees,
  defaultPhaseId,
}: AssignmentFormDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [phaseId, setPhaseId] = useState(defaultPhaseId ?? "");
  const [allocationType, setAllocationType] = useState<string>(
    AssignmentAllocationType.PERCENTAGE,
  );
  const [percentage, setPercentage] = useState("");
  const [hours, setHours] = useState("");
  const [hourlyRateOverride, setHourlyRateOverride] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId],
  );

  const selectedPhase = useMemo(
    () => phases.find((p) => p.id === phaseId),
    [phases, phaseId],
  );

  useEffect(() => {
    if (defaultPhaseId) {
      setPhaseId(defaultPhaseId);
    }
  }, [defaultPhaseId]);

  // Auto-fill dates from selected phase when no dates are set yet
  useEffect(() => {
    if (selectedPhase && !startDate && !endDate) {
      setStartDate(selectedPhase.startDate);
      setEndDate(selectedPhase.endDate ?? "");
    }
  }, [selectedPhase, startDate, endDate]);

  const handleEmployeeChange = (value: string) => {
    setEmployeeId(value);
    // Pre-fill rate with employee's effective rate
    const emp = employees.find((e) => e.id === value);
    if (emp) {
      setHourlyRateOverride(emp.effectiveHourlyRate.toString());
    } else {
      setHourlyRateOverride("");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data: AssignmentCreate = {
        projectId,
        phaseId,
        employeeId,
        allocationType: allocationType as AssignmentCreate["allocationType"],
        startDate,
        endDate,
      };
      if (allocationType === AssignmentAllocationType.PERCENTAGE) {
        data.allocationPercentage = parseInt(percentage, 10);
      } else {
        data.allocatedHours = parseInt(hours, 10);
      }
      if (hourlyRateOverride) {
        data.hourlyRateOverride = parseFloat(hourlyRateOverride);
      }
      await onSubmit(data);
      resetForm();
      onClose();
    } catch {
      setError("Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setPhaseId("");
    setAllocationType(AssignmentAllocationType.PERCENTAGE);
    setPercentage("");
    setHours("");
    setHourlyRateOverride("");
    setStartDate("");
    setEndDate("");
    setError(null);
  };

  const phaseOptions = phases.map((p) => ({ value: p.id, label: p.name }));
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const allocationTypeOptions = [
    { value: AssignmentAllocationType.PERCENTAGE, label: "Percentage" },
    { value: AssignmentAllocationType.HOURS, label: "Hours" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="assignment-form-title">Add Assignment</DialogTitle>
          <DialogDescription>Assign an employee to a project phase.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4" data-testid="assignment-form">
          {error && (
            <p className="text-sm text-destructive" data-testid="assignment-form-error">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label>Phase</Label>
            <SearchableSelect
              options={phaseOptions}
              value={phaseId}
              onChange={setPhaseId}
              placeholder="Select phase..."
              required
              data-testid="assignment-phase-select"
            />
          </div>
          <div className="space-y-2">
            <Label>Employee</Label>
            <SearchableSelect
              options={employeeOptions}
              value={employeeId}
              onChange={handleEmployeeChange}
              placeholder="Select employee..."
              required
              data-testid="assignment-employee-select"
            />
            {selectedEmployee && (
              <p className="text-xs text-muted-foreground">
                {selectedEmployee.roleName} — ${selectedEmployee.effectiveHourlyRate}/hr
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Allocation Type</Label>
            <SearchableSelect
              options={allocationTypeOptions}
              value={allocationType}
              onChange={setAllocationType}
              data-testid="assignment-allocation-type-select"
            />
          </div>
          {allocationType === AssignmentAllocationType.PERCENTAGE ? (
            <div className="space-y-2">
              <Label htmlFor="assign-pct">Allocation %</Label>
              <Input
                id="assign-pct"
                type="number"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                required
                data-testid="assignment-percentage-input"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="assign-hours">Allocated Hours</Label>
              <Input
                id="assign-hours"
                type="number"
                min="1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                data-testid="assignment-hours-input"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="assign-rate">Hourly Rate</Label>
            <Input
              id="assign-rate"
              type="number"
              step="0.01"
              min="0"
              value={hourlyRateOverride}
              onChange={(e) => setHourlyRateOverride(e.target.value)}
              placeholder="Select an employee to pre-fill"
              data-testid="assignment-rate-override-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assign-start">Start Date</Label>
              <Input
                id="assign-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                data-testid="assignment-start-date-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-end">End Date</Label>
              <Input
                id="assign-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                data-testid="assignment-end-date-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
              data-testid="assignment-form-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="assignment-form-save-button"
            >
              {submitting ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
