export const EmployeeStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ON_LEAVE: "on_leave",
} as const;

export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

export interface Role {
  id: string;
  name: string;
  defaultHourlyRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleCreate {
  name: string;
  defaultHourlyRate: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  hourlyRate: number | null;
  effectiveHourlyRate: number;
  jobPercentage: number;
  targetUtilizationPercentage: number;
  status: EmployeeStatus;
  department: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCreate {
  name: string;
  email: string;
  roleId: string;
  hourlyRate?: number;
  jobPercentage: number;
  targetUtilizationPercentage: number;
  department?: string;
}

export interface EmployeeUpdate {
  name?: string;
  email?: string;
  roleId?: string;
  hourlyRate?: number | null;
  jobPercentage?: number;
  targetUtilizationPercentage?: number;
  status?: EmployeeStatus;
  department?: string | null;
}
