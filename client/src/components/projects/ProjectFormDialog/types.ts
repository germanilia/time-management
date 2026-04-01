export interface RoleRequirementFormState {
  roleId: string;
  allocationPercentage: string;
  count: string;
  employeeId: string;
  hourlyRateOverride: string;
}

export interface PhaseFormState {
  name: string;
  startDate: string;
  endDate: string;
  allocationType: string;
  requiredHours: string;
  requiredHeadcount: string;
  budget: string;
  status: string;
  roleRequirements: RoleRequirementFormState[];
}

export const WizardStep = {
  PROJECT_INFO: 0,
  PHASES: 1,
  REVIEW: 2,
} as const;

export type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];

export const WIZARD_STEP_LABELS = ["Project Info", "Phases", "Review"] as const;
