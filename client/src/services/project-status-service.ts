import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type {
  ProjectStatusConfig,
  ProjectStatusConfigCreate,
  ProjectStatusConfigUpdate,
} from "@/types/project-status";

export async function listProjectStatuses(): Promise<ProjectStatusConfig[]> {
  const response = await api.get<ApiResponse<ProjectStatusConfig[]>>(
    "/project-statuses",
  );
  return response.data.data;
}

export async function getProjectStatus(
  id: string,
): Promise<ProjectStatusConfig> {
  const response = await api.get<ApiResponse<ProjectStatusConfig>>(
    `/project-statuses/${id}`,
  );
  return response.data.data;
}

export async function createProjectStatus(
  data: ProjectStatusConfigCreate,
): Promise<ProjectStatusConfig> {
  const response = await api.post<ApiResponse<ProjectStatusConfig>>(
    "/project-statuses",
    data,
  );
  return response.data.data;
}

export async function updateProjectStatus(
  id: string,
  data: ProjectStatusConfigUpdate,
): Promise<ProjectStatusConfig> {
  const response = await api.put<ApiResponse<ProjectStatusConfig>>(
    `/project-statuses/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteProjectStatus(id: string): Promise<void> {
  await api.delete(`/project-statuses/${id}`);
}
