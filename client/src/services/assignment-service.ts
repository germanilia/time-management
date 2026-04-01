import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { Assignment, AssignmentCreate } from "@/types/assignment";

export async function listAssignments(params?: {
  projectId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  phaseId?: string;
  allocationType?: string;
  projectStatus?: string;
}): Promise<Assignment[]> {
  const searchParams = new URLSearchParams();
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.phaseId) searchParams.set("phaseId", params.phaseId);
  if (params?.allocationType) searchParams.set("allocationType", params.allocationType);
  if (params?.projectStatus) searchParams.set("projectStatus", params.projectStatus);
  const query = searchParams.toString();
  const response = await api.get<ApiResponse<Assignment[]>>(
    `/assignments${query ? `?${query}` : ""}`,
  );
  return response.data.data;
}

export async function createAssignment(data: AssignmentCreate): Promise<Assignment> {
  const response = await api.post<ApiResponse<Assignment>>("/assignments", data);
  return response.data.data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/assignments/${id}`);
}
