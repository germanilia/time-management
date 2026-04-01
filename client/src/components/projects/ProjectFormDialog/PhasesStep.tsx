import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PhaseAllocationType, PhaseStatus } from "@/types/project";
import type { Role, Employee } from "@/types/employee";
import type { PhaseFormState, RoleRequirementFormState } from "./types";

interface PhasesStepProps {
  phases: PhaseFormState[];
  roles: Role[];
  employees: Employee[];
  onAddPhase: () => void;
  onRemovePhase: (index: number) => void;
  onUpdatePhase: (index: number, field: keyof PhaseFormState, value: string) => void;
  onAddRoleRequirement: (phaseIndex: number) => void;
  onRemoveRoleRequirement: (phaseIndex: number, rrIndex: number) => void;
  onUpdateRoleRequirement: (
    phaseIndex: number,
    rrIndex: number,
    field: keyof RoleRequirementFormState,
    value: string,
  ) => void;
}

/**
 * Step 2 of the project creation wizard — add and configure phases
 * with allocation settings, budgets, and role requirements.
 */
export function PhasesStep({
  phases,
  roles,
  employees,
  onAddPhase,
  onRemovePhase,
  onUpdatePhase,
  onAddRoleRequirement,
  onRemoveRoleRequirement,
  onUpdateRoleRequirement,
}: PhasesStepProps) {
  return (
    <div className="space-y-3" data-testid="wizard-step-phases">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the phases for this project. The first phase starts on the project start
          date and the last phase ends on the project end date.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddPhase}
          data-testid="project-add-phase-button"
        >
          Add Phase
        </Button>
      </div>

      {phases.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No phases yet. Click &ldquo;Add Phase&rdquo; to get started.
        </p>
      )}

      {phases.map((phase, index) => (
        <PhaseCard
          key={index}
          phase={phase}
          index={index}
          roles={roles}
          employees={employees}
          onRemove={() => onRemovePhase(index)}
          onUpdate={(field, value) => onUpdatePhase(index, field, value)}
          onAddRoleReq={() => onAddRoleRequirement(index)}
          onRemoveRoleReq={(rrIndex) => onRemoveRoleRequirement(index, rrIndex)}
          onUpdateRoleReq={(rrIndex, field, value) =>
            onUpdateRoleRequirement(index, rrIndex, field, value)
          }
        />
      ))}
    </div>
  );
}

interface PhaseCardProps {
  phase: PhaseFormState;
  index: number;
  roles: Role[];
  employees: Employee[];
  onRemove: () => void;
  onUpdate: (field: keyof PhaseFormState, value: string) => void;
  onAddRoleReq: () => void;
  onRemoveRoleReq: (rrIndex: number) => void;
  onUpdateRoleReq: (
    rrIndex: number,
    field: keyof RoleRequirementFormState,
    value: string,
  ) => void;
}

function PhaseCard({
  phase,
  index,
  roles,
  employees,
  onRemove,
  onUpdate,
  onAddRoleReq,
  onRemoveRoleReq,
  onUpdateRoleReq,
}: PhaseCardProps) {
  const allocationTypeOptions = [
    { value: PhaseAllocationType.HEADCOUNT, label: "Headcount" },
    { value: PhaseAllocationType.HOURS, label: "Hours" },
    { value: PhaseAllocationType.HOURS_AND_HEADCOUNT, label: "Hours & Headcount" },
  ];

  const phaseStatusOptions = [
    { value: PhaseStatus.PLANNING, label: "Planning" },
    { value: PhaseStatus.ACTIVE, label: "Active" },
    { value: PhaseStatus.COMPLETED, label: "Completed" },
    { value: PhaseStatus.WAITING_ASSIGNMENT, label: "Waiting Assignment" },
  ];

  return (
    <div
      className="space-y-3 rounded-lg border p-3"
      data-testid={`phase-${index}-section`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Phase {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          data-testid={`phase-${index}-remove-button`}
        >
          Remove
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`phase-${index}-name`}>Name</Label>
        <Input
          id={`phase-${index}-name`}
          value={phase.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          required
          data-testid={`phase-${index}-name-input`}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`phase-${index}-start`}>Start Date</Label>
          <Input
            id={`phase-${index}-start`}
            type="date"
            value={phase.startDate}
            onChange={(e) => onUpdate("startDate", e.target.value)}
            required
            data-testid={`phase-${index}-start-date-input`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`phase-${index}-end`}>End Date</Label>
          <div className="flex items-center gap-1">
            <Input
              id={`phase-${index}-end`}
              type="date"
              value={phase.endDate}
              onChange={(e) => onUpdate("endDate", e.target.value)}
              data-testid={`phase-${index}-end-date-input`}
            />
            {phase.endDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdate("endDate", "");
                }}
                aria-label="Clear end date"
                data-testid={`phase-${index}-end-date-clear-button`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Allocation Type</Label>
        <SearchableSelect
          options={allocationTypeOptions}
          value={phase.allocationType}
          onChange={(v) => onUpdate("allocationType", v)}
          data-testid={`phase-${index}-allocation-type-select`}
        />
      </div>
      {(phase.allocationType === PhaseAllocationType.HOURS ||
        phase.allocationType === PhaseAllocationType.HOURS_AND_HEADCOUNT) && (
        <div className="space-y-2">
          <Label htmlFor={`phase-${index}-hours`}>Required Hours</Label>
          <Input
            id={`phase-${index}-hours`}
            type="number"
            min="1"
            value={phase.requiredHours}
            onChange={(e) => onUpdate("requiredHours", e.target.value)}
            data-testid={`phase-${index}-hours-input`}
          />
        </div>
      )}
      {(phase.allocationType === PhaseAllocationType.HEADCOUNT ||
        phase.allocationType === PhaseAllocationType.HOURS_AND_HEADCOUNT) && (
        <div className="space-y-2">
          <Label htmlFor={`phase-${index}-headcount`}>Required Headcount</Label>
          <Input
            id={`phase-${index}-headcount`}
            type="number"
            min="1"
            value={phase.requiredHeadcount}
            onChange={(e) => onUpdate("requiredHeadcount", e.target.value)}
            data-testid={`phase-${index}-headcount-input`}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`phase-${index}-budget`}>Budget</Label>
          <Input
            id={`phase-${index}-budget`}
            type="number"
            min="0"
            step="0.01"
            value={phase.budget}
            onChange={(e) => onUpdate("budget", e.target.value)}
            placeholder="Optional"
            data-testid={`phase-${index}-budget-input`}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <SearchableSelect
            options={phaseStatusOptions}
            value={phase.status || "planning"}
            onChange={(v) => onUpdate("status", v)}
            data-testid={`phase-${index}-status-select`}
          />
        </div>
      </div>

      <RoleRequirementsSection
        phaseIndex={index}
        roles={roles}
        employees={employees}
        roleRequirements={phase.roleRequirements}
        onAdd={onAddRoleReq}
        onRemove={onRemoveRoleReq}
        onUpdate={onUpdateRoleReq}
      />
    </div>
  );
}

interface RoleRequirementsSectionProps {
  phaseIndex: number;
  roles: Role[];
  employees: Employee[];
  roleRequirements: RoleRequirementFormState[];
  onAdd: () => void;
  onRemove: (rrIndex: number) => void;
  onUpdate: (rrIndex: number, field: keyof RoleRequirementFormState, value: string) => void;
}

function RoleRequirementsSection({
  phaseIndex,
  roles,
  employees,
  roleRequirements,
  onAdd,
  onRemove,
  onUpdate,
}: RoleRequirementsSectionProps) {
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  const handleEmployeeChange = (rrIndex: number, employeeId: string) => {
    onUpdate(rrIndex, "employeeId", employeeId);
    // Pre-fill rate with employee's effective rate
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      onUpdate(rrIndex, "hourlyRateOverride", emp.effectiveHourlyRate.toString());
    } else {
      onUpdate(rrIndex, "hourlyRateOverride", "");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Role Requirements</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          data-testid={`phase-${phaseIndex}-add-role-req-button`}
        >
          Add Role
        </Button>
      </div>
      {roleRequirements.map((rr, rrIndex) => {
        const filteredEmployees = rr.roleId
          ? employees.filter((e) => e.roleId === rr.roleId)
          : employees;
        const employeeOptions = filteredEmployees.map((e) => ({
          value: e.id,
          label: e.name,
        }));

        return (
          <div
            key={rrIndex}
            className="space-y-2 rounded border bg-muted/30 p-2"
            data-testid={`phase-${phaseIndex}-role-req-${rrIndex}`}
          >
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label>Role</Label>
                <SearchableSelect
                  options={roleOptions}
                  value={rr.roleId}
                  onChange={(v) => onUpdate(rrIndex, "roleId", v)}
                  placeholder="Select a role"
                  data-testid={`phase-${phaseIndex}-rr-${rrIndex}-role-select`}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label htmlFor={`phase-${phaseIndex}-rr-${rrIndex}-count`}>Count</Label>
                <Input
                  id={`phase-${phaseIndex}-rr-${rrIndex}-count`}
                  type="number"
                  min="1"
                  value={rr.count}
                  onChange={(e) => onUpdate(rrIndex, "count", e.target.value)}
                  data-testid={`phase-${phaseIndex}-rr-${rrIndex}-count-input`}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label htmlFor={`phase-${phaseIndex}-rr-${rrIndex}-alloc`}>Alloc %</Label>
                <Input
                  id={`phase-${phaseIndex}-rr-${rrIndex}-alloc`}
                  type="number"
                  min="1"
                  max="100"
                  value={rr.allocationPercentage}
                  onChange={(e) => onUpdate(rrIndex, "allocationPercentage", e.target.value)}
                  data-testid={`phase-${phaseIndex}-rr-${rrIndex}-alloc-input`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(rrIndex)}
                data-testid={`phase-${phaseIndex}-rr-${rrIndex}-remove-button`}
              >
                Remove
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label>Assign Employee</Label>
                <SearchableSelect
                  options={employeeOptions}
                  value={rr.employeeId}
                  onChange={(v) => handleEmployeeChange(rrIndex, v)}
                  placeholder="None (assign later)"
                  data-testid={`phase-${phaseIndex}-rr-${rrIndex}-employee-select`}
                />
              </div>
              <div className="w-36 space-y-1">
                <Label htmlFor={`phase-${phaseIndex}-rr-${rrIndex}-rate`}>
                  Hourly Rate
                </Label>
                <Input
                  id={`phase-${phaseIndex}-rr-${rrIndex}-rate`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={rr.hourlyRateOverride}
                  onChange={(e) => onUpdate(rrIndex, "hourlyRateOverride", e.target.value)}
                  placeholder="Default"
                  data-testid={`phase-${phaseIndex}-rr-${rrIndex}-rate-input`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
