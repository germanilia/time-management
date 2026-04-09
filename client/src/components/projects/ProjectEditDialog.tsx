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
import type { Assignment } from "@/types/assignment";
import type { Role, Employee } from "@/types/employee";
import * as roleService from "@/services/role-service";
import * as employeeService from "@/services/employee-service";
import { useProjectForm } from "./ProjectFormDialog/useProjectForm";
import type { PendingAssignment } from "./ProjectFormDialog/useProjectForm";
import { ProjectInfoStep } from "./ProjectFormDialog/ProjectInfoStep";
import { PhasesStep } from "./ProjectFormDialog/PhasesStep";

type EditTab = "info" | "phases";

const TABS: { key: EditTab; label: string }[] = [
  { key: "info", label: "Project Info" },
  { key: "phases", label: "Phases" },
];

interface ProjectEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectCreate, pendingAssignments: PendingAssignment[], status?: string) => Promise<void>;
  project: ProjectWithPhases;
  assignments?: Assignment[];
  employees?: Employee[];
}

/**
 * Tab-based dialog for editing an existing project.
 * Unlike the wizard used for creation, all tabs are accessible at any time.
 */
export function ProjectEditDialog({ open, onClose, onSubmit, project, assignments = [], employees: initialEmployees = [] }: ProjectEditDialogProps) {
  const [activeTab, setActiveTab] = useState<EditTab>("info");
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
      setActiveTab("info");
    }
  }, [open, loadReferenceData]);

  const form = useProjectForm(
    async (data, pendingAssignments) => {
      await onSubmit(data, pendingAssignments, form.status);
      onClose();
    },
    project,
    assignments,
    initialEmployees,
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
          <DialogTitle data-testid="project-edit-title">Edit Project</DialogTitle>
          <div
            className="flex gap-1"
          role="tablist"
          data-testid="project-edit-tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={`project-edit-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {form.error && (
          <p className="text-sm text-destructive" data-testid="project-edit-error">
            {form.error}
          </p>
        )}

        {activeTab === "info" && (
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
            status={form.status}
            onStatusChange={form.setStatus}
            billingType={form.billingType}
            onBillingTypeChange={form.setBillingType}
            fixedPriceAmount={form.fixedPriceAmount}
            onFixedPriceAmountChange={form.setFixedPriceAmount}
            fundingSourceId={form.fundingSourceId}
            onFundingSourceIdChange={form.setFundingSourceId}
          />
        )}

        {activeTab === "phases" && (
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

        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            data-testid="project-edit-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={form.submitting}
            onClick={form.handleSubmit}
            data-testid="project-edit-save-button"
          >
            {form.submitting ? "Saving..." : "Save Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
