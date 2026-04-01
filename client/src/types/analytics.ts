export interface DailyUtilization {
  date: string;
  utilization: number;
  idleCount: number;
  overAllocatedCount: number;
}

export interface UtilizationSummary {
  startDate: string;
  endDate: string;
  averageUtilization: number;
  overAllocatedCount: number;
  underUtilizedCount: number;
  idleCount: number;
  totalEmployees: number;
  dailyBreakdown: DailyUtilization[];
}

export interface CapacityPeriod {
  period: string;
  totalCapacityHours: number;
  allocatedHours: number;
  availableHours: number;
  requiredHeadcount: number;
  availableHeadcount: number;
  gap: number;
}

export interface CapacityForecast {
  periods: CapacityPeriod[];
}

export interface EmployeeUtilizationRecord {
  employeeId: string;
  employeeName: string;
  department: string | null;
  averageUtilization: number;
  targetUtilization: number;
  targetGap: number;
  assignmentsCount: number;
}

export interface PhaseBudgetInsight {
  phaseId: string;
  phaseName: string;
  budget: number | null;
  cost: number;
  profit: number | null;
  marginPercentage: number | null;
}

export interface ProjectBudgetInsight {
  projectId: string;
  projectName: string;
  totalBudget: number;
  totalCost: number;
  totalProfit: number;
  marginPercentage: number;
  phases: PhaseBudgetInsight[];
}

export interface ProjectFinancialInsight {
  projectId: string;
  projectName: string;
  billingType: string;
  fundingSourceName: string | null;
  income: number;
  totalCost: number;
  profit: number;
  marginPercentage: number | null;
  remaining: number | null;
  totalHours: number;
  totalBudget: number;
  phases: PhaseBudgetInsight[];
}

export interface FinancialSummaryResponse {
  totalIncome: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number | null;
  projectCount: number;
  projects: ProjectFinancialInsight[];
}

// Weekly allocations

export interface ProjectAllocationEntry {
  projectId: string;
  projectName: string;
  allocatedDays: number;
}

export interface EmployeeWeekAllocation {
  allocations: ProjectAllocationEntry[];
  totalDays: number;
  maxDays: number;
}

export interface ProjectSummaryEntry {
  projectId: string;
  projectName: string;
}

export interface EmployeeWeeklyRow {
  employeeId: string;
  employeeName: string;
  maxDaysPerWeek: number;
  weeks: Record<string, EmployeeWeekAllocation>;
}

export interface WeeklyAllocationsResponse {
  employees: EmployeeWeeklyRow[];
  projects: ProjectSummaryEntry[];
  weekStarts: string[];
}

// Utilization projection

export interface UtilizationProjectionPoint {
  weekStart: string;
  capacityHours: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPercentage: number;
}

export interface UtilizationProjectionResponse {
  points: UtilizationProjectionPoint[];
  currentWeekIndex: number;
}
