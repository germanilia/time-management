import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type {
  CapacityForecast,
  EmployeeUtilizationRecord,
  FinancialSummaryResponse,
  ProjectBudgetInsight,
  ProjectFinancialInsight,
  UtilizationProjectionResponse,
  UtilizationSummary,
  WeeklyAllocationsResponse,
} from "@/types/analytics";

export async function getUtilization(
  startDate: string,
  endDate: string,
): Promise<UtilizationSummary> {
  const response = await api.get<ApiResponse<UtilizationSummary>>(
    `/analytics/utilization?startDate=${startDate}&endDate=${endDate}`,
  );
  return response.data.data;
}

export async function getEmployeeUtilization(
  startDate: string,
  endDate: string,
): Promise<EmployeeUtilizationRecord[]> {
  const response = await api.get<ApiResponse<EmployeeUtilizationRecord[]>>(
    `/analytics/utilization/employees?startDate=${startDate}&endDate=${endDate}`,
  );
  return response.data.data;
}

export async function getCapacityForecast(
  startDate: string,
  endDate: string,
  granularity: string = "monthly",
): Promise<CapacityForecast> {
  const response = await api.get<ApiResponse<CapacityForecast>>(
    `/analytics/capacity?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`,
  );
  return response.data.data;
}

export async function getWeeklyAllocations(
  startDate: string,
  endDate: string,
): Promise<WeeklyAllocationsResponse> {
  const response = await api.get<ApiResponse<WeeklyAllocationsResponse>>(
    `/analytics/weekly-allocations?startDate=${startDate}&endDate=${endDate}`,
  );
  return response.data.data;
}

export async function getUtilizationProjection(
  startDate: string,
  endDate: string,
  employeeIds?: string[],
): Promise<UtilizationProjectionResponse> {
  const params = new URLSearchParams();
  params.set("startDate", startDate);
  params.set("endDate", endDate);
  if (employeeIds && employeeIds.length > 0) {
    for (const id of employeeIds) {
      params.append("employeeIds", id);
    }
  }
  const response = await api.get<ApiResponse<UtilizationProjectionResponse>>(
    `/analytics/utilization-projection?${params.toString()}`,
  );
  return response.data.data;
}

export async function getBudgetInsights(
  projectId: string,
): Promise<ProjectBudgetInsight> {
  const response = await api.get<ApiResponse<ProjectBudgetInsight>>(
    `/analytics/budget/${projectId}`,
  );
  return response.data.data;
}

export async function getFinancialInsights(
  projectId: string,
): Promise<ProjectFinancialInsight> {
  const response = await api.get<ApiResponse<ProjectFinancialInsight>>(
    `/analytics/financial/${projectId}`,
  );
  return response.data.data;
}

export async function getFinancialSummary(
  fundingSourceId?: string,
): Promise<FinancialSummaryResponse> {
  const params = fundingSourceId
    ? `?fundingSourceId=${fundingSourceId}`
    : "";
  const response = await api.get<ApiResponse<FinancialSummaryResponse>>(
    `/analytics/financial-summary${params}`,
  );
  return response.data.data;
}
