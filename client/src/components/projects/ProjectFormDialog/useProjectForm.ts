import { useState, useCallback } from "react";
import { BillingType, PhaseAllocationType, ProjectStatus } from "@/types/project";
import type { ProjectCreate, ProjectWithPhases, PhaseCreate, RoleRequirementCreate, PhaseAssignmentInput } from "@/types/project";
import type { Assignment } from "@/types/assignment";
import type { Employee } from "@/types/employee";
import type { PhaseFormState, RoleRequirementFormState } from "./types";
import { WizardStep } from "./types";

export interface PendingAssignment {
  phaseIndex: number;
  employeeId: string;
  allocationType: "percentage";
  allocationPercentage: number;
  hourlyRateOverride?: number;
}

function emptyRoleRequirement(): RoleRequirementFormState {
  return {
    roleId: "",
    allocationPercentage: "100",
    count: "1",
    employeeId: "",
    hourlyRateOverride: "",
  };
}

function emptyPhase(startDate?: string, endDate?: string): PhaseFormState {
  return {
    name: "",
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    allocationType: PhaseAllocationType.HEADCOUNT,
    requiredHours: "",
    requiredHeadcount: "",
    budget: "",
    status: "planning",
    roleRequirements: [],
  };
}

function projectToPhaseFormStates(
  project: ProjectWithPhases,
  assignments: Assignment[],
  employees: Employee[],
): PhaseFormState[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  return project.phases.map((p) => {
    const phaseAssignments = assignments.filter((a) => a.phaseId === p.id);
    // Track which assignments have been matched to avoid reusing one
    const usedAssignmentIds = new Set<string>();

    return {
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate ?? "",
      allocationType: p.allocationType,
      requiredHours: p.requiredHours?.toString() ?? "",
      requiredHeadcount: p.requiredHeadcount?.toString() ?? "",
      budget: p.budget?.toString() ?? "",
      status: p.status ?? "planning",
      roleRequirements: p.roleRequirements.map((rr) => {
        // Find an assignment for this role requirement by matching employee role
        const matchedAssignment = phaseAssignments.find((a) => {
          if (usedAssignmentIds.has(a.id)) return false;
          const emp = employeeById.get(a.employeeId);
          return emp?.roleId === rr.roleId;
        });
        if (matchedAssignment) {
          usedAssignmentIds.add(matchedAssignment.id);
        }

        return {
          roleId: rr.roleId,
          allocationPercentage: rr.allocationPercentage.toString(),
          count: rr.count.toString(),
          employeeId: matchedAssignment?.employeeId ?? "",
          hourlyRateOverride: matchedAssignment?.hourlyRateOverride?.toString() ?? "",
        };
      }),
    };
  });
}

export function useProjectForm(
  onSubmit: (data: ProjectCreate, pendingAssignments: PendingAssignment[]) => Promise<void>,
  initialProject?: ProjectWithPhases,
  existingAssignments: Assignment[] = [],
  existingEmployees: Employee[] = [],
) {
  const [step, setStep] = useState<WizardStep>(WizardStep.PROJECT_INFO);
  const [name, setName] = useState(initialProject?.name ?? "");
  const [customer, setCustomer] = useState(initialProject?.customer ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [salesforceLink, setSalesforceLink] = useState(initialProject?.salesforceLink ?? "");
  const [startDate, setStartDate] = useState(initialProject?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialProject?.endDate ?? "");
  const [status, setStatus] = useState<string>(
    initialProject?.status ?? ProjectStatus.PLANNING,
  );
  const [billingType, setBillingType] = useState<BillingType>(
    (initialProject?.billingType as BillingType) ?? BillingType.TIME_AND_MATERIALS,
  );
  const [fixedPriceAmount, setFixedPriceAmount] = useState(
    initialProject?.fixedPriceAmount?.toString() ?? "",
  );
  const [fundingSourceId, setFundingSourceId] = useState(
    initialProject?.fundingSourceId ?? "",
  );
  const [phases, setPhases] = useState<PhaseFormState[]>(
    initialProject
      ? projectToPhaseFormStates(initialProject, existingAssignments, existingEmployees)
      : [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep(WizardStep.PROJECT_INFO);
    setName("");
    setCustomer("");
    setDescription("");
    setSalesforceLink("");
    setStartDate("");
    setEndDate("");
    setStatus(ProjectStatus.PLANNING);
    setBillingType(BillingType.TIME_AND_MATERIALS);
    setFixedPriceAmount("");
    setFundingSourceId("");
    setPhases([]);
    setError(null);
    setSubmitting(false);
  }, []);

  const canGoNext = useCallback((): boolean => {
    if (step === WizardStep.PROJECT_INFO) {
      return name.trim() !== "" && customer.trim() !== "" && startDate !== "";
    }
    if (step === WizardStep.PHASES) {
      return phases.every(
        (p) => p.name.trim() !== "" && p.startDate !== "",
      );
    }
    return true;
  }, [step, name, customer, startDate, phases]);

  const goNext = useCallback(() => {
    if (step < WizardStep.REVIEW) {
      setStep((step + 1) as WizardStep);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > WizardStep.PROJECT_INFO) {
      setStep((step - 1) as WizardStep);
    }
  }, [step]);

  const handleAddPhase = useCallback(() => {
    setPhases((prev) => {
      const isFirst = prev.length === 0;
      const phaseStartDate = isFirst ? startDate : "";
      const phaseEndDate = endDate || "";
      return [...prev, emptyPhase(phaseStartDate, phaseEndDate)];
    });
  }, [startDate, endDate]);

  const handleRemovePhase = useCallback((index: number) => {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePhase = useCallback(
    (index: number, field: keyof PhaseFormState, value: string) => {
      setPhases((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    },
    [],
  );

  const handleAddRoleRequirement = useCallback((phaseIndex: number) => {
    setPhases((prev) =>
      prev.map((p, i) =>
        i === phaseIndex
          ? { ...p, roleRequirements: [...p.roleRequirements, emptyRoleRequirement()] }
          : p,
      ),
    );
  }, []);

  const handleRemoveRoleRequirement = useCallback(
    (phaseIndex: number, rrIndex: number) => {
      setPhases((prev) =>
        prev.map((p, i) =>
          i === phaseIndex
            ? { ...p, roleRequirements: p.roleRequirements.filter((_, j) => j !== rrIndex) }
            : p,
        ),
      );
    },
    [],
  );

  const updateRoleRequirement = useCallback(
    (
      phaseIndex: number,
      rrIndex: number,
      field: keyof RoleRequirementFormState,
      value: string,
    ) => {
      setPhases((prev) =>
        prev.map((p, i) =>
          i === phaseIndex
            ? {
                ...p,
                roleRequirements: p.roleRequirements.map((rr, j) =>
                  j === rrIndex ? { ...rr, [field]: value } : rr,
                ),
              }
            : p,
        ),
      );
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const validPhases = phases.filter(
        (p) => p.name.trim() !== "" && p.startDate !== "",
      );

      const phaseData: PhaseCreate[] = validPhases.map((p, i) => {
        const roleRequirements: RoleRequirementCreate[] = p.roleRequirements
          .filter((rr) => rr.roleId && rr.count)
          .map((rr) => ({
            roleId: rr.roleId,
            allocationPercentage: parseInt(rr.allocationPercentage, 10) || 100,
            count: parseInt(rr.count, 10) || 1,
          }));

        // Embed employee assignments directly in phase data
        const newAssignments: PhaseAssignmentInput[] = p.roleRequirements
          .filter((rr) => rr.employeeId)
          .map((rr) => ({
            employeeId: rr.employeeId,
            allocationType: "percentage" as const,
            allocationPercentage: parseInt(rr.allocationPercentage, 10) || 100,
            hourlyRateOverride: rr.hourlyRateOverride
              ? parseFloat(rr.hourlyRateOverride)
              : undefined,
          }));

        return {
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate || undefined,
          allocationType: p.allocationType as PhaseCreate["allocationType"],
          requiredHours: p.requiredHours ? parseInt(p.requiredHours, 10) : undefined,
          requiredHeadcount: p.requiredHeadcount
            ? parseInt(p.requiredHeadcount, 10)
            : undefined,
          budget: p.budget ? parseFloat(p.budget) : undefined,
          phaseOrder: i,
          status: p.status as PhaseCreate["status"],
          roleRequirements,
          newAssignments,
        };
      });

      await onSubmit(
        {
          name,
          customer,
          description: description || undefined,
          salesforceLink: salesforceLink || undefined,
          startDate,
          endDate: endDate || undefined,
          billingType,
          fixedPriceAmount: fixedPriceAmount ? parseFloat(fixedPriceAmount) : undefined,
          fundingSourceId: fundingSourceId || undefined,
          phases: phaseData,
        },
        [],
      );
      resetForm();
    } catch {
      setError("Failed to save project");
    } finally {
      setSubmitting(false);
    }
  }, [phases, name, customer, description, salesforceLink, startDate, endDate, billingType, fixedPriceAmount, fundingSourceId, onSubmit, resetForm]);

  return {
    step,
    name,
    setName,
    customer,
    setCustomer,
    description,
    setDescription,
    salesforceLink,
    setSalesforceLink,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    status,
    setStatus,
    billingType,
    setBillingType,
    fixedPriceAmount,
    setFixedPriceAmount,
    fundingSourceId,
    setFundingSourceId,
    phases,
    submitting,
    error,
    canGoNext,
    goNext,
    goBack,
    resetForm,
    handleAddPhase,
    handleRemovePhase,
    updatePhase,
    handleAddRoleRequirement,
    handleRemoveRoleRequirement,
    updateRoleRequirement,
    handleSubmit,
  };
}
