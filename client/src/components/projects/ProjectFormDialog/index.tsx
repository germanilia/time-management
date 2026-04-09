import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectCreate, ProjectWithPhases } from "@/types/project";
import type { Role, Employee } from "@/types/employee";
import * as roleService from "@/services/role-service";
import * as employeeService from "@/services/employee-service";
import { WizardStep, WIZARD_STEP_LABELS } from "./types";
import { useProjectForm } from "./useProjectForm";
import type { PendingAssignment } from "./useProjectForm";
import { ProjectInfoStep } from "./ProjectInfoStep";
import { PhasesStep } from "./PhasesStep";
import { ReviewStep } from "./ReviewStep";

interface ProjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectCreate, pendingAssignments: PendingAssignment[]) => Promise<void>;
  project?: ProjectWithPhases | null;
}

/**
 * Multi-step wizard dialog for creating a new project.
 * Step 1: Project info (name, description, dates)
 * Step 2: Phases (with allocation, budget, role requirements)
 * Step 3: Review and submit
 */
export function ProjectFormDialog({ open, onClose, onSubmit, project }: ProjectFormDialogProps) {
  const isEditMode = !!project;
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [rolesData, empsData] = await Promise.all([
        roleService.listRoles(),
        employeeService.listEmployees(),
      ]);
      setRoles(rolesData);
      setEmployees(empsData);
    } catch {
      // Reference data may fail — form still renders with empty dropdowns
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadReferenceData();
    }
  }, [open, loadReferenceData]);

  const form = useProjectForm(
    async (data, pendingAssignments) => {
      await onSubmit(data, pendingAssignments);
      onClose();
    },
    project ?? undefined,
  );

  const handleClose = () => {
    form.resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle data-testid="project-form-title">
            {isEditMode ? "Edit Project" : "Add Project"}
          </DialogTitle>
          <StepIndicator currentStep={form.step} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">

        {form.error && (
          <p className="text-sm text-destructive" data-testid="project-form-error">
            {form.error}
          </p>
        )}

        {form.step === WizardStep.PROJECT_INFO && (
          <ProjectInfoStep
            name={form.name}
            onNameChange={form.setName}
            customer={form.customer}
            onCustomerChange={form.setCustomer}
            description={form.description}
            onDescriptionChange={form.setDescription}
            salesforceLink={form.salesforceLink}
            onSalesforceLinkChange={form.setSalesforceLink}
            startDate={form.startDate}
            onStartDateChange={form.setStartDate}
            endDate={form.endDate}
            onEndDateChange={form.setEndDate}
            billingType={form.billingType}
            onBillingTypeChange={form.setBillingType}
            fixedPriceAmount={form.fixedPriceAmount}
            onFixedPriceAmountChange={form.setFixedPriceAmount}
            fundingSourceId={form.fundingSourceId}
            onFundingSourceIdChange={form.setFundingSourceId}
          />
        )}

        {form.step === WizardStep.PHASES && (
          <PhasesStep
            phases={form.phases}
            roles={roles}
            employees={employees}
            onAddPhase={form.handleAddPhase}
            onRemovePhase={form.handleRemovePhase}
            onUpdatePhase={form.updatePhase}
            onAddRoleRequirement={form.handleAddRoleRequirement}
            onRemoveRoleRequirement={form.handleRemoveRoleRequirement}
            onUpdateRoleRequirement={form.updateRoleRequirement}
          />
        )}

        {form.step === WizardStep.REVIEW && (
          <ReviewStep
            name={form.name}
            customer={form.customer}
            description={form.description}
            salesforceLink={form.salesforceLink}
            startDate={form.startDate}
            endDate={form.endDate}
            phases={form.phases}
            roles={roles}
          />
        )}

        </div>

        <DialogFooter>
          <WizardNavigation
            step={form.step}
            canGoNext={form.canGoNext()}
            submitting={form.submitting}
            onBack={form.goBack}
            onNext={form.goNext}
            onSubmit={form.handleSubmit}
            onCancel={handleClose}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StepIndicatorProps {
  currentStep: WizardStep;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2" data-testid="wizard-step-indicator">
      {WIZARD_STEP_LABELS.map((label, index) => (
        <div key={label} className="flex items-center gap-2">
          {index > 0 && <div className="h-px w-6 bg-border" />}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : index < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
              data-testid={`wizard-step-${index}-indicator`}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                "text-xs",
                index === currentStep ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface WizardNavigationProps {
  step: WizardStep;
  canGoNext: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function WizardNavigation({
  step,
  canGoNext,
  submitting,
  onBack,
  onNext,
  onSubmit,
  onCancel,
}: WizardNavigationProps) {
  const isFirstStep = step === WizardStep.PROJECT_INFO;
  const isLastStep = step === WizardStep.REVIEW;

  return (
    <div className="flex w-full justify-between">
      <div>
        {isFirstStep ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="project-form-cancel-button"
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            data-testid="wizard-back-button"
          >
            Back
          </Button>
        )}
      </div>
      <div>
        {isLastStep ? (
          <Button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            data-testid="project-form-save-button"
          >
            {submitting ? "Saving..." : "Save Project"}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!canGoNext}
            onClick={onNext}
            data-testid="wizard-next-button"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
