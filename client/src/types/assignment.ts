export const AssignmentAllocationType = {
  HOURS: "hours",
  PERCENTAGE: "percentage",
} as const;

export type AssignmentAllocationType =
  (typeof AssignmentAllocationType)[keyof typeof AssignmentAllocationType];

export interface Assignment {
  id: string;
  projectId: string;
  phaseId: string;
  employeeId: string;
  allocationType: AssignmentAllocationType;
  allocatedHours: number | null;
  allocationPercentage: number | null;
  hourlyRateOverride: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentWithDetails extends Assignment {
  employeeName: string;
  projectName: string;
  phaseName: string;
}

export interface AssignmentCreate {
  projectId: string;
  phaseId: string;
  employeeId: string;
  allocationType: AssignmentAllocationType;
  allocatedHours?: number;
  allocationPercentage?: number;
  hourlyRateOverride?: number;
  startDate: string;
  endDate: string;
}
