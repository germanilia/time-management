export const BillingType = {
  FIXED_PRICE: "fixed_price",
  TIME_AND_MATERIALS: "time_and_materials",
} as const;

export type BillingType = (typeof BillingType)[keyof typeof BillingType];

export const ProjectStatus = {
  PLANNING: "planning",
  ACTIVE: "active",
  COMPLETED: "completed",
  WAITING_ASSIGNMENT: "waiting_assignment",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PhaseStatus = {
  PLANNING: "planning",
  ACTIVE: "active",
  COMPLETED: "completed",
  WAITING_ASSIGNMENT: "waiting_assignment",
} as const;

export type PhaseStatus = (typeof PhaseStatus)[keyof typeof PhaseStatus];

export const PhaseAllocationType = {
  HOURS: "hours",
  HEADCOUNT: "headcount",
  HOURS_AND_HEADCOUNT: "hours_and_headcount",
} as const;

export type PhaseAllocationType =
  (typeof PhaseAllocationType)[keyof typeof PhaseAllocationType];

export interface RoleRequirement {
  id: string;
  projectId: string;
  phaseId: string | null;
  roleId: string;
  roleName: string;
  allocationPercentage: number;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRequirementCreate {
  roleId: string;
  allocationPercentage: number;
  count: number;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  allocationType: PhaseAllocationType;
  requiredHours: number | null;
  requiredHeadcount: number | null;
  budget: number | null;
  phaseOrder: number;
  status: PhaseStatus;
  roleRequirements: RoleRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface PhaseAssignmentInput {
  employeeId: string;
  allocationType: "percentage" | "hours";
  allocatedHours?: number;
  allocationPercentage?: number;
  hourlyRateOverride?: number;
  startDate?: string;
  endDate?: string;
}

export interface PhaseCreate {
  name: string;
  startDate: string;
  endDate?: string;
  allocationType: PhaseAllocationType;
  requiredHours?: number;
  requiredHeadcount?: number;
  budget?: number;
  phaseOrder: number;
  status?: PhaseStatus;
  roleRequirements?: RoleRequirementCreate[];
  newAssignments?: PhaseAssignmentInput[];
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  description: string | null;
  salesforceLink: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  billingType: BillingType;
  fixedPriceAmount: number | null;
  fundingSourceId: string | null;
  fundingSourceName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithPhases extends Project {
  phases: Phase[];
}

export interface ProjectCreate {
  name: string;
  customer: string;
  description?: string;
  salesforceLink?: string;
  startDate: string;
  endDate?: string;
  billingType?: BillingType;
  fixedPriceAmount?: number;
  fundingSourceId?: string;
  phases: PhaseCreate[];
}

export interface ProjectUpdate {
  name?: string;
  customer?: string;
  description?: string;
  salesforceLink?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  billingType?: BillingType;
  fixedPriceAmount?: number;
  fundingSourceId?: string;
  phases?: PhaseCreate[];
}
